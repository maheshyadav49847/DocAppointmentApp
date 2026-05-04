using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Sessions.Commands.CreateSession
{
    public record CreateSessionCommand : IRequest<Guid>
    {
        public Guid DoctorId { get; init; }
        public string SessionName { get; init; } = string.Empty;
        public int DayOfWeek { get; init; }
        public TimeSpan StartTime { get; init; }
        public TimeSpan EndTime { get; init; }
        public int DefaultCapacity { get; init; }
    }

    public class CreateSessionCommandHandler : IRequestHandler<CreateSessionCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateSessionCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateSessionCommand request, CancellationToken cancellationToken)
        {
            var session = new Session
            {
                DoctorId = request.DoctorId,
                SessionName = request.SessionName,
                DayOfWeek = request.DayOfWeek,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                DefaultCapacity = request.DefaultCapacity
            };

            _context.Sessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            return session.Id;
        }
    }
}
