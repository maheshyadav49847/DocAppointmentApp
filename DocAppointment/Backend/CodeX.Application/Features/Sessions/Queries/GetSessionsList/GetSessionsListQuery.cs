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

        public GetSessionsListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<SessionDto>> Handle(GetSessionsListQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Sessions.Where(s => s.DoctorId == request.DoctorId);

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
