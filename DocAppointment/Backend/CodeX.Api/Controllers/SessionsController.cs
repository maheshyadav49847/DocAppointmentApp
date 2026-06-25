using CodeX.Application.Features.Sessions.Commands.CreateSession;
using CodeX.Application.Features.Sessions.Commands.DeleteSession;
using CodeX.Application.Features.Sessions.Commands.UpdateSession;
using CodeX.Application.Features.Sessions.Queries.GetSessionsList;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CodeX.Api.Authorization;
using CodeX.Domain.Constants;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class SessionsController : BaseApiController
    {
        private readonly CodeX.Application.Common.Interfaces.ICurrentUserService _currentUserService;

        public SessionsController(CodeX.Application.Common.Interfaces.ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }
        [HttpPost]
        [HasPermission(SystemPermissions.Sessions.Add)]
        public async Task<ActionResult<Guid>> Create(CreateSessionCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Sessions.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("doctors")]
        [HasPermission(SystemPermissions.Sessions.View)]
        public async Task<ActionResult<List<CodeX.Application.Features.Doctors.Queries.GetDoctorsList.DoctorDto>>> GetDoctors([FromQuery] Guid? branchId)
        {
            var effectiveBranchId = branchId ?? _currentUserService.BranchId ?? Guid.Empty;
            return await Mediator.Send(new CodeX.Application.Features.Doctors.Queries.GetDoctorsList.GetDoctorsListQuery(effectiveBranchId));
        }

        [HttpGet("doctor/{doctorId}")]
        [HasPermission(SystemPermissions.Sessions.View)]
        public async Task<ActionResult<List<SessionDto>>> GetByDoctor(Guid doctorId, [FromQuery] Guid? branchId)
        {
            return await Mediator.Send(new GetSessionsListQuery(doctorId, branchId));
        }

        [HttpPut("{id}")]
        [HasPermission(SystemPermissions.Sessions.Edit)]
        public async Task<IActionResult> Update(Guid id, UpdateSessionCommand command)
        {
            if (id != command.Id) return BadRequest();
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Sessions.Delete)]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteSessionCommand(id));
            return NoContent();
        }
    }
}
