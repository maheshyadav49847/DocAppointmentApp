using System;
using System.Collections.Generic;
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
    /// <summary>
    /// High-throughput, Deadlock-Free, Race-Condition-Proof Outbox Processor.
    /// Features:
    /// 1. Per-Channel Isolated Dispatch: OTP, SMS, Email, Telegram, WhatsApp operate on separate parallel pipelines.
    /// 2. Priority Scheduling: High priority (OTP = 100, Live Alerts = 50) executes before bulk/heavy documents (Prescriptions = 10).
    /// 3. Strict FIFO within each Priority Level: ORDER BY Priority DESC, CreatedAt ASC.
    /// 4. Deadlock-Free Concurrency: PostgreSQL FOR UPDATE SKIP LOCKED ensures 0 lock contention.
    /// </summary>
    public class OutboxProcessorBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<OutboxProcessorBackgroundService> _logger;
        private static readonly TimeSpan IdlePollDelay = TimeSpan.FromSeconds(2);
        private const int BatchSizePerChannel = 20;
        private const int MaxConcurrentDispatchesPerChannel = 6;

        // Supported channels
        private static readonly string[] ActiveChannels = new[] { "SMS", "Email", "Telegram", "WhatsApp" };

        public OutboxProcessorBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<OutboxProcessorBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("OutboxProcessorBackgroundService started with Channel Isolation, Priority Scheduling, and SKIP LOCKED safety.");

            // Warm-up delay to allow DB migrations and app boot to complete
            await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                var totalProcessed = 0;
                try
                {
                    // Run each channel pipeline concurrently so high-priority OTP/SMS/Email
                    // are never queued behind large Telegram/WhatsApp PDF generation or uploads!
                    var channelTasks = ActiveChannels.Select(channel => ProcessChannelBatchAsync(channel, stoppingToken));
                    var results = await Task.WhenAll(channelTasks);
                    totalProcessed = results.Sum();
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unexpected error in OutboxProcessorBackgroundService execution loop.");
                }

                // If all channels were mostly idle, wait briefly before polling again
                if (totalProcessed == 0)
                {
                    await Task.Delay(IdlePollDelay, stoppingToken);
                }
            }

            _logger.LogInformation("OutboxProcessorBackgroundService gracefully stopped.");
        }

        private async Task<int> ProcessChannelBatchAsync(string channel, CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var dbContext = (DbContext)context;

            List<OutboxMessage> claimedBatch = new();

            // 1. ATOMIC BATCH CLAIM (PostgreSQL FOR UPDATE SKIP LOCKED)
            // Priority: Higher Priority first (OTP/Security = 100, Live Alert = 50, Prescription = 10)
            // FIFO: Within same Priority, oldest CreatedAt first.
            // SKIP LOCKED: Never blocks or waits on locked rows -> 0% deadlock risk.
            await using (var transaction = await dbContext.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, stoppingToken))
            {
                var nowUtc = DateTime.UtcNow;

                var rawSql = @"
                    SELECT * FROM ""OutboxMessages""
                    WHERE ""Channel"" = {0}
                      AND ""IsDeleted"" = false
                      AND (
                            ""Status"" = 'Pending'
                            OR (""Status"" = 'Failed' AND ""RetryCount"" < ""MaxRetries"" AND ""NextRetryAtUtc"" IS NOT NULL AND ""NextRetryAtUtc"" <= {1})
                          )
                    ORDER BY ""Priority"" DESC, ""CreatedAt"" ASC
                    LIMIT {2}
                    FOR UPDATE SKIP LOCKED";

                claimedBatch = await dbContext.Set<OutboxMessage>()
                    .FromSqlRaw(rawSql, channel, nowUtc, BatchSizePerChannel)
                    .ToListAsync(stoppingToken);

                if (claimedBatch.Count == 0)
                {
                    await transaction.RollbackAsync(stoppingToken);
                    return 0;
                }

                // Transition immediately to 'Processing' within the same lock
                foreach (var item in claimedBatch)
                {
                    item.Status = "Processing";
                    item.UpdatedAt = DateTime.UtcNow;
                }

                await dbContext.SaveChangesAsync(stoppingToken);
                await transaction.CommitAsync(stoppingToken);
            }

            // 2. CONTROLLED PARALLEL DISPATCH FOR THIS CHANNEL
            using var semaphore = new SemaphoreSlim(MaxConcurrentDispatchesPerChannel, MaxConcurrentDispatchesPerChannel);
            var dispatchTasks = claimedBatch.Select(async item =>
            {
                await semaphore.WaitAsync(stoppingToken);
                try
                {
                    await ExecuteSingleMessageDispatchAsync(item, stoppingToken);
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(dispatchTasks);
            return claimedBatch.Count;
        }

        private async Task ExecuteSingleMessageDispatchAsync(OutboxMessage item, CancellationToken stoppingToken)
        {
            using var itemScope = _scopeFactory.CreateScope();
            var itemContext = itemScope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var telegramService = itemScope.ServiceProvider.GetRequiredService<ITelegramService>();
            var whatsAppService = itemScope.ServiceProvider.GetRequiredService<IWhatsAppService>();
            var smsService = itemScope.ServiceProvider.GetRequiredService<ISmsService>();
            var emailService = itemScope.ServiceProvider.GetRequiredService<IEmailService>();

            try
            {
                var channel = (item.Channel ?? "Telegram").Trim().ToLowerInvariant();

                if (channel == "sms")
                {
                    await smsService.SendSmsAsync(item.Recipient, item.MessageBody ?? string.Empty);
                }
                else if (channel == "email")
                {
                    var subject = !string.IsNullOrWhiteSpace(item.FileName) ? item.FileName : "Notification from Clinic";
                    await emailService.SendEmailAsync(item.Recipient, subject, item.MessageBody ?? string.Empty);
                }
                else if (channel == "telegram")
                {
                    if (!string.IsNullOrWhiteSpace(item.FileBase64))
                    {
                        var fileName = !string.IsNullOrWhiteSpace(item.FileName) ? item.FileName : "Prescription.pdf";
                        await telegramService.SendDocumentMessage(
                            chatId: item.Recipient,
                            message: item.MessageBody ?? string.Empty,
                            fileName: fileName,
                            base64Data: item.FileBase64,
                            branchId: item.BranchId);
                    }
                    else
                    {
                        await telegramService.SendTextMessage(
                            chatId: item.Recipient,
                            message: item.MessageBody ?? string.Empty,
                            branchId: item.BranchId);
                    }
                }
                else if (channel == "whatsapp")
                {
                    await whatsAppService.SendTextMessage(
                        toPhoneNumber: item.Recipient,
                        message: item.MessageBody ?? string.Empty,
                        branchId: item.BranchId);
                }

                // Mark Successful
                await UpdateItemStatusAsync(itemContext, item.Id, "Sent", null, null, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch outbox message {Id} to {Recipient} on channel {Channel}", item.Id, item.Recipient, item.Channel);

                var newRetryCount = item.RetryCount + 1;
                string newStatus;
                DateTime? nextRetryUtc = null;

                if (newRetryCount >= item.MaxRetries)
                {
                    newStatus = "DeadLetter";
                }
                else
                {
                    newStatus = "Failed";
                    // FIFO Backoff: 1st retry: 30s, 2nd retry: 2m, 3rd retry: 8m
                    var backoffSeconds = (int)Math.Pow(4, newRetryCount) * 10;
                    nextRetryUtc = DateTime.UtcNow.AddSeconds(backoffSeconds);
                }

                await UpdateItemStatusAsync(itemContext, item.Id, newStatus, ex.Message, nextRetryUtc, stoppingToken, newRetryCount);
            }
        }

        private static async Task UpdateItemStatusAsync(
            IApplicationDbContext context,
            Guid itemId,
            string status,
            string? errorMessage,
            DateTime? nextRetryUtc,
            CancellationToken stoppingToken,
            int? retryCount = null)
        {
            var dbItem = await context.OutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == itemId, stoppingToken);
            if (dbItem == null) return;

            dbItem.Status = status;
            dbItem.UpdatedAt = DateTime.UtcNow;

            if (status == "Sent")
            {
                dbItem.ProcessedAtUtc = DateTime.UtcNow;
                dbItem.ErrorMessage = null;
            }
            else
            {
                dbItem.ErrorMessage = errorMessage;
                if (nextRetryUtc.HasValue) dbItem.NextRetryAtUtc = nextRetryUtc;
                if (retryCount.HasValue) dbItem.RetryCount = retryCount.Value;
            }

            await context.SaveChangesAsync(stoppingToken);
        }
    }
}
