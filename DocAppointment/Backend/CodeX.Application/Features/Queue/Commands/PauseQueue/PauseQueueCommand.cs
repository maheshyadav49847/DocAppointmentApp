using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.PauseQueue
{
    public record PauseQueueCommand(Guid QueueId, int DurationMinutes, string? Reason) : IRequest<bool>;

    public class PauseQueueCommandHandler : IRequestHandler<PauseQueueCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsappService;
        private readonly ITelegramService _telegramService;

        public PauseQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _telegramService = telegramService;
        }

        public async Task<bool> Handle(PauseQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Doctor)
                .FirstOrDefaultAsync(q => q.Id == request.QueueId, cancellationToken);

            if (queue == null || queue.Status == QueueStatus.Completed || queue.Status == QueueStatus.Cancelled)
                return false;

            queue.Status = QueueStatus.Paused;
            queue.PausedUntil = DateTime.UtcNow.AddMinutes(request.DurationMinutes);
            queue.PauseReason = request.Reason;

            await _context.SaveChangesAsync(cancellationToken);
            
            try {
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
            } catch { }

            // Notify all pending patients
            try
            {
                var pendingTokens = await _context.Tokens
                    .Include(t => t.Patient)
                    .Where(t => t.QueueId == queue.Id && t.Status == TokenStatus.Pending && !t.IsDeleted)
                    .ToListAsync(cancellationToken);

                if (pendingTokens.Any())
                {
                    var allPhones = pendingTokens
                        .Where(t => !string.IsNullOrWhiteSpace(t.Patient?.Phone))
                        .SelectMany(t => CodeX.Application.Common.Helpers.NormalizationHelper.GetPhoneVariations(t.Patient!.Phone))
                        .Distinct()
                        .ToList();

                    var sessions = await _context.ChatSessions
                        .Where(s => allPhones.Contains(s.PhoneNumber) && s.BranchId == queue.BranchId)
                        .ToListAsync(cancellationToken);

                    string reasonStr = !string.IsNullOrWhiteSpace(request.Reason) ? $"\n📌 {request.Reason}" : "";

                    foreach (var token in pendingTokens)
                    {
                        if (string.IsNullOrWhiteSpace(token.Patient?.Phone)) continue;
                        
                        var pVars = CodeX.Application.Common.Helpers.NormalizationHelper.GetPhoneVariations(token.Patient.Phone);
                        var session = sessions.FirstOrDefault(s => pVars.Contains(s.PhoneNumber));
                        var lang = session?.Language ?? "1";

                        string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(
                            lang, 
                            "QUEUE_PAUSED_ALERT", 
                            queue.Doctor?.Name ?? "Doctor", 
                            request.DurationMinutes.ToString(), 
                            reasonStr);

                        if (!string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(token.Patient.TelegramChatId, translatedMsg, queue.BranchId);
                        }
                        else
                        {
                            await _whatsappService.SendTextMessage(token.Patient.Phone, translatedMsg, queue.BranchId);
                        }
                    }
                }
            }
            catch { }

            return true;
        }
    }
}
