using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Reports.Queries.GetDoctorRevenueReport
{
    public class GetDoctorRevenueReportQuery : IRequest<DoctorRevenueReportDto>
    {
        public Guid OrganizationId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? DoctorId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class GetDoctorRevenueReportQueryHandler : IRequestHandler<GetDoctorRevenueReportQuery, DoctorRevenueReportDto>
    {
        private readonly IApplicationDbContext _context;

        public GetDoctorRevenueReportQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<DoctorRevenueReportDto> Handle(GetDoctorRevenueReportQuery request, CancellationToken cancellationToken)
        {
            // Use Payments as the source of truth (same as DCR) for consistency
            var query = _context.Payments
                .Include(p => p.Invoice)
                .ThenInclude(i => i.Patient)
                .Include(p => p.Invoice)
                .ThenInclude(i => i.Doctor)
                .Where(p => p.OrganizationId == request.OrganizationId 
                            && p.PaymentDate >= request.StartDate 
                            && p.PaymentDate <= request.EndDate);

            if (request.BranchId.HasValue)
            {
                query = query.Where(p => p.Invoice.BranchId == request.BranchId.Value);
            }
            if (request.DoctorId.HasValue)
            {
                query = query.Where(p => p.Invoice.DoctorId == request.DoctorId.Value);
            }

            var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync(cancellationToken);

            // Group by Doctor for summary
            var grouped = payments
                .GroupBy(p => new { 
                    DoctorId = p.Invoice.DoctorId, 
                    DoctorName = p.Invoice.Doctor != null ? p.Invoice.Doctor.Name : "No Doctor Assigned" 
                });

            var dto = new DoctorRevenueReportDto
            {
                TotalRevenueGenerated = payments.Sum(p => p.Invoice.TotalAmount),
                TotalRevenueCollected = payments.Sum(p => p.Amount),
                TotalDiscountsGiven = payments.Sum(p => p.Invoice.DiscountAmount),
                DetailedRows = payments.Select(p => new DoctorRevenueReportRowDto
                {
                    InvoiceId = p.InvoiceId,
                    InvoiceNumber = p.Invoice.InvoiceNumber,
                    PatientName = p.Invoice.Patient.Name,
                    DoctorName = p.Invoice.Doctor != null ? p.Invoice.Doctor.Name : "No Doctor",
                    Date = p.PaymentDate,
                    TotalAmount = p.Invoice.TotalAmount,
                    PaidAmount = p.Amount,
                    Status = p.Invoice.Status.ToString()
                }).ToList()
            };

            return dto;
        }
    }
}
