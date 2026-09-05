using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Reports.Queries.GetOutstandingDuesReport
{
    public class GetOutstandingDuesReportQuery : IRequest<OutstandingDuesReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
    }

    public class GetOutstandingDuesReportQueryHandler : IRequestHandler<GetOutstandingDuesReportQuery, OutstandingDuesReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetOutstandingDuesReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<OutstandingDuesReportDto> Handle(GetOutstandingDuesReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Invoices
                .Include(i => i.Patient)
                .Where(i => i.OrganizationId == request.OrganizationId 
                            && i.Status != InvoiceStatus.Paid
                            && i.TotalAmount > i.PaidAmount);

            if (request.BranchId.HasValue)
            {
                query = query.Where(i => i.BranchId == request.BranchId.Value);
            }

            var outstandingInvoices = await query.OrderBy(i => i.CreatedAt).ToListAsync(cancellationToken);

            var rows = outstandingInvoices.Select(i => new OutstandingDuesReportRowDto
            {
                InvoiceId = i.Id,
                InvoiceNumber = i.InvoiceNumber,
                PatientName = i.Patient.Name,
                PatientPhone = i.Patient.Phone,
                Date = i.CreatedAt,
                TotalAmount = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                PendingAmount = i.TotalAmount - i.PaidAmount,
                DaysOverdue = (DateTime.UtcNow - i.CreatedAt).Days
            }).ToList();

            return new OutstandingDuesReportDto
            {
                TotalOutstandingAmount = rows.Sum(r => r.PendingAmount),
                TotalOutstandingInvoices = rows.Count,
                DetailedRows = rows.OrderByDescending(r => r.PendingAmount).ToList()
            };
        }
    }
}
