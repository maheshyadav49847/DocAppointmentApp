using System.Threading.Tasks;
using CodeX.Application.Features.Onboarding.Commands;
using CodeX.Application.Features.Onboarding.DTOs;
using CodeX.Application.Features.Onboarding.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class OnboardingController : BaseApiController
    {
        [HttpGet("status")]
        public async Task<ActionResult<OnboardingStatusDto>> GetStatus()
        {
            var result = await Mediator.Send(new GetOnboardingStatusQuery());
            return Ok(result);
        }

        [HttpPost("setup")]
        public async Task<ActionResult<CompleteOnboardingSetupResult>> CompleteSetup([FromBody] CompleteOnboardingSetupCommand command)
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }
    }
}
