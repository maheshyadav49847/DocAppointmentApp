using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Queue.Commands.CancelQueue
{
    public record CancelQueueCommand(Guid QueueId) : IRequest<bool>;

    public class CancelQueueCommandHandler : IRequestHandler<CancelQueueCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsAppService;
        private readonly ITelegramService _telegramService;

        public CancelQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsAppService, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsAppService = whatsAppService;
            _telegramService = telegramService;
        }

        public async Task<bool> Handle(CancelQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .Include(x => x.Branch)
                .ThenInclude(b => b.Organization)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            queue.Status = QueueStatus.Cancelled;
            queue.ActualEndAt = DateTime.UtcNow;

            // Fetch all Pending or Called tokens to cancel them and alert patients
            var tokens = await _context.Tokens
                .Include(t => t.Patient)
                .Where(t => t.QueueId == queue.Id && (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called))
                .ToListAsync(cancellationToken);

            string hospitalName = queue.Branch?.Organization?.Name ?? queue.Branch?.Name ?? "Humare Hospital";
            string doctorName = queue.Doctor?.Name ?? "Doctor";

            foreach (var token in tokens)
            {
                token.Status = TokenStatus.Cancelled;
                token.CompletedAt = DateTime.UtcNow;

                if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                {
                    try
                    {
                        var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == token.Patient.Phone && s.BranchId == queue.BranchId, cancellationToken);
                        var languagePreference = chatSession?.Language ?? "1";

                        string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(languagePreference, "APPOINTMENT_CANCELLED_ALERT", hospitalName.ToUpper(), token.Patient.Name, doctorName, token.TokenNumber);

                        if (!string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(token.Patient.TelegramChatId, translatedMsg, queue.BranchId);
                        }
                        else
                        {
                            await _whatsAppService.SendTextMessage(token.Patient.Phone, translatedMsg, queue.BranchId);
                        }
                    }
                    catch { /* Log and continue gracefully */ }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyQueueEnded(queue.BranchId, queue.Id);

            return true;
        }
    }
}
