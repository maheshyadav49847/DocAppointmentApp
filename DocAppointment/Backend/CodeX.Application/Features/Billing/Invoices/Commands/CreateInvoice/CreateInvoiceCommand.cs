using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Authorization;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Billing.Invoices.Commands.CreateInvoice
{
    public class InvoiceItemDto
    {
        public Guid? ServiceItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public bool IsPrescribed { get; set; }
    }

    public record CreateInvoiceCommand : IRequest<Guid>
    {
        public Guid OrganizationId { get; init; }
        public Guid BranchId { get; init; }
        public Guid PatientId { get; init; }
        public Guid? TokenId { get; init; }
        public Guid? DoctorId { get; init; }
        public decimal DiscountAmount { get; init; }
        public decimal TaxAmount { get; init; }
        public string? Notes { get; init; }
        public List<InvoiceItemDto> Items { get; init; } = new();
    }

    public class CreateInvoiceCommandHandler : IRequestHandler<CreateInvoiceCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateInvoiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateInvoiceCommand request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            if (request.TokenId.HasValue && request.TokenId.Value != Guid.Empty)
            {
                var existingActiveInvoice = await _context.Invoices
                    .FirstOrDefaultAsync(i => i.TokenId == request.TokenId && i.Status != InvoiceStatus.Cancelled, cancellationToken);
                
                if (existingActiveInvoice != null)
                {
                    throw new CodeX.Application.Common.Exceptions.ValidationException(new Dictionary<string, string[]> { { "TokenId", new[] { "An active invoice already exists for this token." } } });
                }
            }

            // Calculate totals
            decimal subTotal = 0;
            var invoiceItems = new List<InvoiceItem>();

            foreach (var item in request.Items)
            {
                var lineTotal = item.UnitPrice * item.Quantity;
                subTotal += lineTotal;

                invoiceItems.Add(new InvoiceItem
                {
                    ServiceItemId = item.ServiceItemId,
                    ItemName = item.ItemName,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TotalPrice = lineTotal,
                    IsPrescribed = item.IsPrescribed,
                    IsActive = true
                });
            }

            var totalAmount = subTotal - request.DiscountAmount + request.TaxAmount;
            
            // Generate Invoice Number (Simple format: INV-YYYYMMDD-XXXX)
            var today = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await _context.Invoices
                .Where(i => i.OrganizationId == request.OrganizationId && i.CreatedAt.Date == DateTime.UtcNow.Date)
                .CountAsync(cancellationToken);
            var invoiceNumber = $"INV-{today}-{(countToday + 1):D4}";

            var invoice = new Invoice
            {
                OrganizationId = request.OrganizationId,
                BranchId = request.BranchId,
                InvoiceNumber = invoiceNumber,
                PatientId = request.PatientId,
                TokenId = request.TokenId,
                DoctorId = request.DoctorId,
                SubTotal = subTotal,
                DiscountAmount = request.DiscountAmount,
                TaxAmount = request.TaxAmount,
                TotalAmount = totalAmount,
                PaidAmount = 0,
                Status = InvoiceStatus.Unpaid,
                Notes = request.Notes,
                Items = invoiceItems,
                IsActive = true
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync(cancellationToken);

            return invoice.Id;
        }
    }
}
