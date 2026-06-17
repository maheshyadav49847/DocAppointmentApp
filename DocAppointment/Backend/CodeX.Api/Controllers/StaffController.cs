using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Staff.Commands.CreateStaff;
using CodeX.Application.Features.Staff.Commands.DeleteStaff;
using CodeX.Application.Features.Staff.Commands.UpdateStaff;
using CodeX.Application.Features.Staff.Queries.GetStaffList;
using CodeX.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [Authorize(Roles = $"{nameof(StaffRole.SuperAdmin)},{nameof(StaffRole.OrgAdmin)},{nameof(StaffRole.BranchAdmin)},{nameof(StaffRole.Receptionist)}")]
    public class StaffController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public StaffController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<List<StaffDto>>> Get([FromQuery] Guid? orgId, [FromQuery] Guid? branchId)
        {
            var effectiveOrgId = _currentUserService.IsInRole(nameof(StaffRole.SuperAdmin)) &&
                                 orgId.HasValue &&
                                 orgId.Value != Guid.Empty
                ? orgId.Value
                : _currentUserService.OrgId;

            if (effectiveOrgId == Guid.Empty)
            {
                return Unauthorized(new { message = "Invalid organization context." });
            }

            var effectiveBranchId = branchId;
            
            // Branch-level isolation for BranchAdmin and Receptionist
            if (_currentUserService.IsInRole(nameof(StaffRole.BranchAdmin)) || 
                _currentUserService.IsInRole(nameof(StaffRole.Receptionist)))
            {
                if (!_currentUserService.BranchId.HasValue)
                {
                    return BadRequest(new { message = "Your account is not linked to a branch." });
                }

                if (branchId.HasValue && branchId != _currentUserService.BranchId)
                {
                    return Forbid();
                }

                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetStaffListQuery(effectiveOrgId, effectiveBranchId));
        }

        [HttpPost]
        public async Task<ActionResult<Guid>> Create(CreateStaffCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPut("{id}")]
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
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteStaffCommand(id));
            return NoContent();
        }
    }
}
