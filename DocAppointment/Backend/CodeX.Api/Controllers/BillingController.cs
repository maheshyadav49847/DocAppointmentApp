using CodeX.Application.Features.Billing.Services.Commands.CreateService;
using CodeX.Application.Features.Billing.Services.Commands.UpdateService;
using CodeX.Application.Features.Billing.Services.Commands.DeleteService;
using CodeX.Application.Features.Billing.Services.Queries.GetServices;
using CodeX.Application.Features.Billing.Invoices.Commands.CreateInvoice;
using CodeX.Application.Features.Billing.Invoices.Commands.PayInvoice;
using CodeX.Application.Features.Billing.Invoices.Queries.GetInvoices;
using CodeX.Application.Features.Billing.Invoices.Queries.GetInvoiceById;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CodeX.Application.Features.Billing.Invoices.Commands.CancelInvoice;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class BillingController : BaseApiController
    {
        [HttpGet("services/{organizationId}")]
        public async Task<ActionResult<List<ServiceItemDto>>> GetServices(Guid organizationId)
        {
            return await Mediator.Send(new GetServicesQuery(organizationId));
        }

        [HttpPost("services")]
        public async Task<ActionResult<Guid>> CreateService([FromBody] CreateServiceCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPut("services/{id}")]
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
        public async Task<ActionResult> DeleteService(Guid id)
        {
            await Mediator.Send(new DeleteServiceCommand(id));
            return NoContent();
        }

        [HttpGet("invoices")]
        public async Task<ActionResult<List<InvoiceListDto>>> GetInvoices([FromQuery] Guid organizationId, [FromQuery] Guid branchId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            return await Mediator.Send(new GetInvoicesQuery(organizationId, branchId, startDate, endDate));
        }

        
        [HttpGet("invoices/{id}")]
        public async Task<ActionResult<InvoiceDetailDto>> GetInvoiceById(Guid id, [FromQuery] Guid organizationId)
        {
            return await Mediator.Send(new GetInvoiceByIdQuery(id, organizationId));
        }

        [HttpPost("invoices")]
        public async Task<ActionResult<Guid>> CreateInvoice([FromBody] CreateInvoiceCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPost("invoices/pay")]
        public async Task<ActionResult> PayInvoice([FromBody] PayInvoiceCommand command)
        {
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpPost("invoices/{id}/cancel")]
        public async Task<ActionResult<bool>> CancelInvoice(Guid id, [FromBody] CancelInvoiceRequest request)
        {
            return await Mediator.Send(new CancelInvoiceCommand(id, request.OrganizationId));
        }
    }

    public class CancelInvoiceRequest
    {
        public Guid OrganizationId { get; set; }
    }
}