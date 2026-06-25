using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Analytics.Queries.GetHistoricalStats
{
    public record GetHistoricalStatsQuery(Guid BranchId, DateTime StartDate, DateTime EndDate) : IRequest<HistoricalStatsDto>;

    public class HistoricalStatsDto
    {
        public List<DailyStatDto> DailyStats { get; set; } = new();
        public int TotalPatientsInPeriod { get; set; }
        public int TotalCompletedInPeriod { get; set; }
        public int TotalSkippedInPeriod { get; set; }
        public int AverageWaitTimeInPeriod { get; set; }
    }

    public class DailyStatDto
    {
        public DateTime Date { get; set; }
        public int TotalPatients { get; set; }
        public int Completed { get; set; }
        public int Skipped { get; set; }
        public int AvgWaitTimeMinutes { get; set; }
    }

    public class GetHistoricalStatsQueryHandler : IRequestHandler<GetHistoricalStatsQuery, HistoricalStatsDto>
    {
        private readonly IApplicationDbContext _context;

        public GetHistoricalStatsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<HistoricalStatsDto> Handle(GetHistoricalStatsQuery request, CancellationToken cancellationToken)
        {
            // Ensure dates are in UTC for Npgsql/PostgreSQL compatibility
            var startUtc = request.StartDate.Date.ToUniversalTime();
            var endUtc = request.EndDate.Date.AddDays(1).AddTicks(-1).ToUniversalTime();

            // Fetch all queues within the date range
            var dailyQueuesQuery = _context.DailyQueues
                .Where(q => q.BranchId == request.BranchId && q.QueueDate >= startUtc && q.QueueDate <= endUtc);

            var dailyQueues = await dailyQueuesQuery
                .Include(q => q.Tokens)
                .ToListAsync(cancellationToken);

            var dailyStats = new List<DailyStatDto>();
            
            if (dailyQueues == null || !dailyQueues.Any())
            {
                return new HistoricalStatsDto();
            }

            // Group by Date
            var groupedByDate = dailyQueues
                .GroupBy(q => q.QueueDate.Date)
                .OrderBy(g => g.Key);

            int overallTotal = 0;
            int overallCompleted = 0;
            int overallSkipped = 0;
            var allCalledTokens = new List<double>();

            foreach (var group in groupedByDate)
            {
                var tokensForDay = group.SelectMany(q => q.Tokens ?? (ICollection<Token>)new List<Token>()).ToList();
                int totalForDay = tokensForDay.Count;
                int completedForDay = tokensForDay.Count(t => t.Status == TokenStatus.Completed);
                int skippedForDay = tokensForDay.Count(t => t.Status == TokenStatus.Skipped);
                
                var calledTokensForDay = tokensForDay
                    .Where(t => t.CalledAt.HasValue)
                    .Select(t => (t.CalledAt!.Value - t.CreatedAt).TotalMinutes)
                    .ToList();

                double avgWaitTimeForDay = 0;
                if (calledTokensForDay.Any())
                {
                    avgWaitTimeForDay = calledTokensForDay.Average();
                    allCalledTokens.AddRange(calledTokensForDay);
                }

                overallTotal += totalForDay;
                overallCompleted += completedForDay;
                overallSkipped += skippedForDay;

                dailyStats.Add(new DailyStatDto
                {
                    Date = group.Key,
                    TotalPatients = totalForDay,
                    Completed = completedForDay,
                    Skipped = skippedForDay,
                    AvgWaitTimeMinutes = (int)Math.Round(avgWaitTimeForDay)
                });
            }

            double overallAvgWaitTime = 0;
            if (allCalledTokens.Any())
            {
                overallAvgWaitTime = allCalledTokens.Average();
            }

            return new HistoricalStatsDto
            {
                DailyStats = dailyStats,
                TotalPatientsInPeriod = overallTotal,
                TotalCompletedInPeriod = overallCompleted,
                TotalSkippedInPeriod = overallSkipped,
                AverageWaitTimeInPeriod = (int)Math.Round(overallAvgWaitTime)
            };
        }
    }
}
