using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Queue.Commands.EndQueue
{
    public record EndQueueCommand(Guid QueueId) : IRequest<bool>;

    public class EndQueueCommandHandler : IRequestHandler<EndQueueCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsAppService;

        public EndQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsAppService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsAppService = whatsAppService;
        }

        public async Task<bool> Handle(EndQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            queue.Status = QueueStatus.Completed;
            queue.ActualEndAt = DateTime.UtcNow;

            // Mark any 'Called' tokens as Completed
            var tokens = await _context.Tokens.Include(t => t.Patient).Where(t => t.QueueId == queue.Id && t.Status == TokenStatus.Called).ToListAsync(cancellationToken);
            foreach (var token in tokens)
            {
                token.Status = TokenStatus.Completed;
                token.CompletedAt = DateTime.UtcNow;

                if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                {
                    try 
                    { 
                        var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == token.Patient.Phone, cancellationToken);
                        if (chatSession == null)
                        {
                            chatSession = new ChatSession { PhoneNumber = token.Patient.Phone };
                            _context.ChatSessions.Add(chatSession);
                        }
                        chatSession.CurrentState = "AWAITING_RATING_SCORE";
                        chatSession.SelectedSessionId = token.Id; // Reusing field to store TokenId for rating

                        await _whatsAppService.SendFeedbackRequest(token.Patient.Phone, queue.Doctor.Name, token.Id); 
                    }
                    catch { /* Log and ignore */ }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyQueueEnded(queue.BranchId, queue.Id);

            return true;
        }
    }
}
