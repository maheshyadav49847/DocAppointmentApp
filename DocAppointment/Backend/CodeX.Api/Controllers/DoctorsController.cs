using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Doctors.Commands.CreateDoctor;
using CodeX.Application.Features.Doctors.Commands.DeleteDoctor;
using CodeX.Application.Features.Doctors.Commands.UpdateDoctor;
using CodeX.Application.Features.Doctors.Queries.GetDoctorsList;
using CodeX.Application.Features.Doctors.Queries.GetOrganizationDoctors;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class DoctorsController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DoctorsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Doctors.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpPost]
        [HasPermission(SystemPermissions.Doctors.Add)]
        [CodeX.Api.Filters.CheckSubscriptionLimit(CodeX.Api.Filters.SubscriptionLimitType.Doctors)]
        public async Task<ActionResult<Guid>> Create(CreateDoctorCommand command)
        {
            var finalCommand = command with { OrganizationId = _currentUserService.OrgId };
            return await Mediator.Send(finalCommand);
        }

        [HttpGet]
        [HasPermission(SystemPermissions.Doctors.View)]
        public async Task<ActionResult<List<DoctorDto>>> Get()
        {
            return await Mediator.Send(new GetOrganizationDoctorsQuery(_currentUserService.OrgId));
        }

        [HttpGet("org/{orgId}")]
        [HasPermission(SystemPermissions.Doctors.View)]
        public async Task<ActionResult<List<DoctorDto>>> GetByOrg(Guid orgId)
        {
            if (orgId != _currentUserService.OrgId && _currentUserService.OrgId != Guid.Empty) return Forbid();
            return await Mediator.Send(new GetOrganizationDoctorsQuery(orgId));
        }

        [HttpGet("{branchId}")]
        [HasPermission(SystemPermissions.Doctors.View)]
        public async Task<ActionResult<List<DoctorDto>>> GetByBranch(Guid branchId)
        {
            // Branch Isolation IDOR Protection
            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && _currentUserService.BranchId.Value != branchId)
            {
                return Forbid();
            }

            var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == _currentUserService.OrgId);
            if (!branchExists && _currentUserService.OrgId != Guid.Empty) return Forbid();

            return await Mediator.Send(new GetDoctorsListQuery(branchId));
        }

        [HttpPut("{id}")]
        [HasPermission(SystemPermissions.Doctors.Edit)]
        public async Task<IActionResult> Update(Guid id, UpdateDoctorCommand command)
        {
            if (id != command.Id) return BadRequest();
            await Mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [HasPermission(SystemPermissions.Doctors.Delete)]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteDoctorCommand(id));
            return NoContent();
        }
    }
}
