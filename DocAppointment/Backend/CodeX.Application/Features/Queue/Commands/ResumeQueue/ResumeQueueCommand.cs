using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.ResumeQueue
{
    public record ResumeQueueCommand(Guid QueueId) : IRequest<bool>;

    public class ResumeQueueCommandHandler : IRequestHandler<ResumeQueueCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;

        public ResumeQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(ResumeQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .FirstOrDefaultAsync(q => q.Id == request.QueueId, cancellationToken);

            if (queue == null || queue.Status != QueueStatus.Paused)
                return false;

            queue.Status = QueueStatus.Active;
            queue.PausedUntil = null;
            queue.PauseReason = null;

            await _context.SaveChangesAsync(cancellationToken);
            
            try {
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
            } catch { }

            return true;
        }
    }
}
