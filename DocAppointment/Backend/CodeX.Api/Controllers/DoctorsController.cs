using CodeX.Application.Features.Doctors.Commands.CreateDoctor;
using CodeX.Application.Features.Doctors.Commands.UpdateDoctor;
using CodeX.Application.Features.Doctors.Commands.DeleteDoctor;
using CodeX.Application.Features.Doctors.Queries.GetOrganizationDoctors;
using CodeX.Application.Features.Doctors.Queries.GetDoctorsList;
using CodeX.Application.Features.Doctors.Queries.GetOrganizationDoctors;
using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    public class DoctorsController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DoctorsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpPost]
        public async Task<ActionResult<Guid>> Create(CreateDoctorCommand command)
        {
            var finalCommand = command with { OrganizationId = _currentUserService.OrgId };
            try
            {
                return await Mediator.Send(finalCommand);
            }
            catch (System.Exception ex)
            {
                var message = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<List<DoctorDto>>> Get()
        {
            return await Mediator.Send(new GetOrganizationDoctorsQuery(_currentUserService.OrgId));
        }

        [HttpGet("org/{orgId}")]
        public async Task<ActionResult<List<DoctorDto>>> GetByOrg(Guid orgId)
        {
            if (orgId != _currentUserService.OrgId && !_currentUserService.IsInRole("SuperAdmin")) return Forbid();
            return await Mediator.Send(new GetOrganizationDoctorsQuery(orgId));
        }

        [HttpGet("{branchId}")]
        public async Task<ActionResult<List<DoctorDto>>> GetByBranch(Guid branchId)
        {
            // IDOR Protection
            var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == _currentUserService.OrgId);
            if (!branchExists && !_currentUserService.IsInRole("SuperAdmin")) return Forbid();

            return await Mediator.Send(new GetDoctorsListQuery(branchId));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateDoctorCommand command)
        {
            if (id != command.Id) return BadRequest();
            try
            {
                await Mediator.Send(command);
                return NoContent();
            }
            catch (System.Exception ex)
            {
                var message = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try 
            {
                await Mediator.Send(new DeleteDoctorCommand(id));
                return NoContent();
            }
            catch (System.Exception ex)
            {
                var message = ex.InnerException?.Message ?? ex.Message;
                return BadRequest(new { message });
            }
        }
    }
}
