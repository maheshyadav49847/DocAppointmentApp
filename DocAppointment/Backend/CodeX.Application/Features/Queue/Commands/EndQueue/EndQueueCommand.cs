using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Queue.Commands.EndQueue
{
    [System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
    public enum EndQueueAction
    {
        CancelRemaining,
        TransferRemaining
    }

    public class EndQueueDto
    {
        public EndQueueAction Action { get; set; }
        public Guid? TargetSessionId { get; set; }
    }

    public record EndQueueCommand(Guid QueueId, EndQueueAction Action = EndQueueAction.CancelRemaining, Guid? TargetSessionId = null) : IRequest<bool>;

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
            var tokens = await _context.Tokens.Include(t => t.Patient).Where(t => t.QueueId == queue.Id && (t.Status == TokenStatus.Called || t.Status == TokenStatus.Pending || t.Status == TokenStatus.Skipped)).ToListAsync(cancellationToken);
            
            DailyQueue? targetQueue = null;
            if (request.Action == EndQueueAction.TransferRemaining && request.TargetSessionId.HasValue)
            {
                var targetSession = await _context.Sessions.Include(s => s.Doctor).FirstOrDefaultAsync(s => s.Id == request.TargetSessionId.Value, cancellationToken);
                if (targetSession != null)
                {
                    targetQueue = await _context.DailyQueues
                        .FirstOrDefaultAsync(q => q.SessionId == targetSession.Id && q.QueueDate.Date == DateTime.UtcNow.Date, cancellationToken);
                    
                    if (targetQueue == null)
                    {
                        // Initialize it
                        targetQueue = new DailyQueue
                        {
                            Id = Guid.NewGuid(),
                            SessionId = targetSession.Id,
                            DoctorId = targetSession.DoctorId,
                            BranchId = queue.BranchId,
                            QueueDate = DateTime.UtcNow.Date,
                            Status = QueueStatus.Open,
                            CurrentTokenNumber = 0
                        };
                        _context.DailyQueues.Add(targetQueue);
                    }
                }
            }

            int nextTokenNumber = targetQueue != null ? (await _context.Tokens.Where(t => t.QueueId == targetQueue.Id).MaxAsync(t => (int?)t.TokenNumber, cancellationToken) ?? 0) + 1 : 1;

            foreach (var token in tokens)
            {
                if (token.Status == TokenStatus.Called)
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

                            await _whatsAppService.SendFeedbackRequest(token.Patient.Phone, queue.Doctor.Name, token.Id, queue.BranchId); 
                        }
                        catch { /* Log and ignore */ }
                    }
                }
                else if (token.Status == TokenStatus.Pending || token.Status == TokenStatus.Skipped)
                {
                    if (request.Action == EndQueueAction.TransferRemaining && targetQueue != null)
                    {
                        token.QueueId = targetQueue.Id;
                        token.Status = TokenStatus.Pending;
                        token.TokenNumber = nextTokenNumber++;
                        
                        // Need to fetch target session name if available, for WhatsApp message
                        var sessionName = _context.Sessions.Where(s => s.Id == targetQueue.SessionId).Select(s => s.StartTime.ToString(@"hh\:mm") + " - " + s.EndTime.ToString(@"hh\:mm")).FirstOrDefault() ?? "Next Session";
                        
                        if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                        {
                            try { await _whatsAppService.SendSessionTransferredAlert(token.Patient.Phone, queue.Doctor.Name, sessionName, token.TokenNumber, queue.BranchId); } catch { }
                        }
                    }
                    else
                    {
                        token.Status = TokenStatus.Cancelled;
                        if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                        {
                            try { await _whatsAppService.SendSessionCancelledAlert(token.Patient.Phone, queue.Doctor.Name, queue.BranchId); } catch { }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyQueueEnded(queue.BranchId, queue.Id);

            return true;
        }
    }
}
