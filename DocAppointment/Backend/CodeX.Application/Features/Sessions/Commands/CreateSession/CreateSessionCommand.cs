using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Sessions.Commands.CreateSession
{
    public record CreateSessionCommand : IRequest<Guid>
    {
        public Guid DoctorId { get; set; }
        public Guid BranchId { get; set; }
        public string SessionName { get; set; } = string.Empty;
        public int DayOfWeek { get; set; }
        public bool IsDaily { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DefaultCapacity { get; set; }
    }

    public class CreateSessionCommandHandler : IRequestHandler<CreateSessionCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateSessionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateSessionCommand request, CancellationToken cancellationToken)
        {
            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, request.BranchId);

            var session = new Session
            {
                DoctorId = request.DoctorId,
                BranchId = request.BranchId,
                SessionName = request.SessionName,
                DayOfWeek = request.DayOfWeek,
                IsDaily = request.IsDaily,
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
