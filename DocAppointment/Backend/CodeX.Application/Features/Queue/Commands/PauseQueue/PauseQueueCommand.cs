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

        public PauseQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(PauseQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
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

            return true;
        }
    }
}
