using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Authorization;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Billing.Invoices.Queries.GetInvoices
{
    public record GetInvoicesQuery(Guid OrganizationId, Guid BranchId, DateTime StartDate, DateTime EndDate) : IRequest<List<InvoiceListDto>>;

    public class InvoiceListDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public InvoiceStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, List<InvoiceListDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public GetInvoicesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<List<InvoiceListDto>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            return await _context.Invoices
                .Include(i => i.Patient)
                .Where(x => x.OrganizationId == request.OrganizationId && 
                            x.BranchId == request.BranchId && 
                            x.CreatedAt.Date >= request.StartDate.Date && 
                            x.CreatedAt.Date <= request.EndDate.Date && 
                            !x.IsDeleted)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new InvoiceListDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    PatientName = x.Patient.Name,
                    TotalAmount = x.TotalAmount,
                    PaidAmount = x.PaidAmount,
                    Status = x.Status,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync(cancellationToken);
        }
    }
}
