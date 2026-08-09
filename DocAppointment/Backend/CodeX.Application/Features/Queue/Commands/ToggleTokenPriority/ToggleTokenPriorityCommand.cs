using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Queue.Commands.ToggleTokenPriority
{
    public record ToggleTokenPriorityCommand(Guid TokenId) : IRequest<bool>;

    public class ToggleTokenPriorityCommandHandler : IRequestHandler<ToggleTokenPriorityCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;

        public ToggleTokenPriorityCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(ToggleTokenPriorityCommand request, CancellationToken cancellationToken)
        {
            var token = await _context.Tokens
                .FirstOrDefaultAsync(t => t.Id == request.TokenId, cancellationToken);

            if (token == null) return false;

            token.IsPriority = !token.IsPriority;
            await _context.SaveChangesAsync(cancellationToken);
            
            // Re-fetch queue to get the branch id and current token for notification
            var queue = await _context.DailyQueues.FindAsync(token.QueueId);
            if (queue != null) {
                try {
                    await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                } catch { }
            }

            return true;
        }
    }
}
