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

        public SkipTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(SkipTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
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
                
                // Notify all clients
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                return true;
            }

            return false;
        }
    }
}
