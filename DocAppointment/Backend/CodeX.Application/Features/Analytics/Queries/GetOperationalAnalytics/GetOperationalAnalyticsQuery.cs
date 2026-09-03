using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Analytics.Queries.GetOperationalAnalytics
{
    public record GetOperationalAnalyticsQuery : IRequest<OperationalAnalyticsDto>
    {
        public Guid OrganizationId { get; init; }
        public Guid? BranchId { get; init; }
        public DateTime StartDate { get; init; }
        public DateTime EndDate { get; init; }
    }

    public class OperationalAnalyticsDto
    {
        public int TotalTokens { get; set; }
        public int CompletedTokens { get; set; }
        public int CancelledTokens { get; set; }
        public int NoShowTokens { get; set; }
        public int PendingTokens { get; set; }
        public double AverageWaitTimeMinutes { get; set; }
        public List<PeakHourDto> PeakHours { get; set; } = new();
        public List<BranchComparisonDto> BranchComparisons { get; set; } = new();
        public List<DoctorUtilizationDto> DoctorUtilizations { get; set; } = new();
        public List<AppointmentLogDto> AppointmentLogs { get; set; } = new();
    }

    public class AppointmentLogDto
    {
        public DateTime Date { get; set; }
        public int TokenNumber { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int WaitTimeMinutes { get; set; }
        public decimal FeePaid { get; set; }
    }

    public class DoctorUtilizationDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public int TotalCapacity { get; set; }
        public int BookedTokens { get; set; }
        public double UtilizationPercentage { get; set; }
    }

    public class PeakHourDto
    {
        public int Hour { get; set; }
        public int TokenCount { get; set; }
    }

    public class BranchComparisonDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public int PatientCount { get; set; }
    }

    public class GetOperationalAnalyticsQueryHandler : IRequestHandler<GetOperationalAnalyticsQuery, OperationalAnalyticsDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetOperationalAnalyticsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<OperationalAnalyticsDto> Handle(GetOperationalAnalyticsQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.Tokens
                .Include(t => t.Queue)
                    .ThenInclude(q => q.Doctor)
                .Include(t => t.Patient)
                .Where(t => t.OrganizationId == request.OrganizationId &&
                            t.BookedAt >= request.StartDate && 
                            t.BookedAt <= request.EndDate &&
                            !t.IsDeleted);

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            var tokens = await query.ToListAsync(cancellationToken);

            var result = new OperationalAnalyticsDto
            {
                TotalTokens = tokens.Count,
                CompletedTokens = tokens.Count(t => t.Status == TokenStatus.Completed),
                CancelledTokens = tokens.Count(t => t.Status == TokenStatus.Cancelled),
                NoShowTokens = tokens.Count(t => t.Status == TokenStatus.Skipped),
                PendingTokens = tokens.Count(t => t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called)
            };

            var waitTimes = tokens
                .Where(t => t.CalledAt.HasValue)
                .Select(t => (t.CalledAt!.Value - t.BookedAt).TotalMinutes)
                .ToList();

            if (waitTimes.Any())
            {
                result.AverageWaitTimeMinutes = Math.Round(waitTimes.Average(), 1);
            }

            result.PeakHours = tokens
                .GroupBy(t => t.BookedAt.ToLocalTime().Hour)
                .Select(g => new PeakHourDto { Hour = g.Key, TokenCount = g.Count() })
                .OrderBy(x => x.Hour)
                .ToList();

            // Branch Comparison
            var branches = await _context.Branches
                .Where(b => b.OrganizationId == request.OrganizationId && !b.IsDeleted)
                .ToListAsync(cancellationToken);
                
            var branchStats = tokens
                .GroupBy(t => t.Queue.BranchId)
                .ToDictionary(g => g.Key, g => g.Count());

            foreach (var branch in branches)
            {
                result.BranchComparisons.Add(new BranchComparisonDto
                {
                    BranchId = branch.Id,
                    BranchName = branch.Name,
                    PatientCount = branchStats.ContainsKey(branch.Id) ? branchStats[branch.Id] : 0
                });
            }

            result.BranchComparisons = result.BranchComparisons.OrderByDescending(x => x.PatientCount).ToList();

            // Doctor Utilization
            var doctorStats = tokens
                .GroupBy(t => t.Queue.DoctorId)
                .ToDictionary(g => g.Key, g => g.Count());

            // Get total capacity from DailyQueues for the date range
            var queuesQuery = _context.DailyQueues
                .Include(q => q.Doctor)
                .Include(q => q.Branch)
                .Include(q => q.Session)
                .Where(q => q.Branch.OrganizationId == request.OrganizationId &&
                            q.QueueDate >= request.StartDate.Date &&
                            q.QueueDate <= request.EndDate.Date &&
                            !q.IsDeleted);

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                queuesQuery = queuesQuery.Where(q => q.BranchId == request.BranchId.Value);
            }

            var queues = await queuesQuery.ToListAsync(cancellationToken);

            var capacityStats = queues
                .GroupBy(q => new { q.DoctorId, q.Doctor.Name })
                .Select(g => new
                {
                    DoctorId = g.Key.DoctorId,
                    DoctorName = g.Key.Name,
                    TotalCapacity = g.Sum(q => q.Session?.DefaultCapacity ?? 0)
                }).ToList();

            foreach (var cap in capacityStats)
            {
                var booked = doctorStats.ContainsKey(cap.DoctorId) ? doctorStats[cap.DoctorId] : 0;
                result.DoctorUtilizations.Add(new DoctorUtilizationDto
                {
                    DoctorId = cap.DoctorId,
                    DoctorName = cap.DoctorName,
                    TotalCapacity = cap.TotalCapacity,
                    BookedTokens = booked,
                    UtilizationPercentage = cap.TotalCapacity > 0 ? Math.Round((double)booked / cap.TotalCapacity * 100, 1) : 0
                });
            }

            result.DoctorUtilizations = result.DoctorUtilizations.OrderByDescending(x => x.UtilizationPercentage).ToList();

            result.AppointmentLogs = tokens.Select(t => new AppointmentLogDto
            {
                Date = t.BookedAt.ToLocalTime(),
                TokenNumber = t.TokenNumber,
                PatientName = t.Patient?.Name ?? string.Empty,
                PhoneNumber = t.Patient?.Phone ?? string.Empty,
                DoctorName = t.Queue?.Doctor?.Name ?? string.Empty,
                Status = t.Status.ToString(),
                WaitTimeMinutes = t.CalledAt.HasValue ? (int)(t.CalledAt.Value - t.BookedAt).TotalMinutes : 0,
                FeePaid = t.FeePaid
            }).OrderByDescending(x => x.Date).ToList();

            return result;
        }
    }
}
