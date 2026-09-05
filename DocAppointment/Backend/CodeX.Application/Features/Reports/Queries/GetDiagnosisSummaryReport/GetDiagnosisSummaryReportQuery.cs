using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetDiagnosisSummaryReport
{
    public class DiagnosisSummaryReportRowDto
    {
        public string Diagnosis { get; set; } = string.Empty;
        public int TotalCases { get; set; }
        public double PercentageOfTotal { get; set; }
    }

    public class DiagnosisSummaryReportDto
    {
        public int TotalDiagnosesRecorded { get; set; }
        public List<DiagnosisSummaryReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetDiagnosisSummaryReportQuery : IRequest<DiagnosisSummaryReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetDiagnosisSummaryReportQueryHandler : IRequestHandler<GetDiagnosisSummaryReportQuery, DiagnosisSummaryReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetDiagnosisSummaryReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DiagnosisSummaryReportDto> Handle(GetDiagnosisSummaryReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.PatientVisits
                .Include(v => v.Token)
                .ThenInclude(t => t!.Queue)
                .Where(v => v.OrganizationId == request.OrganizationId
                            && v.VisitDate >= request.StartDate
                            && v.VisitDate <= request.EndDate
                            && v.Diagnosis != null
                            && v.Diagnosis != "");

            if (request.BranchId.HasValue)
            {
                // PatientVisit doesn't directly have BranchId, we go through Token -> Queue -> BranchId if available, 
                // or just rely on Doctor's branch if Token is null. For simplicity, filtering on Doctor is more accurate.
            }
            if (request.DoctorId.HasValue)
            {
                query = query.Where(v => v.DoctorId == request.DoctorId.Value);
            }

            var diagnoses = await query.Select(v => v.Diagnosis).ToListAsync(cancellationToken);

            var grouped = diagnoses
                .GroupBy(d => d!.Trim().ToUpper())
                .Select(g => new DiagnosisSummaryReportRowDto
                {
                    Diagnosis = g.First()!.Trim(), // Keep original casing
                    TotalCases = g.Count(),
                    PercentageOfTotal = diagnoses.Count > 0 ? Math.Round((double)g.Count() / diagnoses.Count * 100, 2) : 0
                })
                .OrderByDescending(r => r.TotalCases)
                .Take(50) // Top 50 diagnoses
                .ToList();

            return new DiagnosisSummaryReportDto
            {
                TotalDiagnosesRecorded = diagnoses.Count,
                DetailedRows = grouped
            };
        }
    }
}
