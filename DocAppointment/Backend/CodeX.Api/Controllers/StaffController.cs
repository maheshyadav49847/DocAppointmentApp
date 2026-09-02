using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Staff.Commands.CreateStaff;
using CodeX.Application.Features.Staff.Commands.DeleteStaff;
using CodeX.Application.Features.Staff.Commands.UpdateStaff;
using CodeX.Application.Features.Staff.Commands.UnlockStaff;
using CodeX.Application.Features.Staff.Queries.GetStaffList;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class StaffController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public StaffController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [HasPermission(SystemPermissions.Staff.View)]
        public async Task<ActionResult<List<StaffDto>>> Get([FromQuery] Guid? orgId, [FromQuery] Guid? branchId)
        {
            var effectiveOrgId = _currentUserService.OrgId == Guid.Empty &&
                                 orgId.HasValue &&
                                 orgId.Value != Guid.Empty
                ? orgId.Value
                : _currentUserService.OrgId;

            if (effectiveOrgId == Guid.Empty)
            {
                return Unauthorized(new { message = "Invalid organization context." });
            }

            var effectiveBranchId = branchId;

            // Branch-level isolation for branch-specific staff
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetStaffListQuery(effectiveOrgId, effectiveBranchId));
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Staff.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("roles")]
        [HasPermission(SystemPermissions.Staff.View)]
        public async Task<ActionResult<List<CodeX.Application.Features.Roles.Queries.GetRoles.RoleDto>>> GetRoles()
        {
            return await Mediator.Send(new CodeX.Application.Features.Roles.Queries.GetRoles.GetRolesQuery(_currentUserService.OrgId));
        }

        [HttpPost]
        [HasPermission(SystemPermissions.Staff.Add)]
        public async Task<ActionResult<Guid>> Create(CreateStaffCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPut("{id}")]
        [HasPermission(SystemPermissions.Staff.Edit)]
        public async Task<IActionResult> Update(Guid id, UpdateStaffCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest();
            }

            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Staff.Delete)]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteStaffCommand(id));
            return NoContent();
        }

        [HttpPost("{id}/toggle-status")]
        [HasPermission(SystemPermissions.Staff.Edit)]
        public async Task<ActionResult> ToggleStatus(Guid id)
        {
            var newStatus = await Mediator.Send(new CodeX.Application.Features.Staff.Commands.ToggleStaffStatus.ToggleStaffStatusCommand(id));
            return Ok(new { isActive = newStatus });
        }
    }
}
