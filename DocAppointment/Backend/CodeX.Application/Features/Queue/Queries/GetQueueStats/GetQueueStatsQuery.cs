using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Queries.GetQueueStats
{
    public record GetQueueStatsQuery(Guid BranchId) : IRequest<QueueStatsDto>;

    public class QueueStatsDto
    {
        public int ActiveDoctors { get; set; }
        public int TotalPatientsToday { get; set; }
        public int WaitingPatients { get; set; }
        public int CompletedPatients { get; set; }
        public int SkippedPatients { get; set; }
        public int AvgWaitTimeMinutes { get; set; }
        public string ClinicStatus { get; set; } = "Healthy";
    }

    public class GetQueueStatsQueryHandler : IRequestHandler<GetQueueStatsQuery, QueueStatsDto>
    {
        private readonly IApplicationDbContext _context;

        public GetQueueStatsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<QueueStatsDto> Handle(GetQueueStatsQuery request, CancellationToken cancellationToken)
        {
            var branch = await _context.Branches.FindAsync(new object[] { request.BranchId }, cancellationToken);
            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(branch?.Timezone);
            var tomorrow = today.AddDays(1);

            var dailyQueues = await _context.DailyQueues
                .Where(q => q.BranchId == request.BranchId && q.QueueDate >= today && q.QueueDate < tomorrow)
                .Include(q => q.Tokens)
                .ToListAsync(cancellationToken);

            var activeDoctors = dailyQueues.Select(q => q.DoctorId).Distinct().Count();
            var tokens = dailyQueues.SelectMany(q => q.Tokens).ToList();
            var totalPatients = tokens.Count;
            var completedPatients = tokens.Count(t => t.Status == TokenStatus.Completed);
            var skippedPatients = tokens.Count(t => t.Status == TokenStatus.Skipped);
            var waitingPatients = tokens.Count(t => t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called);

            // Calculate Avg Wait Time (simplified: time between check-in and call)
            var calledTokens = tokens
                .Where(t => t.CalledAt.HasValue)
                .ToList();

            double avgWaitTime = 0;
            if (calledTokens.Any())
            {
                avgWaitTime = calledTokens.Average(t => (t.CalledAt.Value - t.CreatedAt).TotalMinutes);
            }

            return new QueueStatsDto
            {
                ActiveDoctors = activeDoctors,
                TotalPatientsToday = totalPatients,
                WaitingPatients = waitingPatients,
                CompletedPatients = completedPatients,
                SkippedPatients = skippedPatients,
                AvgWaitTimeMinutes = (int)Math.Round(avgWaitTime),
                ClinicStatus = totalPatients > 50 ? "Busy" : "Healthy"
            };
        }
    }
}
