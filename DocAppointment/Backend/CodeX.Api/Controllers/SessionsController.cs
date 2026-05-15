using CodeX.Application.Features.Sessions.Commands.CreateSession;
using CodeX.Application.Features.Sessions.Commands.DeleteSession;
using CodeX.Application.Features.Sessions.Commands.UpdateSession;
using CodeX.Application.Features.Sessions.Queries.GetSessionsList;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Controllers
{
    public class SessionsController : BaseApiController
    {
        [HttpPost]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        public async Task<ActionResult<Guid>> Create(CreateSessionCommand command)
        {
            try 
            {
                return await Mediator.Send(command);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        [HttpGet("doctor/{doctorId}")]
        public async Task<ActionResult<List<SessionDto>>> GetByDoctor(Guid doctorId, [FromQuery] Guid? branchId)
        {
            return await Mediator.Send(new GetSessionsListQuery(doctorId, branchId));
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        public async Task<IActionResult> Update(Guid id, UpdateSessionCommand command)
        {
            if (id != command.Id) return BadRequest();
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteSessionCommand(id));
            return NoContent();
        }
    }
}
