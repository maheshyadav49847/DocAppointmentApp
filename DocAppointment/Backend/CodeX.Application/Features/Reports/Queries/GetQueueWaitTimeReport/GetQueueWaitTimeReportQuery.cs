using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetQueueWaitTimeReport
{
    public class QueueWaitTimeReportRowDto
    {
        public string DoctorName { get; set; } = string.Empty;
        public int TotalTokensProcessed { get; set; }
        public double AvgWaitTimeMinutes { get; set; }
        public double AvgConsultationTimeMinutes { get; set; }
    }

    public class QueueWaitTimeReportDto
    {
        public double OverallAvgWaitTimeMinutes { get; set; }
        public double OverallAvgConsultationTimeMinutes { get; set; }
        public List<QueueWaitTimeReportRowDto> DetailedRows { get; set; } = new();
    }

    public class GetQueueWaitTimeReportQuery : IRequest<QueueWaitTimeReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetQueueWaitTimeReportQueryHandler : IRequestHandler<GetQueueWaitTimeReportQuery, QueueWaitTimeReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetQueueWaitTimeReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<QueueWaitTimeReportDto> Handle(GetQueueWaitTimeReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => t.OrganizationId == request.OrganizationId
                            && t.BookedAt >= request.StartDate
                            && t.BookedAt <= request.EndDate
                            && t.Status == Domain.Enums.TokenStatus.Completed
                            && !t.IsDeleted);

            if (request.BranchId.HasValue)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }
            if (request.DoctorId.HasValue)
            {
                query = query.Where(t => t.Queue.DoctorId == request.DoctorId.Value);
            }

            var tokens = await query.Select(t => new { 
                t.BookedAt, 
                t.CalledAt, 
                t.CompletedAt,
                DoctorName = t.Queue.Doctor != null ? t.Queue.Doctor.Name : "Unknown" 
            }).ToListAsync(cancellationToken);

            // Filter out edge cases where CalledAt or CompletedAt might be null somehow, or bad math
            var validTokensForWait = tokens.Where(t => t.CalledAt.HasValue).ToList();
            var validTokensForConsult = tokens.Where(t => t.CalledAt.HasValue && t.CompletedAt.HasValue).ToList();

            var grouped = validTokensForWait
                .GroupBy(t => t.DoctorName)
                .Select(g => {
                    var consultTokens = validTokensForConsult.Where(c => c.DoctorName == g.Key).ToList();
                    return new QueueWaitTimeReportRowDto
                    {
                        DoctorName = g.Key,
                        TotalTokensProcessed = g.Count(),
                        AvgWaitTimeMinutes = g.Any() ? g.Average(x => (x.CalledAt!.Value - x.BookedAt).TotalMinutes) : 0,
                        AvgConsultationTimeMinutes = consultTokens.Any() ? consultTokens.Average(x => (x.CompletedAt!.Value - x.CalledAt!.Value).TotalMinutes) : 0
                    };
                })
                .OrderBy(r => r.AvgWaitTimeMinutes)
                .ToList();

            return new QueueWaitTimeReportDto
            {
                OverallAvgWaitTimeMinutes = validTokensForWait.Any() ? validTokensForWait.Average(x => (x.CalledAt!.Value - x.BookedAt).TotalMinutes) : 0,
                OverallAvgConsultationTimeMinutes = validTokensForConsult.Any() ? validTokensForConsult.Average(x => (x.CompletedAt!.Value - x.CalledAt!.Value).TotalMinutes) : 0,
                DetailedRows = grouped
            };
        }
    }
}
