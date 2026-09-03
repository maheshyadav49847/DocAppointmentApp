using MediatR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Billing.Invoices.Queries.GetInvoiceById
{
    public record GetInvoiceByIdQuery(Guid Id, Guid OrganizationId) : IRequest<InvoiceDetailDto>;

    public class InvoiceItemDto
    {
        public Guid Id { get; set; }
        public Guid ServiceItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public bool IsPrescribed { get; set; }
    }

    public class InvoiceDetailDto
    {
        public Guid Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public Guid PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientCode { get; set; } = string.Empty;
        public decimal SubTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public InvoiceStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<InvoiceItemDto> Items { get; set; } = new List<InvoiceItemDto>();
    }

    public class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, InvoiceDetailDto>
    {
        private readonly IApplicationDbContext _context;

        public GetInvoiceByIdQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<InvoiceDetailDto> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
        {
            var invoice = await _context.Invoices
                .Include(i => i.Patient)
                .Include(i => i.Items)
                .Where(x => x.Id == request.Id && x.OrganizationId == request.OrganizationId && !x.IsDeleted)
                .FirstOrDefaultAsync(cancellationToken);

            if (invoice == null)
            {
                throw new Exception($"Invoice {request.Id} not found");
            }

            return new InvoiceDetailDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                PatientId = invoice.PatientId,
                PatientName = invoice.Patient.Name,
                PatientCode = invoice.Patient.PatientCode ?? "",
                SubTotal = invoice.SubTotal,
                DiscountAmount = invoice.DiscountAmount,
                TaxAmount = invoice.TaxAmount,
                TotalAmount = invoice.TotalAmount,
                PaidAmount = invoice.PaidAmount,
                Status = invoice.Status,
                CreatedAt = invoice.CreatedAt,
                Items = invoice.Items.Where(i => !i.IsDeleted).Select(i => new InvoiceItemDto
                {
                    Id = i.Id,
                    ServiceItemId = i.ServiceItemId ?? Guid.Empty,
                    ItemName = i.ItemName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    IsPrescribed = i.IsPrescribed
                }).ToList()
            };
        }
    }
}
