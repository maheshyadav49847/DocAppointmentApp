using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Reports.Queries.GetDailyCollectionReport
{
    public class GetDailyCollectionReportQuery : IRequest<DailyCollectionReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetDailyCollectionReportQueryHandler : IRequestHandler<GetDailyCollectionReportQuery, DailyCollectionReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetDailyCollectionReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DailyCollectionReportDto> Handle(GetDailyCollectionReportQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Payments
                .Include(p => p.Invoice)
                .ThenInclude(i => i.Patient)
                .Where(p => p.OrganizationId == request.OrganizationId 
                            && p.PaymentDate >= request.StartDate 
                            && p.PaymentDate <= request.EndDate);

            if (request.BranchId.HasValue)
            {
                query = query.Where(p => p.Invoice.BranchId == request.BranchId.Value);
            }

            var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync(cancellationToken);

            var dto = new DailyCollectionReportDto
            {
                TotalCollection = payments.Sum(p => p.Amount),
                CashCollection = payments.Where(p => p.PaymentMode == PaymentMode.Cash).Sum(p => p.Amount),
                UpiCollection = payments.Where(p => p.PaymentMode == PaymentMode.UPI).Sum(p => p.Amount),
                CardCollection = payments.Where(p => p.PaymentMode == PaymentMode.Card).Sum(p => p.Amount),
                OnlineCollection = payments.Where(p => p.PaymentMode == PaymentMode.Online).Sum(p => p.Amount),
                DetailedRows = payments.Select(p => new DailyCollectionReportRowDto
                {
                    PaymentId = p.Id,
                    InvoiceNumber = p.Invoice.InvoiceNumber,
                    PatientName = p.Invoice.Patient.Name,
                    PaymentDate = p.PaymentDate,
                    Amount = p.Amount,
                    PaymentMode = p.PaymentMode.ToString(),
                    TransactionId = p.TransactionId
                }).ToList()
            };

            return dto;
        }
    }
}
