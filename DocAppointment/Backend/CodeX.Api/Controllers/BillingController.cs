using CodeX.Application.Features.Billing.Services.Commands.CreateService;
using CodeX.Application.Features.Billing.Services.Commands.UpdateService;
using CodeX.Application.Features.Billing.Services.Commands.DeleteService;
using CodeX.Application.Features.Billing.Services.Queries.GetServices;
using CodeX.Application.Features.Billing.Invoices.Commands.CreateInvoice;
using CodeX.Application.Features.Billing.Invoices.Commands.PayInvoice;
using CodeX.Application.Features.Billing.Invoices.Queries.GetInvoices;
using CodeX.Application.Features.Billing.Invoices.Queries.GetPendingBills;
using CodeX.Application.Features.Billing.Invoices.Queries.GetInvoiceById;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Features.Billing.Invoices.Commands.CancelInvoice;
using CodeX.Api.Authorization;
using CodeX.Domain.Constants;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    public class BillingController : BaseApiController
    {
        private readonly CodeX.Application.Common.Interfaces.IQueueNotificationService? _notificationService;
        private readonly CodeX.Application.Common.Interfaces.IApplicationDbContext _context;

        public BillingController(
            CodeX.Application.Common.Interfaces.IApplicationDbContext context,
            CodeX.Application.Common.Interfaces.IQueueNotificationService? notificationService = null)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet("services")]
        [HasPermission(SystemPermissions.Billing.View)]
        public async Task<ActionResult<CodeX.Application.Common.Models.PaginatedList<ServiceItemDto>>> GetServices([FromQuery] GetServicesQuery query)
        {
            return await Mediator.Send(query);
        }

        [HttpGet("services/export")]
        [HasPermission(SystemPermissions.Billing.Export)]
        public async Task<FileResult> ExportServices([FromQuery] CodeX.Application.Features.Billing.Services.Queries.ExportServices.ExportServicesQuery query)
        {
            var fileBytes = await Mediator.Send(query);
            return File(fileBytes, "text/csv", $"RateList_Export_{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        [HttpPost("services")]
        [HasPermission(SystemPermissions.Billing.ManageRateList)]
        public async Task<ActionResult<Guid>> CreateService([FromBody] CreateServiceCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPut("services/{id}")]
        [HasPermission(SystemPermissions.Billing.ManageRateList)]
        public async Task<ActionResult> UpdateService(Guid id, [FromBody] UpdateServiceCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest();
            }
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("services/{id}")]
        [HasPermission(SystemPermissions.Billing.ManageRateList)]
        public async Task<ActionResult> DeleteService(Guid id)
        {
            await Mediator.Send(new DeleteServiceCommand(id));
            return NoContent();
        }

        [HttpGet("pending-bills")]
        [HasPermission(SystemPermissions.Billing.View)]
        public async Task<ActionResult<CodeX.Application.Common.Models.PaginatedList<PendingBillDto>>> GetPendingBills(
            [FromQuery] Guid branchId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            return await Mediator.Send(new GetPendingBillsQuery(branchId, startDate, endDate, search, page, pageSize));
        }

        [HttpGet("invoices")]
        [HasPermission(SystemPermissions.Billing.View)]
        public async Task<ActionResult<CodeX.Application.Common.Models.PaginatedList<InvoiceListDto>>> GetInvoices(
            [FromQuery] Guid organizationId, 
            [FromQuery] Guid branchId, 
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            return await Mediator.Send(new GetInvoicesQuery(organizationId, branchId, startDate, endDate, search, page, pageSize));
        }

        [HttpGet("invoices/export")]
        [HasPermission(SystemPermissions.Billing.Export)]
        public async Task<IActionResult> ExportInvoices(
            [FromQuery] Guid organizationId,
            [FromQuery] Guid branchId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string? search = null)
        {
            var csvBytes = await Mediator.Send(new CodeX.Application.Features.Billing.Invoices.Queries.ExportInvoices.ExportInvoicesQuery(organizationId, branchId, startDate, endDate, search));
            return File(csvBytes, "text/csv", $"invoices_{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
        }

        
        [HttpGet("invoices/{id}")]
        [HasPermission(SystemPermissions.Billing.View)]
        public async Task<ActionResult<InvoiceDetailDto>> GetInvoiceById(Guid id, [FromQuery] Guid organizationId)
        {
            return await Mediator.Send(new GetInvoiceByIdQuery(id, organizationId));
        }

        [HttpPost("invoices")]
        [HasPermission(SystemPermissions.Billing.CreateInvoice)]
        public async Task<ActionResult<Guid>> CreateInvoice([FromBody] CreateInvoiceCommand command)
        {
            var result = await Mediator.Send(command);
            try
            {
                if (_notificationService != null)
                {
                    await _notificationService.NotifyInvoiceUpdated(command.BranchId, result, "INV-NEW", "Created");
                    if (command.TokenId.HasValue && command.TokenId.Value != Guid.Empty)
                    {
                        var tok = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                            _context.Tokens.AsNoTracking(), t => t.Id == command.TokenId.Value);
                        if (tok != null)
                        {
                            await _notificationService.NotifyTokenUpdated(command.BranchId, tok.QueueId, tok.TokenNumber);
                        }
                    }
                }
            }
            catch { }
            return result;
        }

        [HttpPost("invoices/pay")]
        [HasPermission(SystemPermissions.Billing.RecordPayment)]
        public async Task<ActionResult> PayInvoice([FromBody] PayInvoiceCommand command)
        {
            await Mediator.Send(command);
            try
            {
                if (_notificationService != null)
                {
                    var inv = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                        _context.Invoices.AsNoTracking(), i => i.Id == command.InvoiceId);
                    var bId = inv?.BranchId ?? Guid.Empty;
                    await _notificationService.NotifyInvoiceUpdated(bId, command.InvoiceId, inv?.InvoiceNumber ?? "INV-PAID", "Paid");

                    if (inv?.TokenId.HasValue == true && inv.TokenId.Value != Guid.Empty)
                    {
                        var tok = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                            _context.Tokens.AsNoTracking(), t => t.Id == inv.TokenId.Value);
                        if (tok != null)
                        {
                            await _notificationService.NotifyTokenUpdated(bId, tok.QueueId, tok.TokenNumber);
                        }
                    }
                }
            }
            catch { }
            return NoContent();
        }

        [HttpPost("invoices/{id}/cancel")]
        [HasPermission(SystemPermissions.Billing.CancelInvoice)]
        public async Task<ActionResult<bool>> CancelInvoice(Guid id, [FromBody] CancelInvoiceRequest request)
        {
            var result = await Mediator.Send(new CancelInvoiceCommand(id, request.OrganizationId));
            try
            {
                if (_notificationService != null)
                {
                    var inv = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                        _context.Invoices.AsNoTracking(), i => i.Id == id);
                    var bId = inv?.BranchId ?? Guid.Empty;
                    await _notificationService.NotifyInvoiceUpdated(bId, id, inv?.InvoiceNumber ?? "INV-CANCELLED", "Cancelled");

                    if (inv?.TokenId.HasValue == true && inv.TokenId.Value != Guid.Empty)
                    {
                        var tok = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                            _context.Tokens.AsNoTracking(), t => t.Id == inv.TokenId.Value);
                        if (tok != null)
                        {
                            await _notificationService.NotifyTokenUpdated(bId, tok.QueueId, tok.TokenNumber);
                        }
                    }
                }
            }
            catch { }
            return result;
        }
    }

    public class CancelInvoiceRequest
    {
        public Guid OrganizationId { get; set; }
    }
}