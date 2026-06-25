using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

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
        private readonly ICurrentUserService _currentUserService;

        public UpdateSessionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(UpdateSessionCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions
                .Include(s => s.Branch)
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken);
            if (session == null) throw new Exception("Session not found");

            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, session.Branch.OrganizationId);
            CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, session.BranchId);

            if (request.BranchId != session.BranchId)
            {
                var newBranch = await _context.Branches.FindAsync(new object[] { request.BranchId }, cancellationToken);
                if (newBranch == null) throw new Exception("New branch not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, newBranch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, request.BranchId);
            }

            var overlappingExists = await _context.Sessions
                .AnyAsync(s => s.Id != request.Id &&
                               s.DoctorId == session.DoctorId &&
                               !s.IsDeleted && s.IsActive &&
                               (s.IsDaily || request.IsDaily || s.DayOfWeek == request.DayOfWeek) &&
                               request.StartTime < s.EndTime && request.EndTime > s.StartTime,
                          cancellationToken);

            if (overlappingExists)
            {
                throw new Exception("This doctor already has an overlapping session at this time in another branch or schedule.");
            }

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
