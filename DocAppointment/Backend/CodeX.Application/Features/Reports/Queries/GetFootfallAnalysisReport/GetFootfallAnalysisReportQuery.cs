using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetFootfallAnalysisReport
{
    public class FootfallAnalysisReportRowDto
    {
        public DateTime Date { get; set; }
        public int TotalTokens { get; set; }
        public int CompletedTokens { get; set; }
        public int CancelledTokens { get; set; }
    }

    public class FootfallAnalysisReportDto
    {
        public int TotalFootfall { get; set; }
        public int HighestFootfallInADay { get; set; }
        public double AverageDailyFootfall { get; set; }
        public List<FootfallAnalysisReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetFootfallAnalysisReportQuery : IRequest<FootfallAnalysisReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetFootfallAnalysisReportQueryHandler : IRequestHandler<GetFootfallAnalysisReportQuery, FootfallAnalysisReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetFootfallAnalysisReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<FootfallAnalysisReportDto> Handle(GetFootfallAnalysisReportQuery request, CancellationToken cancellationToken)
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

            var tokens = await query.Select(t => new { t.BookedAt, t.Status }).ToListAsync(cancellationToken);

            var grouped = tokens
                .GroupBy(t => t.BookedAt.Date)
                .Select(g => new FootfallAnalysisReportRowDto
                {
                    Date = g.Key,
                    TotalTokens = g.Count(),
                    CompletedTokens = g.Count(x => x.Status == Domain.Enums.TokenStatus.Completed),
                    CancelledTokens = g.Count(x => x.Status == Domain.Enums.TokenStatus.Cancelled)
                })
                .OrderBy(r => r.Date)
                .ToList();

            return new FootfallAnalysisReportDto
            {
                TotalFootfall = tokens.Count,
                HighestFootfallInADay = grouped.Any() ? grouped.Max(g => g.TotalTokens) : 0,
                AverageDailyFootfall = grouped.Any() ? grouped.Average(g => g.TotalTokens) : 0,
                DetailedRows = grouped
            };
        }
    }
}
