using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Sessions.Queries.GetSessionsList
{
    public record GetSessionsListQuery(Guid DoctorId) : IRequest<List<SessionDto>>;

    public record SessionDto(Guid Id, string SessionName, int DayOfWeek, TimeSpan StartTime, TimeSpan EndTime, int DefaultCapacity);

    public class GetSessionsListQueryHandler : IRequestHandler<GetSessionsListQuery, List<SessionDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetSessionsListQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<SessionDto>> Handle(GetSessionsListQuery request, CancellationToken cancellationToken)
        {
            return await _context.Sessions
                .Where(s => s.DoctorId == request.DoctorId)
                .OrderBy(s => s.DayOfWeek)
                .ThenBy(s => s.StartTime)
                .Select(s => new SessionDto(
                    s.Id,
                    s.SessionName,
                    s.DayOfWeek,
                    s.StartTime,
                    s.EndTime,
                    s.DefaultCapacity))
                .ToListAsync(cancellationToken);
        }
    }
}
