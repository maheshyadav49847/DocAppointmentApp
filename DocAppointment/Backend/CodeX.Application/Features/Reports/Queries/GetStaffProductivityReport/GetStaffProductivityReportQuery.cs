using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetStaffProductivityReport
{
    public class StaffProductivityReportRowDto
    {
        public string StaffName { get; set; } = string.Empty;
        public int TokensGenerated { get; set; }
        public int AppointmentsCompleted { get; set; }
        public int AppointmentsCancelled { get; set; }
    }

    public class StaffProductivityReportDto
    {
        public int TotalTokensGeneratedByStaff { get; set; }
        public List<StaffProductivityReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetStaffProductivityReportQuery : IRequest<StaffProductivityReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetStaffProductivityReportQueryHandler : IRequestHandler<GetStaffProductivityReportQuery, StaffProductivityReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetStaffProductivityReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<StaffProductivityReportDto> Handle(GetStaffProductivityReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tokens
                .Where(t => t.OrganizationId == request.OrganizationId
                            && t.BookedAt >= request.StartDate
                            && t.BookedAt <= request.EndDate
                            && t.CreatedByStaffId != null
                            && !t.IsDeleted);

            if (request.BranchId.HasValue)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            var tokens = await query
                .Select(t => new { 
                    t.Status,
                    StaffId = t.CreatedByStaffId
                }).ToListAsync(cancellationToken);

            var staffIds = tokens.Select(t => t.StaffId).Distinct().ToList();
            var staffList = await _context.Staffs
                .Where(s => staffIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.FirstName + " " + s.LastName, cancellationToken);

            var grouped = tokens
                .GroupBy(t => t.StaffId)
                .Select(g => new StaffProductivityReportRowDto
                {
                    StaffName = staffList.ContainsKey(g.Key!.Value) ? staffList[g.Key!.Value] : "Unknown Staff",
                    TokensGenerated = g.Count(),
                    AppointmentsCompleted = g.Count(x => x.Status == Domain.Enums.TokenStatus.Completed),
                    AppointmentsCancelled = g.Count(x => x.Status == Domain.Enums.TokenStatus.Cancelled)
                })
                .OrderByDescending(r => r.TokensGenerated)
                .ToList();

            return new StaffProductivityReportDto
            {
                TotalTokensGeneratedByStaff = tokens.Count,
                DetailedRows = grouped
            };
        }
    }
}
