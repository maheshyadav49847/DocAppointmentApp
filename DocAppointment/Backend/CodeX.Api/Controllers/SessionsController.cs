using CodeX.Application.Features.Sessions.Commands.CreateSession;
using CodeX.Application.Features.Sessions.Commands.DeleteSession;
using CodeX.Application.Features.Sessions.Commands.UpdateSession;
using CodeX.Application.Features.Sessions.Queries.GetSessionsList;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class SessionsController : BaseApiController
    {
        [HttpPost]
        public async Task<ActionResult<Guid>> Create(CreateSessionCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpGet("doctor/{doctorId}")]
        public async Task<ActionResult<List<SessionDto>>> GetByDoctor(Guid doctorId)
        {
            return await Mediator.Send(new GetSessionsListQuery(doctorId));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateSessionCommand command)
        {
            if (id != command.Id) return BadRequest();
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteSessionCommand(id));
            return NoContent();
        }
    }
}
