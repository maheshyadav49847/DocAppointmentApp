using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.SkipToken
{
    public record SkipTokenCommand(Guid QueueId) : IRequest<bool>;

    public class SkipTokenCommandHandler : IRequestHandler<SkipTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsappService;
        private readonly ITelegramService _telegramService;

        public SkipTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _telegramService = telegramService;
        }

        public async Task<bool> Handle(SkipTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .Include(x => x.Tokens)
                .ThenInclude(x => x.Patient)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            var currentToken = queue.Tokens
                .FirstOrDefault(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called);

            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Skipped;
                
                // Automatically find and call next pending token if any
                var nextToken = queue.Tokens
                    .Where(t => t.Status == TokenStatus.Pending)
                    .OrderBy(t => t.TokenNumber)
                    .FirstOrDefault();

                if (nextToken != null)
                {
                    nextToken.Status = TokenStatus.Called;
                    nextToken.CalledAt = DateTime.UtcNow;
                    queue.CurrentTokenNumber = nextToken.TokenNumber;
                }
                else
                {
                    queue.CurrentTokenNumber = 0;
                }

                await _context.SaveChangesAsync(cancellationToken);
                
                // Notify via WhatsApp
                if (currentToken.Patient != null && !string.IsNullOrEmpty(currentToken.Patient.Phone))
                {
                    try
                    {
                        var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == currentToken.Patient.Phone && s.BranchId == queue.BranchId, cancellationToken);
                        var languagePreference = chatSession?.Language ?? "1";

                        string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(languagePreference, "APPOINTMENT_MISSED_ALERT", currentToken.TokenNumber, queue.Doctor?.Name);

                        await _whatsappService.SendTextMessage(currentToken.Patient.Phone, translatedMsg, queue.BranchId);
                    }
                    catch { /* Log and ignore background errors */ }
                }

                // Notify all clients via SignalR
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                return true;
            }

            return false;
        }
    }
}
