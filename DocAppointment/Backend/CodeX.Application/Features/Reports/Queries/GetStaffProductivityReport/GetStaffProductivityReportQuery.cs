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
        public int LeavesTakenCount { get; set; }
        public int ActiveWorkingDays { get; set; }
        public double TokensPerWorkingDay { get; set; }
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

            var startUtc = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            var staffLeaves = await _context.LeaveRecords
                .Where(l => l.OrganizationId == request.OrganizationId
                            && !l.IsDeleted
                            && l.StaffId.HasValue
                            && staffIds.Contains(l.StaffId.Value)
                            && l.Status == Domain.Enums.LeaveStatus.Approved
                            && l.StartDate <= endUtc
                            && l.EndDate >= startUtc)
                .Select(l => new {
                    StaffId = l.StaffId!.Value,
                    l.StartDate,
                    l.EndDate
                })
                .ToListAsync(cancellationToken);

            int totalDaysInRange = Math.Max(1, (int)(request.EndDate.Date - request.StartDate.Date).TotalDays + 1);

            var grouped = tokens
                .GroupBy(t => t.StaffId)
                .Select(g => {
                    var staffId = g.Key!.Value;
                    int leavesDays = staffLeaves.Where(l => l.StaffId == staffId).Sum(l => {
                        var ls = l.StartDate.Date < request.StartDate.Date ? request.StartDate.Date : l.StartDate.Date;
                        var le = l.EndDate.Date > request.EndDate.Date ? request.EndDate.Date : l.EndDate.Date;
                        return Math.Max(1, (int)(le - ls).TotalDays + 1);
                    });
                    int activeWorkingDays = Math.Max(1, totalDaysInRange - leavesDays);
                    int tokensCount = g.Count();

                    return new StaffProductivityReportRowDto
                    {
                        StaffName = staffList.ContainsKey(staffId) ? staffList[staffId] : "Unknown Staff",
                        TokensGenerated = tokensCount,
                        AppointmentsCompleted = g.Count(x => x.Status == Domain.Enums.TokenStatus.Completed),
                        AppointmentsCancelled = g.Count(x => x.Status == Domain.Enums.TokenStatus.Cancelled),
                        LeavesTakenCount = leavesDays,
                        ActiveWorkingDays = activeWorkingDays,
                        TokensPerWorkingDay = Math.Round((double)tokensCount / activeWorkingDays, 1)
                    };
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
