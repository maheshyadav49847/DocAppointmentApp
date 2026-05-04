using CodeX.Application.Features.Organizations.Commands.RegisterOrganization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class OrganizationsController : BaseApiController
    {
        [HttpPost("register")]
        public async Task<ActionResult<Guid>> Register(RegisterOrganizationCommand command)
        {
            return await Mediator.Send(command);
        }
    }
}
