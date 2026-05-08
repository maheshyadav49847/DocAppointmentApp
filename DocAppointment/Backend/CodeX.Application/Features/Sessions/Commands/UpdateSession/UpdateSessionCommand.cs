using MediatR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Sessions.Commands.UpdateSession
{
    public record UpdateSessionCommand : IRequest<Unit>
    {
        public Guid Id { get; set; }
        public Guid BranchId { get; set; }
        public string SessionName { get; set; } = string.Empty;
        public int DayOfWeek { get; set; }
        public bool IsDaily { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DefaultCapacity { get; set; }
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

            session.BranchId = request.BranchId;
            session.SessionName = request.SessionName;
            session.DayOfWeek = request.DayOfWeek;
            session.IsDaily = request.IsDaily;
            session.StartTime = request.StartTime;
            session.EndTime = request.EndTime;
            session.DefaultCapacity = request.DefaultCapacity;

            await _context.SaveChangesAsync(cancellationToken);
            return Unit.Value;
        }
    }
}
