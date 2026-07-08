using CodeX.Application.Features.Tokens.Commands.CreateToken;
using CodeX.Application.Features.Tokens.Commands.UpdateToken;
using CodeX.Application.Features.Tokens.Commands.DeleteToken;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeX.Api.Authorization;
using CodeX.Domain.Constants;

namespace CodeX.Api.Controllers
{
    public class TokensController : BaseApiController
    {
        private readonly CodeX.Application.Common.Interfaces.IApplicationDbContext _context;
        private readonly CodeX.Application.Common.Interfaces.ICurrentUserService _currentUserService;

        public TokensController(CodeX.Application.Common.Interfaces.IApplicationDbContext context, CodeX.Application.Common.Interfaces.ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpPost]
        [HasPermission(SystemPermissions.Queue.AddPatient)]
        public async Task<ActionResult<CreateTokenResult>> Create(CreateTokenCommand command)
        {
            try
            {
                var queue = await _context.DailyQueues.Include(q => q.Branch).FirstOrDefaultAsync(q => q.Id == command.QueueId);
                if (queue == null) return NotFound("Queue not found");

                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, queue.Branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, queue.BranchId);

                return await Mediator.Send(command);
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[TOKENS_ERROR] {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"[INNER] {ex.InnerException.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [HasPermission($"{SystemPermissions.Queue.EditPatient},{SystemPermissions.DoctorDesk.EditPatient}")]
        public async Task<ActionResult<bool>> Update(Guid id, UpdateTokenCommand command)
        {
            try
            {
                if (id != command.TokenId) return BadRequest();
                var token = await _context.Tokens.Include(t => t.Queue).ThenInclude(q => q.Branch).FirstOrDefaultAsync(t => t.Id == id);
                if (token == null) return NotFound("Token not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, token.Queue.Branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, token.Queue.BranchId);

                return await Mediator.Send(command);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [HasPermission($"{SystemPermissions.Queue.CancelToken},{SystemPermissions.DoctorDesk.CancelToken}")]
        public async Task<ActionResult<bool>> Delete(Guid id, [FromQuery] bool deleteOfflinePatient = false)
        {
            try
            {
                var token = await _context.Tokens.Include(t => t.Queue).ThenInclude(q => q.Branch).FirstOrDefaultAsync(t => t.Id == id);
                if (token == null) return NotFound("Token not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, token.Queue.Branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, token.Queue.BranchId);

                return await Mediator.Send(new DeleteTokenCommand(id, deleteOfflinePatient));
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id}/requeue")]
        [HasPermission($"{SystemPermissions.Queue.RestoreToken},{SystemPermissions.DoctorDesk.RestoreToken}")]
        public async Task<ActionResult<bool>> Requeue(Guid id)
        {
            try
            {
                var token = await _context.Tokens.Include(t => t.Queue).ThenInclude(q => q.Branch).FirstOrDefaultAsync(t => t.Id == id);
                if (token == null) return NotFound("Token not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, token.Queue.Branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, token.Queue.BranchId);

                return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.RequeueToken.RequeueTokenCommand(id));
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
