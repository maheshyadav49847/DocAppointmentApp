using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetLeaveSummaryReport
{
    public class LeaveSummaryRowDto
    {
        public Guid Id { get; set; }
        public string PersonName { get; set; } = string.Empty;
        public string PersonEmail { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Doctor" or "Staff"
        public string SpecializationOrRole { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty; // "Planned" or "Emergency"
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public int DaysCount { get; set; }
        public string SessionName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? PublicNotice { get; set; }
        public int Status { get; set; } // 0: Pending, 1: Approved, 2: Rejected, 3: Cancelled
        public string StatusName { get; set; } = string.Empty;
        public int AffectedTokensCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class LeaveSummaryReportDto
    {
        public int TotalApplications { get; set; }
        public int ApprovedCount { get; set; }
        public int PendingCount { get; set; }
        public int RejectedCount { get; set; }
        public int CancelledCount { get; set; }
        public int EmergencyCount { get; set; }
        public int TotalDaysLost { get; set; }
        public List<LeaveSummaryRowDto> DetailedRows { get; set; } = new();
    }

    public class GetLeaveSummaryReportQuery : IRequest<LeaveSummaryReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetLeaveSummaryReportQueryHandler : IRequestHandler<GetLeaveSummaryReportQuery, LeaveSummaryReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetLeaveSummaryReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<LeaveSummaryReportDto> Handle(GetLeaveSummaryReportQuery request, CancellationToken cancellationToken)
        {
            var startUtc = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            var query = _context.LeaveRecords
                .IgnoreQueryFilters()
                .Include(l => l.Doctor)
                .Include(l => l.Staff)
                .Include(l => l.Branch)
                .Include(l => l.Session)
                .Where(l => l.OrganizationId == request.OrganizationId
                            && (!l.IsDeleted || l.Status == LeaveStatus.Cancelled)
                            && l.StartDate <= endUtc
                            && l.EndDate >= startUtc)
                .AsQueryable();

            if (request.BranchId.HasValue && request.BranchId.Value != Guid.Empty)
            {
                query = query.Where(l => l.BranchId == null || l.BranchId == request.BranchId.Value);
            }

            if (request.DoctorId.HasValue && request.DoctorId.Value != Guid.Empty)
            {
                query = query.Where(l => l.DoctorId == request.DoctorId.Value);
            }

            var leaves = await query
                .OrderByDescending(l => l.StartDate)
                .ThenByDescending(l => l.CreatedAt)
                .ToListAsync(cancellationToken);

            var rows = leaves.Select(l =>
            {
                bool isDoc = l.DoctorId.HasValue;
                string personName = isDoc && l.Doctor != null 
                    ? $"Dr. {l.Doctor.Name}" 
                    : (l.Staff != null ? $"{l.Staff.FirstName} {l.Staff.LastName}".Trim() : "Clinic Staff");
                
                string personEmail = isDoc ? (l.Doctor?.EmailId ?? "") : (l.Staff?.Email ?? "");
                string role = isDoc ? "Doctor" : (l.Staff?.Role?.Name ?? "Staff");
                string spec = isDoc ? (l.Doctor?.Specialization ?? "Doctor") : (l.Staff?.Role?.Name ?? "Staff");
                int days = Math.Max(1, (int)(l.EndDate.Date - l.StartDate.Date).TotalDays + 1);

                string statusName = l.Status switch
                {
                    LeaveStatus.Approved => "Approved",
                    LeaveStatus.Rejected => "Rejected",
                    LeaveStatus.Cancelled => "Cancelled",
                    _ => "Pending Approval"
                };

                return new LeaveSummaryRowDto
                {
                    Id = l.Id,
                    PersonName = personName,
                    PersonEmail = personEmail,
                    Role = isDoc ? "Doctor" : "Staff",
                    SpecializationOrRole = spec,
                    BranchName = l.Branch?.Name ?? "All Branches",
                    LeaveType = l.LeaveType == LeaveType.Planned ? "Planned" : "Emergency",
                    StartDate = l.StartDate.ToString("yyyy-MM-dd"),
                    EndDate = l.EndDate.ToString("yyyy-MM-dd"),
                    DaysCount = days,
                    SessionName = l.Session?.SessionName ?? "Full Day",
                    Reason = l.Reason,
                    PublicNotice = l.PublicNotice,
                    Status = (int)l.Status,
                    StatusName = statusName,
                    AffectedTokensCount = l.AffectedTokensCount,
                    CreatedAt = l.CreatedAt
                };
            }).ToList();

            int approved = rows.Count(r => r.Status == 1);
            int pending = rows.Count(r => r.Status == 0);
            int rejected = rows.Count(r => r.Status == 2);
            int cancelled = rows.Count(r => r.Status == 3);
            int emergency = rows.Count(r => r.LeaveType == "Emergency");
            int totalDaysLost = rows.Where(r => r.Status == 1).Sum(r => r.DaysCount);

            return new LeaveSummaryReportDto
            {
                TotalApplications = rows.Count,
                ApprovedCount = approved,
                PendingCount = pending,
                RejectedCount = rejected,
                CancelledCount = cancelled,
                EmergencyCount = emergency,
                TotalDaysLost = totalDaysLost,
                DetailedRows = rows
            };
        }
    }
}
