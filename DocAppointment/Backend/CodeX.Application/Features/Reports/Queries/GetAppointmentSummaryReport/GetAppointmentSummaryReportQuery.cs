using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetAppointmentSummaryReport
{
    public class AppointmentSummaryReportRowDto
    {
        public string DoctorName { get; set; } = string.Empty;
        public int TotalAppointments { get; set; }
        public int Completed { get; set; }
        public int Pending { get; set; }
        public int Cancelled { get; set; }
    }

    public class AppointmentSummaryReportDto
    {
        public int TotalAppointments { get; set; }
        public int TotalCompleted { get; set; }
        public int TotalPending { get; set; }
        public int TotalCancelled { get; set; }
        public List<AppointmentSummaryReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetAppointmentSummaryReportQuery : IRequest<AppointmentSummaryReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetAppointmentSummaryReportQueryHandler : IRequestHandler<GetAppointmentSummaryReportQuery, AppointmentSummaryReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetAppointmentSummaryReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AppointmentSummaryReportDto> Handle(GetAppointmentSummaryReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => t.OrganizationId == request.OrganizationId
                            && t.BookedAt >= request.StartDate
                            && t.BookedAt <= request.EndDate
                            && !t.IsDeleted);

            if (request.BranchId.HasValue)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }
            if (request.DoctorId.HasValue)
            {
                query = query.Where(t => t.Queue.DoctorId == request.DoctorId.Value);
            }

            var tokens = await query.Select(t => new { t.Status, DoctorName = t.Queue.Doctor != null ? t.Queue.Doctor.Name : "Unknown" }).ToListAsync(cancellationToken);

            var grouped = tokens
                .GroupBy(t => t.DoctorName)
                .Select(g => new AppointmentSummaryReportRowDto
                {
                    DoctorName = g.Key,
                    TotalAppointments = g.Count(),
                    Completed = g.Count(x => x.Status == Domain.Enums.TokenStatus.Completed),
                    Pending = g.Count(x => x.Status == Domain.Enums.TokenStatus.Pending || x.Status == Domain.Enums.TokenStatus.Called),
                    Cancelled = g.Count(x => x.Status == Domain.Enums.TokenStatus.Cancelled)
                })
                .OrderByDescending(r => r.TotalAppointments)
                .ToList();

            return new AppointmentSummaryReportDto
            {
                TotalAppointments = tokens.Count,
                TotalCompleted = tokens.Count(x => x.Status == Domain.Enums.TokenStatus.Completed),
                TotalPending = tokens.Count(x => x.Status == Domain.Enums.TokenStatus.Pending || x.Status == Domain.Enums.TokenStatus.Called),
                TotalCancelled = tokens.Count(x => x.Status == Domain.Enums.TokenStatus.Cancelled),
                DetailedRows = grouped
            };
        }
    }
}
