using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Authorization;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Exceptions;
using System.Collections.Generic;

namespace CodeX.Application.Features.Billing.Invoices.Commands.CancelInvoice
{
    public record CancelInvoiceCommand(Guid InvoiceId, Guid OrganizationId) : IRequest<bool>;

    public class CancelInvoiceCommandHandler : IRequestHandler<CancelInvoiceCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CancelInvoiceCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(CancelInvoiceCommand request, CancellationToken cancellationToken)
        {
            ResourceAuthorization.EnsureOrgOwnership(_currentUserService, request.OrganizationId);

            var invoice = await _context.Invoices
                .FirstOrDefaultAsync(i => i.Id == request.InvoiceId && i.OrganizationId == request.OrganizationId, cancellationToken);

            if (invoice == null)
            {
                throw new KeyNotFoundException("Invoice not found");
            }

            if (invoice.PaidAmount > 0)
            {
                throw new ValidationException(new Dictionary<string, string[]> { { "Status", new[] { "Cannot cancel an invoice that has been partially or fully paid." } } });
            }

            if (invoice.Status == InvoiceStatus.Cancelled)
            {
                return true; // Already cancelled
            }

            invoice.Status = InvoiceStatus.Cancelled;
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
