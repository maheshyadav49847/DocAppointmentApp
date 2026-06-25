using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Sessions.Commands.DeleteSession
{
    public record DeleteSessionCommand(Guid Id) : IRequest<Unit>;

    public class DeleteSessionCommandHandler : IRequestHandler<DeleteSessionCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DeleteSessionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(DeleteSessionCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions
                .Include(s => s.Branch)
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
            if (session == null) throw new Exception("Session not found");

            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, session.Branch.OrganizationId);
            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, session.BranchId);

            session.IsDeleted = true;
            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
