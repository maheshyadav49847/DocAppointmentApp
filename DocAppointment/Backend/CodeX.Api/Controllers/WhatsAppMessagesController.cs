using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        private async Task<Guid> ResolveBranchIdAsync(string branchId, string targetPhone)
        {
            if (Guid.TryParse(branchId, out var parsedBranchId) && parsedBranchId != Guid.Empty)
            {
                var branch = await _context.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == parsedBranchId && !b.IsDeleted);
                if (branch != null)
                {
                    CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, branch.OrganizationId);
                    return branch.Id;
                }
            }

            // Fallback 1: User's assigned branch
            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty)
            {
                var userBranch = await _context.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == _currentUserService.BranchId.Value && !b.IsDeleted);
                if (userBranch != null) return userBranch.Id;
            }

            // Fallback 2: Patient's active or latest token queue branch
            if (!string.IsNullOrWhiteSpace(targetPhone))
            {
                var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(targetPhone);
                var patient = await _context.Patients.IgnoreQueryFilters().FirstOrDefaultAsync(p => (p.Phone == targetPhone || p.Phone == normalizedPhone) && !p.IsDeleted);
                if (patient != null)
                {
                    var latestToken = await _context.Tokens.IgnoreQueryFilters()
                        .Include(t => t.Queue)
                        .Where(t => t.PatientId == patient.Id && !t.IsDeleted)
                        .OrderByDescending(t => t.CreatedAt)
                        .FirstOrDefaultAsync();

                    if (latestToken?.Queue != null)
                    {
                        return latestToken.Queue.BranchId;
                    }
                }
            }

            // Fallback 3: First available branch in current user's organization
            var orgBranch = await _context.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.OrganizationId == _currentUserService.OrgId && !b.IsDeleted);
            if (orgBranch != null) return orgBranch.Id;

            throw new Exception("Unable to resolve a valid clinic branch for sending WhatsApp message.");
        }

        [HttpPost("send/{branchId}")]
        public async Task<IActionResult> Send(string branchId, [FromBody] SendMessageRequest body)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(body.To))
                {
                    return BadRequest(new { error = "Recipient phone number ('To') is required." });
                }

                var resolvedBranchId = await ResolveBranchIdAsync(branchId, body.To);
                var message = body.Message ?? body.Text ?? string.Empty;

                var outboxItem = new CodeX.Domain.Entities.OutboxMessage
                {
                    BranchId = resolvedBranchId,
                    TokenId = body.TokenId,
                    PatientVisitId = body.PatientVisitId,
                    Channel = "WhatsApp",
                    MessageType = !string.IsNullOrEmpty(body.FileBase64) ? "Prescription" : "TextMessage",
                    Priority = body.Priority ?? (!string.IsNullOrEmpty(body.FileBase64) ? 10 : 50),
                    Recipient = body.To,
                    MessageBody = message,
                    FileName = body.FileName ?? "Prescription.pdf",
                    FileBase64 = body.FileBase64,
                    Status = "Pending",
                    RetryCount = 0,
                    MaxRetries = 3
                };

                _context.OutboxMessages.Add(outboxItem);
                await _context.SaveChangesAsync(default);

                try
                {
                    var notificationService = HttpContext.RequestServices.GetService<IQueueNotificationService>();
                    if (notificationService != null)
                    {
                        _ = notificationService.NotifyOutboxStatusChanged(resolvedBranchId, outboxItem.Id, "Pending", "WhatsApp", null);
                    }
                }
                catch { }

                return Ok(new 
                { 
                    success = true, 
                    queued = true, 
                    outboxId = outboxItem.Id,
                    message = "WhatsApp message/document queued successfully for asynchronous processing", 
                    branchId = resolvedBranchId 
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{patientId}/logs")]
        [HasPermission(SystemPermissions.Patients.View)]
        public async Task<IActionResult> GetChatHistoryLogs(Guid patientId)
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

                var formattedLogs = messages.Select(m => new {
                    id = m.Id,
                    type = m.MessageType,
                    status = m.Status,
                    body = m.MessageBody,
                    error = m.ErrorMessage,
                    createdAt = m.CreatedAt,
                    direction = m.MessageType.StartsWith("Incoming") ? "inbound" : "outbound",
                    platform = m.MessageType.Contains("Telegram") ? "telegram" : "whatsapp"
                });

                return Ok(formattedLogs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
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
        public Guid? TokenId { get; set; }
        public Guid? PatientVisitId { get; set; }
        public int? Priority { get; set; }
    }
}
