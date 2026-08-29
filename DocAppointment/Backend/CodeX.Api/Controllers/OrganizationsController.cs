using CodeX.Application.Features.Organizations.Commands.RegisterOrganization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class OrganizationsController : BaseApiController
    {
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<Guid>> Register(RegisterOrganizationCommand command)
        {
            return await Mediator.Send(command);
        }

        [AllowAnonymous] // Ideally secured via an API Key or internal network policy in production
        [HttpPost("provision")]
        public async Task<ActionResult<Guid>> Provision(CodeX.Application.Features.Organizations.Commands.ProvisionTenant.ProvisionTenantCommand command)
        {
            return await Mediator.Send(command);
        }
    }
}
