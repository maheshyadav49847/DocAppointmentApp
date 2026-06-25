using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CodeX.Api.BackgroundServices
{
    public class FollowUpReminderService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<FollowUpReminderService> _logger;
        private static readonly TimeSpan RunInterval = TimeSpan.FromHours(1); // Still run every hour, but gate by LastReminderSentDate

        public FollowUpReminderService(IServiceScopeFactory scopeFactory, ILogger<FollowUpReminderService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FollowUpReminderService background task started.");
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessFollowUpRemindersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing automated follow-up reminders.");
                }

                await Task.Delay(RunInterval, stoppingToken);
            }
        }

        private async Task ProcessFollowUpRemindersAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();
            
            var today = DateTime.UtcNow.Date;

            // Fetch pending follow ups (Not stopped, and not already reminded today)
            var activeFollowUps = await context.FollowUps
                .Include(f => f.Patient)
                .ThenInclude(p => p.Tokens)
                .ThenInclude(t => t.Queue)
                .Where(f => f.ReminderEnabled && 
                            f.FollowUpDate >= today && 
                            (f.LastReminderSentDate == null || f.LastReminderSentDate.Value.Date != today))
                .ToListAsync(stoppingToken);

            if (!activeFollowUps.Any()) return;

            foreach (var fup in activeFollowUps)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // Determine X days before (from settings or default 3)
                int daysBefore = 3;
                var branchId = fup.Patient.Tokens
                    .OrderByDescending(t => t.Queue.QueueDate)
                    .Select(t => t.Queue.BranchId)
                    .FirstOrDefault();

                if (branchId != Guid.Empty)
                {
                    var tzBranch = await context.Branches.Include(b => b.Organization).FirstOrDefaultAsync(b => b.Id == branchId, stoppingToken);
                    if (tzBranch?.Organization?.SettingsJson != null)
                    {
                        try
                        {
                            var settings = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(tzBranch.Organization.SettingsJson);
                            if (settings.TryGetProperty("FollowUpReminderDaysBefore", out var daysProp) && daysProp.TryGetInt32(out var days))
                            {
                                daysBefore = days;
                            }
                        }
                        catch { }
                    }
                }

                // Check if we are within the reminder window
                if (today < fup.FollowUpDate.AddDays(-daysBefore).Date)
                {
                    continue; // Too early
                }

                // Check if patient visited recently (on or after the reminder window started, or within the last 7 days)
                var thresholdDate = fup.CreatedAt.Date;
                var hasVisited = await context.PatientVisits
                    .AnyAsync(pv => pv.Token.PatientId == fup.PatientId && pv.CreatedAt >= thresholdDate, stoppingToken);

                if (hasVisited)
                {
                    // Auto-stop reminder
                    fup.ReminderEnabled = false;
                    _logger.LogInformation("FollowUpReminderService: Patient {PatientId} has visited. Stopping reminder.", fup.PatientId);
                    continue;
                }

                if (branchId == Guid.Empty)
                {
                    var fallbackBranch = await context.Branches.FirstOrDefaultAsync(stoppingToken);
                    if (fallbackBranch != null) branchId = fallbackBranch.Id;
                    else continue;
                }

                var bookerPhone = fup.Patient.Phone;
                if (string.IsNullOrWhiteSpace(bookerPhone)) continue;

                var dateStr = fup.FollowUpDate.ToString("dd MMM yyyy");
                var instructionsMsg = string.IsNullOrWhiteSpace(fup.Instructions) ? "" : $"\n👉 Doctor's Advice: {fup.Instructions}\n";
                
                var message = 
                    $"🏥 *FOLLOW-UP REMINDER* 🏥\n" +
                    $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                    $"Namaste 🙏,\n\n" +
                    $"Aapke patient *{fup.Patient.Name}* ka follow-up check-up *{dateStr}* ko scheduled hai.\n" +
                    instructionsMsg +
                    $"\nKripya clinic aakar doctor se consult karein aur swasth rahein.\n\n" +
                    $"✨ _DocAppointmentApp Queue System_";

                try
                {
                    _logger.LogInformation("Sending automated follow-up reminder to {Phone} for {Date}", bookerPhone, dateStr);
                    await whatsAppService.SendTextMessage(bookerPhone, message, branchId);
                    
                    fup.LastReminderSentDate = DateTime.UtcNow;
                    fup.WhatsAppSent = true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send automated follow-up WhatsApp reminder to {Phone}", bookerPhone);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }
}
