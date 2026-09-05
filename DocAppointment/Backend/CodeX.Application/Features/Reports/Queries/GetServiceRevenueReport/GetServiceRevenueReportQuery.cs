using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetServiceRevenueReport
{
    public class GetServiceRevenueReportQuery : IRequest<ServiceRevenueReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetServiceRevenueReportQueryHandler : IRequestHandler<GetServiceRevenueReportQuery, ServiceRevenueReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetServiceRevenueReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceRevenueReportDto> Handle(GetServiceRevenueReportQuery request, CancellationToken cancellationToken)
        {
            // Get invoices that have payments in the date range
            var invoiceIds = await _context.Payments
                .Where(p => p.OrganizationId == request.OrganizationId
                            && p.PaymentDate >= request.StartDate
                            && p.PaymentDate <= request.EndDate)
                .Select(p => p.InvoiceId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var query = _context.InvoiceItems
                .Include(i => i.Invoice)
                .Include(i => i.ServiceItem)
                .Where(i => invoiceIds.Contains(i.InvoiceId));

            if (request.BranchId.HasValue)
            {
                query = query.Where(i => i.Invoice.BranchId == request.BranchId.Value);
            }

            var items = await query.ToListAsync(cancellationToken);

            var grouped = items
                .GroupBy(i => i.ServiceItemId != null ? i.ServiceItem!.Name : i.ItemName)
                .Select(g => new ServiceRevenueReportRowDto
                {
                    ServiceName = g.Key,
                    Category = g.FirstOrDefault()?.ServiceItem?.Category ?? "Custom",
                    TotalQuantity = g.Sum(i => i.Quantity),
                    TotalRevenue = g.Sum(i => i.TotalPrice)
                })
                .OrderByDescending(r => r.TotalRevenue)
                .ToList();

            return new ServiceRevenueReportDto
            {
                TotalServiceRevenue = grouped.Sum(r => r.TotalRevenue),
                TotalServicesPerformed = grouped.Sum(r => r.TotalQuantity),
                DetailedRows = grouped
            };
        }
    }
}
