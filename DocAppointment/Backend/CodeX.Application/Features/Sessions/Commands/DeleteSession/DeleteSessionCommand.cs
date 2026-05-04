using MediatR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Sessions.Commands.DeleteSession
{
    public record DeleteSessionCommand(Guid Id) : IRequest<Unit>;

    public class DeleteSessionCommandHandler : IRequestHandler<DeleteSessionCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public DeleteSessionCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteSessionCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions.FindAsync(new object[] { request.Id }, cancellationToken);
            if (session == null) throw new Exception("Session not found");

            _context.Sessions.Remove(session);
            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
