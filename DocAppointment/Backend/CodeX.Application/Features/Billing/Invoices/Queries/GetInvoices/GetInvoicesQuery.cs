using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Models;
using System.Linq;

namespace CodeX.Application.Features.Billing.Invoices.Queries.GetInvoices
{
    public record GetInvoicesQuery(
        Guid OrganizationId, 
        Guid BranchId, 
        DateTime StartDate, 
        DateTime EndDate,
        string? SearchTerm = null,
        int Page = 1,
        int PageSize = 10
    ) : IRequest<PaginatedList<InvoiceListDto>>;

    public class InvoiceListDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string PatientCode { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public InvoiceStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> PaymentModes { get; set; } = new();
        
        // New Fields
        public string? TokenReferenceId { get; set; }
        public DateTime? BookingDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? DoctorName { get; set; }
    }

    public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, PaginatedList<InvoiceListDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetInvoicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<PaginatedList<InvoiceListDto>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var query = _context.Invoices
                .Include(x => x.Patient)
                .Include(x => x.Token)
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
                query = query.Where(x => 
                    x.InvoiceNumber.ToLower().Contains(search) || 
                    x.Patient.Name.ToLower().Contains(search) ||
                    (x.Token != null && x.Token.Id.ToString().ToLower().Contains(search)) ||
                    (x.Doctor != null && x.Doctor.Name.ToLower().Contains(search))
                );
            }

            var count = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderByDescending(x => x.Token != null ? x.Token.BookedAt : x.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync(cancellationToken);
            
            // Re-sort in memory to include PaymentDate as a secondary sort if requested
            items = items.OrderByDescending(x => x.Token != null ? x.Token.BookedAt : x.CreatedAt)
                         .ThenByDescending(x => x.Payments.Where(p => !p.IsDeleted).Max(p => (DateTime?)p.PaymentDate) ?? DateTime.MinValue)
                         .ToList();

            var dtoItems = items.Select(x => new InvoiceListDto
            {
                Id = x.Id,
                InvoiceNumber = x.InvoiceNumber,
                PatientName = x.Patient.Name,
                PatientCode = x.Patient.PatientCode ?? "",
                TotalAmount = x.TotalAmount,
                PaidAmount = x.PaidAmount,
                Status = x.Status,
                CreatedAt = x.CreatedAt,
                PaymentModes = x.Payments.Where(p => !p.IsDeleted).Select(p => p.PaymentMode.ToString()).Distinct().ToList(),
                TokenReferenceId = x.Token != null ? "CX-" + x.Token.Id.ToString().Substring(0, 6).ToUpper() : null,
                BookingDate = x.Token != null ? x.Token.BookedAt : null,
                DoctorName = x.Doctor != null ? x.Doctor.Name : null,
                PaymentDate = x.Payments.Where(p => !p.IsDeleted).OrderByDescending(p => p.PaymentDate).Select(p => (DateTime?)p.PaymentDate).FirstOrDefault()
            }).ToList();

            return new PaginatedList<InvoiceListDto>(dtoItems, count, request.Page, request.PageSize);
        }
    }
}
