using CodeX.Application.Features.Doctors.Commands.CreateDoctor;
using CodeX.Application.Features.Doctors.Commands.UpdateDoctor;
using CodeX.Application.Features.Doctors.Commands.DeleteDoctor;
using CodeX.Application.Features.Doctors.Queries.GetDoctorsList;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class DoctorsController : BaseApiController
    {
        [HttpPost]
        public async Task<ActionResult<Guid>> Create(CreateDoctorCommand command)
        {
            try
            {
                return await Mediator.Send(command);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{branchId}")]
        public async Task<ActionResult<List<DoctorDto>>> GetByBranch(Guid branchId)
        {
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
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await Mediator.Send(new DeleteDoctorCommand(id));
            return NoContent();
        }
    }
}
