using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Authorize]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/whatsapp/messages")]
    public class WhatsAppMessagesController : ControllerBase
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly CodeX.Application.Common.Interfaces.IApplicationDbContext _context;

        public WhatsAppMessagesController(ICurrentUserService currentUserService, CodeX.Application.Common.Interfaces.IApplicationDbContext context)
        {
            _currentUserService = currentUserService;
            _context = context;
        }

        private async Task EnsureBranchAccess(string branchId)
        {
            if (Guid.TryParse(branchId, out var parsedBranchId))
            {
                var branch = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(_context.Branches, b => b.Id == parsedBranchId);
                if (branch == null) throw new Exception("Branch not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, parsedBranchId);
            }
            else
            {
                throw new Exception("Invalid branch ID");
            }
        }

        [HttpPost("send/{branchId}")]
        public async Task<IActionResult> Send(string branchId, [FromBody] SendMessageRequest body, [FromServices] IWhatsAppService whatsAppService)
        {
            try
            {
                await EnsureBranchAccess(branchId);
                var branchGuid = Guid.Parse(branchId);
                var message = body.Message ?? body.Text ?? string.Empty;

                if (!string.IsNullOrEmpty(body.FileBase64))
                {
                    await whatsAppService.SendDocumentMessage(body.To, message, body.FileName ?? "document.pdf", body.FileBase64, branchGuid);
                }
                else
                {
                    await whatsAppService.SendTextMessage(body.To, message, branchGuid);
                }

                return Ok(new { success = true, message = "Message queued/sent successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.ToString() });
            }
        }
    }

    public class SendMessageRequest
    {
        public string To { get; set; } = string.Empty;
        public string? Text { get; set; }
        public string? Message { get; set; }
        public string? FileBase64 { get; set; }
        public string? FileName { get; set; }
    }
}
