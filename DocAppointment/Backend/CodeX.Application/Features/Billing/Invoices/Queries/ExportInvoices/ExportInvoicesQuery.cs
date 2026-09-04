using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace CodeX.Application.Features.Billing.Invoices.Queries.ExportInvoices
{
    public record ExportInvoicesQuery(
        Guid OrganizationId,
        Guid BranchId,
        DateTime StartDate,
        DateTime EndDate,
        string? SearchTerm
    ) : IRequest<byte[]>;

    public class ExportInvoicesQueryHandler : IRequestHandler<ExportInvoicesQuery, byte[]>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ExportInvoicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<byte[]> Handle(ExportInvoicesQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.Invoices
                .Include(x => x.Patient)
                .Include(x => x.Token).ThenInclude(t => t.Queue).ThenInclude(q => q.Doctor)
                .Include(x => x.Doctor)
                .Include(x => x.Payments)
                .Where(x => x.OrganizationId == request.OrganizationId && 
                            x.BranchId == request.BranchId && 
                            x.CreatedAt.Date >= request.StartDate.Date && 
                            x.CreatedAt.Date <= request.EndDate.Date && 
                            !x.IsDeleted);

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var search = request.SearchTerm.ToLower();
                var tokenSearch = search.StartsWith("cx-") ? search.Substring(3) : search;
                
                query = query.Where(x => 
                    x.InvoiceNumber.ToLower().Contains(search) || 
                    x.Patient.Name.ToLower().Contains(search) ||
                    (x.Token != null && x.Token.Id.ToString().ToLower().Contains(tokenSearch)) ||
                    (x.Doctor != null && x.Doctor.Name.ToLower().Contains(search)) ||
                    (x.Token != null && x.Token.Queue != null && x.Token.Queue.Doctor != null && x.Token.Queue.Doctor.Name.ToLower().Contains(search))
                );
            }

            var items = await query
                .OrderByDescending(x => x.Token != null ? x.Token.BookedAt : x.CreatedAt)
                .ToListAsync(cancellationToken);
            
            items = items.OrderByDescending(x => x.Token != null ? x.Token.BookedAt : x.CreatedAt)
                         .ThenByDescending(x => x.Payments.Where(p => !p.IsDeleted).Max(p => (DateTime?)p.PaymentDate) ?? DateTime.MinValue)
                         .ToList();

            var csvBuilder = new StringBuilder();
            csvBuilder.AppendLine("Invoice Number,Token Ref ID,Patient Name,Patient Code,Doctor Name,Booking Date,Payment Date,Total Amount,Paid Amount,Status");

            foreach (var x in items)
            {
                var tokenRef = x.Token != null ? "CX-" + x.Token.Id.ToString().Substring(0, 6).ToUpper() : "-";
                var doctorName = x.Doctor != null ? x.Doctor.Name : (x.Token != null && x.Token.Queue != null && x.Token.Queue.Doctor != null ? x.Token.Queue.Doctor.Name : "-");
                var bookingDate = x.Token != null ? x.Token.BookedAt.ToString("yyyy-MM-dd HH:mm") : "-";
                var paymentDate = x.Payments.Where(p => !p.IsDeleted).OrderByDescending(p => p.PaymentDate).Select(p => (DateTime?)p.PaymentDate).FirstOrDefault();
                var paymentDateStr = paymentDate.HasValue ? paymentDate.Value.ToString("yyyy-MM-dd HH:mm") : "-";
                
                // Escape commas for CSV
                var safePatientName = x.Patient.Name?.Replace(",", " ") ?? "";
                var safeDoctorName = doctorName?.Replace(",", " ") ?? "";

                csvBuilder.AppendLine($"{x.InvoiceNumber},{tokenRef},{safePatientName},{x.Patient.PatientCode ?? ""},{safeDoctorName},{bookingDate},{paymentDateStr},{x.TotalAmount},{x.PaidAmount},{x.Status.ToString()}");
            }

            return Encoding.UTF8.GetBytes(csvBuilder.ToString());
        }
    }
}
