using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetNewVsReturningReport
{
    public class NewVsReturningReportRowDto
    {
        public DateTime Date { get; set; }
        public int NewPatients { get; set; }
        public int ReturningPatients { get; set; }
        public int TotalTokens { get; set; }
    }

    public class NewVsReturningReportDto
    {
        public int TotalNewPatients { get; set; }
        public int TotalReturningPatients { get; set; }
        public double ReturningPatientPercentage { get; set; }
        public List<NewVsReturningReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetNewVsReturningReportQuery : IRequest<NewVsReturningReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetNewVsReturningReportQueryHandler : IRequestHandler<GetNewVsReturningReportQuery, NewVsReturningReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetNewVsReturningReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<NewVsReturningReportDto> Handle(GetNewVsReturningReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tokens
                .Where(t => t.OrganizationId == request.OrganizationId
                            && t.BookedAt >= request.StartDate
                            && t.BookedAt <= request.EndDate
                            && !t.IsDeleted);

            if (request.BranchId.HasValue)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            var tokensInRange = await query
                .Select(t => new { t.PatientId, t.BookedAt })
                .ToListAsync(cancellationToken);

            if (!tokensInRange.Any())
            {
                return new NewVsReturningReportDto();
            }

            var patientIds = tokensInRange.Select(t => t.PatientId).Distinct().ToList();

            // Find the VERY FIRST token date for these patients across ALL time
            var firstTokenDates = await _context.Tokens
                .Where(t => patientIds.Contains(t.PatientId) && !t.IsDeleted)
                .GroupBy(t => t.PatientId)
                .Select(g => new { PatientId = g.Key, FirstVisit = g.Min(x => x.BookedAt) })
                .ToDictionaryAsync(x => x.PatientId, x => x.FirstVisit, cancellationToken);

            var grouped = tokensInRange
                .GroupBy(t => t.BookedAt.Date)
                .Select(g => 
                {
                    int newP = 0;
                    int retP = 0;
                    foreach(var token in g)
                    {
                        if (firstTokenDates.TryGetValue(token.PatientId, out var firstDate) && firstDate.Date == token.BookedAt.Date)
                        {
                            newP++; // It's their first visit ever on this day
                        }
                        else
                        {
                            retP++; // They had a visit before this day
                        }
                    }

                    return new NewVsReturningReportRowDto
                    {
                        Date = g.Key,
                        NewPatients = newP,
                        ReturningPatients = retP,
                        TotalTokens = g.Count()
                    };
                })
                .OrderBy(r => r.Date)
                .ToList();

            int totalNew = grouped.Sum(g => g.NewPatients);
            int totalRet = grouped.Sum(g => g.ReturningPatients);
            int total = totalNew + totalRet;

            return new NewVsReturningReportDto
            {
                TotalNewPatients = totalNew,
                TotalReturningPatients = totalRet,
                ReturningPatientPercentage = total > 0 ? Math.Round((double)totalRet / total * 100, 2) : 0,
                DetailedRows = grouped
            };
        }
    }
}
