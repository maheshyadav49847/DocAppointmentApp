using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Reports.Queries.GetBranchAnalytics
{
    public record BranchAnalyticsDto
    {
        public int TotalTokens { get; set; }
        public int CompletedTokens { get; set; }
        public int CancelledTokens { get; set; }
        public int PendingTokens { get; set; }
        public double AverageWaitTimeMinutes { get; set; }
        public double AverageRating { get; set; }
        
        // New Sections
        public PatientCompositionDto PatientComposition { get; set; } = new();
        public OperationalMetricsDto Operations { get; set; } = new();
        public List<StaffEfficiencyDto> StaffPerformance { get; set; } = new();
        public WhatsAppStatsDto WhatsAppStats { get; set; } = new();
        public PlatformStatsDto PlatformStats { get; set; } = new();
        
        public List<HourlyTrendDto> HourlyTrends { get; set; } = new();
        public List<DoctorPerformanceDto> DoctorPerformance { get; set; } = new();
        public List<DailyTrendDto> DailyWaitTimeTrends { get; set; } = new();
        public List<FeedbackDto> RecentFeedback { get; set; } = new();
    }


    public record PatientCompositionDto(int NewPatients = 0, int ReturningPatients = 0, double RepeatRate = 0);
    public record OperationalMetricsDto(double AvgDoctorPunctualityMinutes = 0, double SlotUtilizationPercent = 0);
    public record StaffEfficiencyDto(string StaffName, int TokensGenerated, double AverageRating);
    public record WhatsAppStatsDto(int TotalSent = 0, int Delivered = 0, int Failed = 0);
    public record PlatformStatsDto(int TotalOrganizations = 0, int TotalBranches = 0, double AvgApiResponseTimeMs = 0, double DatabaseSizeMb = 0);

    public record HourlyTrendDto(int Hour, int Count);
    public record DailyTrendDto(string Date, double AvgWaitTime);
    public record FeedbackDto(string PatientName, int Score, string? Comment, string Date);
    public record DoctorPerformanceDto(string DoctorName, int TokenCount, double AvgWaitTime, double AverageRating);

    public record GetBranchAnalyticsQuery(Guid OrgId, Guid? BranchId, DateTime StartDate, DateTime EndDate, bool IsSuperAdmin = false) : IRequest<BranchAnalyticsDto>;

    public class GetBranchAnalyticsQueryHandler : IRequestHandler<GetBranchAnalyticsQuery, BranchAnalyticsDto>
    {
        private readonly IApplicationDbContext _context;

        public GetBranchAnalyticsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<BranchAnalyticsDto> Handle(GetBranchAnalyticsQuery request, CancellationToken cancellationToken)
        {
            var tokensQuery = _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Include(t => t.Queue.Session)
                .Include(t => t.Queue.Branch)
                .Include(t => t.Rating)
                .Include(t => t.Patient)
                .Where(t => !t.IsDeleted);

            // If not SuperAdmin, restrict to OrgId
            if (!request.IsSuperAdmin)
            {
                tokensQuery = tokensQuery.Where(t => t.Queue.Branch.OrganizationId == request.OrgId);
            }

            if (request.BranchId.HasValue)
            {
                tokensQuery = tokensQuery.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            tokensQuery = tokensQuery.Where(t => t.BookedAt >= request.StartDate && t.BookedAt <= request.EndDate);

            var tokens = await tokensQuery.ToListAsync(cancellationToken);

            var dto = new BranchAnalyticsDto
            {
                TotalTokens = tokens.Count,
                CompletedTokens = tokens.Count(t => t.Status == TokenStatus.Completed),
                CancelledTokens = tokens.Count(t => t.Status == TokenStatus.Cancelled),
                PendingTokens = tokens.Count(t => t.Status == TokenStatus.Pending),
                AverageRating = tokens.Where(t => t.Rating != null).Any() 
                    ? Math.Round(tokens.Where(t => t.Rating != null).Average(t => t.Rating!.Score), 1) 
                    : 0,
            };

            // Accurate Patient Composition
            var uniquePatientIds = tokens.Select(t => t.PatientId).Distinct().ToList();
            var patients = await _context.Patients
                .Where(p => uniquePatientIds.Contains(p.Id))
                .Select(p => new { p.Id, p.CreatedAt })
                .ToListAsync(cancellationToken);

            var totalUnique = patients.Count;
            dto.PatientComposition = new PatientCompositionDto(
                NewPatients: patients.Count(p => p.CreatedAt >= request.StartDate && p.CreatedAt <= request.EndDate),
                ReturningPatients: patients.Count(p => p.CreatedAt < request.StartDate),
                RepeatRate: totalUnique > 0 ? Math.Round((double)patients.Count(p => p.CreatedAt < request.StartDate) / totalUnique * 100, 1) : 0
            );


            // Operational Metrics
            var queuesWithStart = tokens
                .Select(t => t.Queue)
                .DistinctBy(q => q.Id)
                .Where(q => q.ActualStartAt.HasValue)
                .ToList();

            double avgPunctuality = 0;
            if (queuesWithStart.Any())
            {
                avgPunctuality = queuesWithStart.Average(q => {
                    var scheduled = q.QueueDate.Date.Add(q.Session.StartTime);
                    return (q.ActualStartAt!.Value - scheduled).TotalMinutes;
                });
            }

            var totalCapacity = queuesWithStart.Sum(q => q.Session.DefaultCapacity);
            dto.Operations = new OperationalMetricsDto(
                AvgDoctorPunctualityMinutes: Math.Round(avgPunctuality, 1),
                SlotUtilizationPercent: (totalCapacity > 0) ? Math.Round((double)tokens.Count / totalCapacity * 100, 1) : 0
            );

            // Staff Performance
            var staffIds = tokens.Where(t => t.CreatedByStaffId.HasValue).Select(t => t.CreatedByStaffId!.Value).Distinct().ToList();
            var staffNames = await _context.Staffs
                .Where(s => staffIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => $"{s.FirstName} {s.LastName}", cancellationToken);

            dto.StaffPerformance = tokens
                .Where(t => t.CreatedByStaffId.HasValue)
                .GroupBy(t => t.CreatedByStaffId!.Value)
                .Select(g => new StaffEfficiencyDto(
                    staffNames.ContainsKey(g.Key) ? staffNames[g.Key] : "System",
                    g.Count(),
                    g.Where(t => t.Rating != null).Any() 
                        ? Math.Round(g.Where(t => t.Rating != null).Average(t => t.Rating!.Score), 1)
                        : 0
                ))
                .OrderByDescending(s => s.TokensGenerated)
                .ToList();

            // WhatsApp Bridge Stats
            var msgLogs = await _context.MessageLogs
                .Where(m => m.BranchId == request.BranchId || (!request.BranchId.HasValue && m.Branch.OrganizationId == request.OrgId))
                .Where(m => m.CreatedAt >= request.StartDate && m.CreatedAt <= request.EndDate)
                .ToListAsync(cancellationToken);

            dto.WhatsAppStats = new WhatsAppStatsDto(
                TotalSent: msgLogs.Count,
                Delivered: msgLogs.Count(m => m.Status == "Delivered"),
                Failed: msgLogs.Count(m => m.Status == "Failed")
            );

            // Calculate Avg Wait Time
            var waitTimes = tokens
                .Where(t => t.CalledAt.HasValue)
                .Select(t => (t.CalledAt!.Value - t.BookedAt).TotalMinutes)
                .ToList();

            dto.AverageWaitTimeMinutes = waitTimes.Any() ? Math.Round(waitTimes.Average(), 1) : 0;

            // Hourly Trends
            dto.HourlyTrends = tokens
                .GroupBy(t => t.BookedAt.Hour)
                .Select(g => new HourlyTrendDto(g.Key, g.Count()))
                .OrderBy(g => g.Hour)
                .ToList();

            // Daily Wait Time Trends
            dto.DailyWaitTimeTrends = tokens
                .Where(t => t.CalledAt.HasValue)
                .GroupBy(t => t.BookedAt.Date)
                .Select(g => new { DateKey = g.Key, Value = Math.Round(g.Average(t => (t.CalledAt!.Value - t.BookedAt).TotalMinutes), 1) })
                .OrderBy(x => x.DateKey)
                .Select(x => new DailyTrendDto(
                    x.DateKey.ToString("MMM dd"),
                    x.Value
                ))
                .ToList();

            // Doctor Performance
            dto.DoctorPerformance = tokens
                .GroupBy(t => t.Queue.Doctor.Name)
                .Select(g => new DoctorPerformanceDto(
                    g.Key, 
                    g.Count(), 
                    g.Where(t => t.CalledAt.HasValue).Any() 
                        ? Math.Round(g.Where(t => t.CalledAt.HasValue).Average(t => (t.CalledAt!.Value - t.BookedAt).TotalMinutes), 1)
                        : 0,
                    g.Where(t => t.Rating != null).Any()
                        ? Math.Round(g.Where(t => t.Rating != null).Average(t => t.Rating!.Score), 1)
                        : 0
                ))
                .ToList();

            // Recent Feedback
            dto.RecentFeedback = tokens
                .Where(t => t.Rating != null)
                .OrderByDescending(t => t.BookedAt)
                .Take(10)
                .Select(t => new FeedbackDto(
                    t.Patient?.Name ?? "Anonymous", 
                    t.Rating!.Score, 
                    t.Rating.Comment, 
                    t.BookedAt.ToString("MMM dd HH:mm")
                ))
                .ToList();

            // SuperAdmin / SaaS Platform Stats
            if (request.IsSuperAdmin)
            {
                var totalOrgs = await _context.Organizations.CountAsync(cancellationToken);
                var totalBranches = await _context.Branches.CountAsync(cancellationToken);
                
                // Estimate DB Size (approximate based on record counts for demo/saas view)
                var totalTokensAll = await _context.Tokens.CountAsync(cancellationToken);
                var dbSizeEst = (totalTokensAll * 0.5) / 1024; // 0.5KB per token record approx

                dto.PlatformStats = new PlatformStatsDto(
                    TotalOrganizations: totalOrgs,
                    TotalBranches: totalBranches,
                    AvgApiResponseTimeMs: 145, // This would ideally come from middleware metrics
                    DatabaseSizeMb: Math.Round(dbSizeEst + 5, 2) // Base 5MB + data
                );
            }

            return dto;
        }
    }
}
