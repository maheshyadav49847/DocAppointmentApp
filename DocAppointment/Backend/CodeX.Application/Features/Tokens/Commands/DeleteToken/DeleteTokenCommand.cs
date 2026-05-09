using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Tokens.Commands.DeleteToken
{
    public record DeleteTokenCommand(Guid TokenId) : IRequest<bool>;

    public class DeleteTokenCommandHandler : IRequestHandler<DeleteTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;

        public DeleteTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(DeleteTokenCommand request, CancellationToken cancellationToken)
        {
            var token = await _context.Tokens
                .Include(t => t.Queue)
                .FirstOrDefaultAsync(t => t.Id == request.TokenId, cancellationToken);

            if (token == null) throw new Exception("Token not found");

            // We mark as Cancelled instead of hard delete to preserve history, 
            // or we could hard delete if preferred. Let's hard delete for a clean "Delete" experience.
            token.IsDeleted = true;
            token.Status = TokenStatus.Cancelled; // Also set status to cancelled for clarity
            
            await _context.SaveChangesAsync(cancellationToken);

            // Notify everyone to refresh their lists
            await _notificationService.NotifyTokenUpdated(token.Queue.BranchId, token.QueueId, token.Queue.CurrentTokenNumber);

            return true;
        }
    }
}
