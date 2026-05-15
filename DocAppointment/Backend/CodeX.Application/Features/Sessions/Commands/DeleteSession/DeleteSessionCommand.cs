using MediatR;
using CodeX.Application.Common.Interfaces;

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
            var session = await _context.Sessions.FindAsync(new object[] { request.Id }, cancellationToken);
            if (session == null) throw new Exception("Session not found");

            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, session.BranchId);

            session.IsDeleted = true;
            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
