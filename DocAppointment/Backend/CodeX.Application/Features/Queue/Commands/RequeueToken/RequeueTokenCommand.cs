using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.RequeueToken
{
    public record RequeueTokenCommand(Guid TokenId) : IRequest<bool>;

    public class RequeueTokenCommandHandler : IRequestHandler<RequeueTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public RequeueTokenCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(RequeueTokenCommand request, CancellationToken cancellationToken)
        {
            var token = await _context.Tokens
                .FirstOrDefaultAsync(t => t.Id == request.TokenId, cancellationToken);

            if (token == null) return false;

            // Only skipped tokens can be requeued
            if (token.Status == TokenStatus.Skipped)
            {
                token.Status = TokenStatus.Pending;
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }

            return false;
        }
    }
}
