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
        private static readonly TimeSpan RunInterval = TimeSpan.FromHours(1); // Runs check every hour

        public FollowUpReminderService(IServiceScopeFactory scopeFactory, ILogger<FollowUpReminderService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("FollowUpReminderService background task started.");

            // Wait a small buffer before first run
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
            
            // Check if there are any follow-ups due today or earlier that haven't been alerted
            var today = DateTime.UtcNow.Date;
            var pendingFollowUps = await context.FollowUps
                .Include(f => f.Patient)
                .ThenInclude(p => p.Tokens)
                .ThenInclude(t => t.Queue)
                .Include(f => f.PatientVisit)
                .ThenInclude(pv => pv.Token)
                .ThenInclude(t => t.Patient)
                .Where(f => f.FollowUpDate.Date <= today && !f.WhatsAppSent && f.ReminderEnabled)
                .ToListAsync(stoppingToken);

            if (!pendingFollowUps.Any())
            {
                return;
            }

            var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();
            _logger.LogInformation("FollowUpReminderService: Found {Count} pending follow-up alerts to dispatch.", pendingFollowUps.Count);

            foreach (var fup in pendingFollowUps)
            {
                if (stoppingToken.IsCancellationRequested) break;

                // Resolve BranchId to send WhatsApp message from
                var branchId = fup.Patient.Tokens
                    .OrderByDescending(t => t.Queue.QueueDate)
                    .Select(t => t.Queue.BranchId)
                    .FirstOrDefault();

                if (branchId == Guid.Empty)
                {
                    // Fallback to the first available branch in database
                    var fallbackBranch = await context.Branches.FirstOrDefaultAsync(stoppingToken);
                    if (fallbackBranch != null)
                    {
                        branchId = fallbackBranch.Id;
                    }
                    else
                    {
                        _logger.LogWarning("No branches found in database; cannot send follow-up reminder for Patient {PatientId}", fup.Patient.Id);
                        continue;
                    }
                }

                var bookerPhone = fup.Patient.Phone;
                if (fup.PatientVisit?.Token?.Patient != null && !string.IsNullOrWhiteSpace(fup.PatientVisit.Token.Patient.Phone))
                {
                    bookerPhone = fup.PatientVisit.Token.Patient.Phone;
                }

                if (string.IsNullOrWhiteSpace(bookerPhone))
                {
                    _logger.LogInformation("No phone number available for patient {PatientId}, skipping WhatsApp reminder.", fup.Patient.Id);
                    fup.WhatsAppSent = true; 
                    fup.UpdatedAt = DateTime.UtcNow;
                    continue;
                }

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
                    _logger.LogInformation("Sending automated follow-up reminder to {Phone} for {Date} (Patient: {PatientName})", bookerPhone, dateStr, fup.Patient.Name);
                    await whatsAppService.SendTextMessage(bookerPhone, message, branchId);
                    
                    fup.WhatsAppSent = true;
                    fup.UpdatedAt = DateTime.UtcNow;
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
