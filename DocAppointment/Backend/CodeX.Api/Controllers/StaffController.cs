using CodeX.Application.Features.Staff.Commands.CreateStaff;
using CodeX.Application.Features.Staff.Commands.DeleteStaff;
using CodeX.Application.Features.Staff.Commands.UpdateStaff;
using CodeX.Application.Features.Staff.Queries.GetStaffList;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class StaffController : BaseApiController
    {
        [HttpGet]
        public async Task<ActionResult<List<StaffDto>>> Get([FromQuery] Guid orgId, [FromQuery] Guid? branchId)
        {
            return await Mediator.Send(new GetStaffListQuery(orgId, branchId));
        }

        [HttpPost]
        public async Task<ActionResult<Guid>> Create(CreateStaffCommand command)
        {
            try
            {
                return await Mediator.Send(command);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateStaffCommand command)
        {
            if (id != command.Id) return BadRequest();
            try
            {
                await Mediator.Send(command);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            try
            {
                await Mediator.Send(new DeleteStaffCommand(id));
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
