using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Authorization;

namespace CodeX.Application.Features.Billing.Invoices.Commands.PayInvoice
{
    public record PayInvoiceCommand : IRequest<Unit>
    {
        public Guid InvoiceId { get; init; }
        public Guid OrganizationId { get; init; }
        public decimal Amount { get; init; }
        public PaymentMode PaymentMode { get; init; }
        public string? TransactionId { get; init; }
    }

    public class PayInvoiceCommandHandler : IRequestHandler<PayInvoiceCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public PayInvoiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(PayInvoiceCommand request, CancellationToken cancellationToken)
        {
            var invoice = await _context.Invoices.FindAsync(new object[] { request.InvoiceId }, cancellationToken);

            if (invoice == null || invoice.IsDeleted)
            {
                throw new KeyNotFoundException($"Invoice with id {request.InvoiceId} not found");
            }
            
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, invoice.OrganizationId);
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var payment = new Payment
            {
                OrganizationId = request.OrganizationId,
                InvoiceId = request.InvoiceId,
                Amount = request.Amount,
                PaymentMode = request.PaymentMode,
                TransactionId = request.TransactionId,
                PaymentDate = DateTime.UtcNow,
                IsActive = true
            };

            _context.Payments.Add(payment);

            // Update Invoice Paid Amount
            invoice.PaidAmount += request.Amount;
            
            // Update Status
            if (invoice.PaidAmount >= invoice.TotalAmount)
            {
                invoice.Status = InvoiceStatus.Paid;
            }
            else if (invoice.PaidAmount > 0)
            {
                invoice.Status = InvoiceStatus.Partial;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
