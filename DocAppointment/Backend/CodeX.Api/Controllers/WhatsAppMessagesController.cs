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

        [HttpGet("{patientId}/download")]
        [HasPermission(SystemPermissions.Patients.View)]
        public async Task<IActionResult> DownloadChatHistory(Guid patientId)
        {
            try
            {
                var patient = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(_context.Patients, p => p.Id == patientId);
                if (patient == null) return NotFound("Patient not found");

                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, patient.OrganizationId);

                var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(patient.Phone);

                var messages = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
                    System.Linq.Queryable.OrderBy(
                        System.Linq.Queryable.Where(_context.MessageLogs, m => m.RecipientPhone == normalizedPhone),
                        m => m.CreatedAt
                    )
                );

                var sb = new System.Text.StringBuilder();
                sb.AppendLine($"WhatsApp Chat History - {patient.Name} ({patient.Phone})");
                sb.AppendLine($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");
                sb.AppendLine(new string('-', 50));

                foreach (var msg in messages)
                {
                    var direction = msg.MessageType == "IncomingWhatsApp" ? "Patient -> Clinic" : "Clinic -> Patient";
                    sb.AppendLine($"[{msg.CreatedAt:yyyy-MM-dd HH:mm:ss}] {direction}");
                    sb.AppendLine($"Type: {msg.MessageType} | Status: {msg.Status}");
                    if (!string.IsNullOrEmpty(msg.MessageBody))
                    {
                        sb.AppendLine($"Message: {msg.MessageBody}");
                    }
                    if (!string.IsNullOrEmpty(msg.ErrorMessage))
                    {
                        sb.AppendLine($"Error: {msg.ErrorMessage}");
                    }
                    sb.AppendLine(new string('-', 50));
                }

                var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
                return File(bytes, "text/plain", $"WhatsApp_Chat_{patient.Name.Replace(" ", "_")}_{DateTime.Now:yyyyMMdd}.txt");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
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
