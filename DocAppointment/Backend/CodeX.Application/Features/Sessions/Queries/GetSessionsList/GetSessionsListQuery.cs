using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Sessions.Queries.GetSessionsList
{
    public record GetSessionsListQuery(Guid DoctorId, Guid? BranchId = null) : IRequest<List<SessionDto>>;

    public record SessionDto(Guid Id, Guid BranchId, string SessionName, int DayOfWeek, bool IsDaily, TimeSpan StartTime, TimeSpan EndTime, int DefaultCapacity);

    public class GetSessionsListQueryHandler : IRequestHandler<GetSessionsListQuery, List<SessionDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetSessionsListQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<SessionDto>> Handle(GetSessionsListQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Sessions.Where(s => s.DoctorId == request.DoctorId && !s.IsDeleted);

            if (_currentUserService.OrgId != Guid.Empty)
            {
                query = query.Where(s => s.Branch.OrganizationId == _currentUserService.OrgId);
            }

            if (_currentUserService.TokenBranchId.HasValue && _currentUserService.TokenBranchId.Value != Guid.Empty)
            {
                if (_currentUserService.DoctorId != request.DoctorId)
                {
                    query = query.Where(s => s.BranchId == _currentUserService.TokenBranchId.Value);
                }
            }

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                query = query.Where(s => s.BranchId == request.BranchId.Value);
            }

            return await query
                .OrderBy(s => s.IsDaily) // Daily first or last? Let's say specific days first
                .ThenBy(s => s.DayOfWeek)
                .ThenBy(s => s.StartTime)
                .Select(s => new SessionDto(
                    s.Id,
                    s.BranchId,
                    s.SessionName,
                    s.DayOfWeek,
                    s.IsDaily,
                    s.StartTime,
                    s.EndTime,
                    s.DefaultCapacity))
                .ToListAsync(cancellationToken);
        }
    }
}
