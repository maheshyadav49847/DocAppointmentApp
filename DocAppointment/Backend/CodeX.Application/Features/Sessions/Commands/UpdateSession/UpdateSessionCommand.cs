using MediatR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Sessions.Commands.UpdateSession
{
    public record UpdateSessionCommand : IRequest<Unit>
    {
        public Guid Id { get; init; }
        public string SessionName { get; init; } = string.Empty;
        public int DayOfWeek { get; init; }
        public TimeSpan StartTime { get; init; }
        public TimeSpan EndTime { get; init; }
        public int DefaultCapacity { get; init; }
    }

    public class UpdateSessionCommandHandler : IRequestHandler<UpdateSessionCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public UpdateSessionCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateSessionCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions.FindAsync(new object[] { request.Id }, cancellationToken);
            if (session == null) throw new Exception("Session not found");

            session.SessionName = request.SessionName;
            session.DayOfWeek = request.DayOfWeek;
            session.StartTime = request.StartTime;
            session.EndTime = request.EndTime;
            session.DefaultCapacity = request.DefaultCapacity;

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
