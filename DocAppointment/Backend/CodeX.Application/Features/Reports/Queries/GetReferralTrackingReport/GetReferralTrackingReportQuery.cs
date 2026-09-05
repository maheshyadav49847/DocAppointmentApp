using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetReferralTrackingReport
{
    public class ReferralTrackingReportRowDto
    {
        public string Source { get; set; } = string.Empty;
        public int TotalBookings { get; set; }
        public double Percentage { get; set; }
    }

    public class ReferralTrackingReportDto
    {
        public int TotalBookings { get; set; }
        public List<ReferralTrackingReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetReferralTrackingReportQuery : IRequest<ReferralTrackingReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetReferralTrackingReportQueryHandler : IRequestHandler<GetReferralTrackingReportQuery, ReferralTrackingReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetReferralTrackingReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ReferralTrackingReportDto> Handle(GetReferralTrackingReportQuery request, CancellationToken cancellationToken)
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

            var tokens = await query.Select(t => t.Source).ToListAsync(cancellationToken);

            var grouped = tokens
                .GroupBy(s => s)
                .Select(g => new ReferralTrackingReportRowDto
                {
                    Source = g.Key.ToString(),
                    TotalBookings = g.Count(),
                    Percentage = tokens.Count > 0 ? Math.Round((double)g.Count() / tokens.Count * 100, 2) : 0
                })
                .OrderByDescending(r => r.TotalBookings)
                .ToList();

            return new ReferralTrackingReportDto
            {
                TotalBookings = tokens.Count,
                DetailedRows = grouped
            };
        }
    }
}
