using CodeX.Application.Features.Tokens.Commands.CreateToken;
using CodeX.Application.Features.Tokens.Commands.UpdateToken;
using CodeX.Application.Features.Tokens.Commands.DeleteToken;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class TokensController : BaseApiController
    {
        [HttpPost]
        public async Task<ActionResult<CreateTokenResult>> Create(CreateTokenCommand command)
        {
            try
            {
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
        public async Task<ActionResult<bool>> Update(Guid id, UpdateTokenCommand command)
        {
            if (id != command.TokenId) return BadRequest();
            try
            {
                return await Mediator.Send(command);
            }
            catch (System.Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<bool>> Delete(Guid id)
        {
            return await Mediator.Send(new DeleteTokenCommand(id));
        }

        [HttpPost("{id}/requeue")]
        public async Task<ActionResult<bool>> Requeue(Guid id)
        {
            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.RequeueToken.RequeueTokenCommand(id));
        }
    }
}
