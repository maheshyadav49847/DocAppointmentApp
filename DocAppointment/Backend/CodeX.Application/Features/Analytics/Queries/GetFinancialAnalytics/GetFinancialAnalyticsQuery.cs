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
        public List<ServiceRevenueDto> ServiceRevenues { get; set; } = new();
        public List<PatientOutstandingDto> PatientOutstanding { get; set; } = new();
    }

    public class ServiceRevenueDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
    }

    public class PatientOutstandingDto
    {
        public Guid PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public decimal OutstandingAmount { get; set; }
    }

    public class DailyRevenueDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
        public decimal Outstanding { get; set; }
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

            var invoiceQuery = _context.Invoices
                .Include(i => i.Payments)
                .Include(i => i.Doctor)
                .Include(i => i.Patient)
                .Include(i => i.Items)
                .Include(i => i.Token)
                    .ThenInclude(t => t.Queue)
                        .ThenInclude(q => q.Doctor)
                .Where(i => i.OrganizationId == request.OrganizationId &&
                            i.CreatedAt >= request.StartDate &&
                            i.CreatedAt <= request.EndDate &&
                            !i.IsDeleted);

            if (request.BranchId.HasValue && request.BranchId != Guid.Empty)
            {
                invoiceQuery = invoiceQuery.Where(i => i.BranchId == request.BranchId.Value);
            }

            var invoices = await invoiceQuery.ToListAsync(cancellationToken);

            var payments = invoices.SelectMany(i => i.Payments.Where(p => !p.IsDeleted)).ToList();

            var result = new FinancialAnalyticsDto
            {
                TotalRevenue = invoices.Sum(i => i.PaidAmount),
                OutstandingDues = invoices.Sum(i => i.TotalAmount - i.PaidAmount)
            };

            // Revenue Trend (group by day based on Invoice Creation Date to match)
            result.RevenueTrend = invoices
                .GroupBy(i => i.CreatedAt.Date)
                .Select(g => new DailyRevenueDto
                {
                    Date = g.Key,
                    Revenue = g.Sum(i => i.PaidAmount),
                    Outstanding = g.Sum(i => i.TotalAmount - i.PaidAmount)
                })
                .OrderBy(x => x.Date)
                .ToList();

            // Fill missing days
            var current = request.StartDate.Date;
            while (current <= request.EndDate.Date)
            {
                if (!result.RevenueTrend.Any(x => x.Date == current))
                {
                    result.RevenueTrend.Add(new DailyRevenueDto { Date = current, Revenue = 0, Outstanding = 0 });
                }
                current = current.AddDays(1);
            }
            result.RevenueTrend = result.RevenueTrend.OrderBy(x => x.Date).ToList();

            // Payment Breakdown
            result.PaymentBreakdown = payments
                .GroupBy(p => p.PaymentMode)
                .Select(g => new PaymentModeBreakdownDto
                {
                    Mode = g.Key,
                    TotalAmount = g.Sum(p => p.Amount)
                }).ToList();

            // Doctor Revenue
            result.DoctorRevenues = invoices
                .Select(i => new {
                    DoctorId = i.DoctorId ?? i.Token?.Queue?.DoctorId ?? Guid.Empty,
                    DoctorName = i.Doctor?.Name ?? i.Token?.Queue?.Doctor?.Name ?? "Unknown",
                    PaidAmount = i.PaidAmount
                })
                .Where(x => x.DoctorId != Guid.Empty)
                .GroupBy(x => new { x.DoctorId, x.DoctorName })
                .Select(g => new DoctorRevenueDto
                {
                    DoctorId = g.Key.DoctorId,
                    DoctorName = g.Key.DoctorName,
                    TotalRevenue = g.Sum(x => x.PaidAmount)
                })
                .OrderByDescending(x => x.TotalRevenue)
                .ToList();

            // Service Revenue
            result.ServiceRevenues = invoices
                .SelectMany(i => i.Items)
                .Where(x => !x.IsDeleted)
                .GroupBy(x => x.ItemName)
                .Select(g => new ServiceRevenueDto
                {
                    ServiceName = string.IsNullOrWhiteSpace(g.Key) ? "Unknown Service" : g.Key,
                    TotalAmount = g.Sum(x => x.TotalPrice)
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToList();

            // Outstanding Receivables
            result.PatientOutstanding = invoices
                .Where(i => i.TotalAmount - i.PaidAmount > 0)
                .GroupBy(i => new { i.PatientId, i.Patient.Name })
                .Select(g => new PatientOutstandingDto
                {
                    PatientId = g.Key.PatientId,
                    PatientName = g.Key.Name,
                    OutstandingAmount = g.Sum(i => i.TotalAmount - i.PaidAmount)
                })
                .OrderByDescending(x => x.OutstandingAmount)
                .Take(10)
                .ToList();

            return result;
        }
    }
}
