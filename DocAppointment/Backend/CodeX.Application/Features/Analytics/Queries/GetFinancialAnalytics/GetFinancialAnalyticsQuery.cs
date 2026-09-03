using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Analytics.Queries.GetFinancialAnalytics
{
    public record GetFinancialAnalyticsQuery : IRequest<FinancialAnalyticsDto>
    {
        public Guid OrganizationId { get; init; }
        public Guid? BranchId { get; init; }
        public DateTime StartDate { get; init; }
        public DateTime EndDate { get; init; }
    }

    public class FinancialAnalyticsDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal OutstandingDues { get; set; }
        public List<DailyRevenueDto> RevenueTrend { get; set; } = new();
        public List<PaymentModeBreakdownDto> PaymentBreakdown { get; set; } = new();
        public List<DoctorRevenueDto> DoctorRevenues { get; set; } = new();
    }

    public class DailyRevenueDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
    }

    public class PaymentModeBreakdownDto
    {
        public PaymentMode Mode { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class DoctorRevenueDto
    {
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
    }

    public class GetFinancialAnalyticsQueryHandler : IRequestHandler<GetFinancialAnalyticsQuery, FinancialAnalyticsDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetFinancialAnalyticsQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<FinancialAnalyticsDto> Handle(GetFinancialAnalyticsQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.Tokens
                .Include(t => t.Queue)
                .ThenInclude(q => q.Doctor)
                .Where(t => t.OrganizationId == request.OrganizationId &&
                            t.BookedAt >= request.StartDate && 
                            t.BookedAt <= request.EndDate &&
                            !t.IsDeleted &&
                            (t.Status == TokenStatus.Completed || t.FeePaid > 0));

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                query = query.Where(t => t.Queue.BranchId == request.BranchId.Value);
            }

            var tokens = await query.ToListAsync(cancellationToken);

            var result = new FinancialAnalyticsDto
            {
                TotalRevenue = tokens.Where(t => t.PaymentMode != PaymentMode.Pending).Sum(t => t.FeePaid),
                OutstandingDues = tokens.Where(t => t.PaymentMode == PaymentMode.Pending).Sum(t => t.FeePaid)
            };

            // Revenue Trend (group by day)
            result.RevenueTrend = tokens
                .Where(t => t.PaymentMode != PaymentMode.Pending)
                .GroupBy(t => t.BookedAt.Date)
                .Select(g => new DailyRevenueDto
                {
                    Date = g.Key,
                    Revenue = g.Sum(t => t.FeePaid)
                })
                .OrderBy(x => x.Date)
                .ToList();

            // Fill missing days
            var current = request.StartDate.Date;
            while (current <= request.EndDate.Date)
            {
                if (!result.RevenueTrend.Any(x => x.Date == current))
                {
                    result.RevenueTrend.Add(new DailyRevenueDto { Date = current, Revenue = 0 });
                }
                current = current.AddDays(1);
            }
            result.RevenueTrend = result.RevenueTrend.OrderBy(x => x.Date).ToList();

            // Payment Breakdown
            result.PaymentBreakdown = tokens
                .GroupBy(t => t.PaymentMode)
                .Select(g => new PaymentModeBreakdownDto
                {
                    Mode = g.Key,
                    TotalAmount = g.Sum(t => t.FeePaid)
                }).ToList();

            // Doctor Revenue
            result.DoctorRevenues = tokens
                .Where(t => t.PaymentMode != PaymentMode.Pending)
                .GroupBy(t => new { t.Queue.DoctorId, t.Queue.Doctor.Name })
                .Select(g => new DoctorRevenueDto
                {
                    DoctorId = g.Key.DoctorId,
                    DoctorName = g.Key.Name,
                    TotalRevenue = g.Sum(t => t.FeePaid)
                })
                .OrderByDescending(x => x.TotalRevenue)
                .ToList();

            return result;
        }
    }
}
