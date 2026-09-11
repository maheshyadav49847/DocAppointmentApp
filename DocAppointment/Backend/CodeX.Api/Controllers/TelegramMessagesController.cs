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
    [Route("api/v{version:apiVersion}/telegram/messages")]
    public class TelegramMessagesController : ControllerBase
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IApplicationDbContext _context;

        public TelegramMessagesController(ICurrentUserService currentUserService, IApplicationDbContext context)
        {
            _currentUserService = currentUserService;
            _context = context;
        }

        private async Task<Guid> ResolveBranchIdAsync(string branchId, string targetChatId)
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
            if (!string.IsNullOrWhiteSpace(targetChatId))
            {
                var patient = await _context.Patients.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.TelegramChatId == targetChatId && !p.IsDeleted);
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

            throw new Exception("Unable to resolve a valid clinic branch for sending Telegram message.");
        }

        [HttpPost("send/{branchId}")]
        public async Task<IActionResult> Send(string branchId, [FromBody] SendTelegramMessageRequest body)
        {
            try
            {
                var targetChatId = body.ChatId ?? body.To;

                if (string.IsNullOrWhiteSpace(targetChatId))
                {
                    return BadRequest(new { error = "Telegram Chat ID is required." });
                }

                var resolvedBranchId = await ResolveBranchIdAsync(branchId, targetChatId);
                var message = body.Message ?? body.Text ?? string.Empty;

                var outboxItem = new CodeX.Domain.Entities.OutboxMessage
                {
                    BranchId = resolvedBranchId,
                    TokenId = body.TokenId,
                    PatientVisitId = body.PatientVisitId,
                    Channel = "Telegram",
                    MessageType = !string.IsNullOrEmpty(body.FileBase64) ? "Prescription" : "TextMessage",
                    Priority = body.Priority ?? (!string.IsNullOrEmpty(body.FileBase64) ? 10 : 50),
                    Recipient = targetChatId,
                    MessageBody = message,
                    FileName = body.FileName ?? "Prescription.pdf",
                    FileBase64 = body.FileBase64,
                    Status = "Pending",
                    RetryCount = 0,
                    MaxRetries = 3
                };

                _context.OutboxMessages.Add(outboxItem);
                await _context.SaveChangesAsync(default);

                return Ok(new 
                { 
                    success = true, 
                    queued = true, 
                    outboxId = outboxItem.Id,
                    message = "Telegram message/document queued successfully for asynchronous processing", 
                    branchId = resolvedBranchId 
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class SendTelegramMessageRequest
    {
        public string? ChatId { get; set; }
        public string? To { get; set; }
        public string? Text { get; set; }
        public string? Message { get; set; }
        public string? FileBase64 { get; set; }
        public string? FileName { get; set; }
        public Guid? TokenId { get; set; }
        public Guid? PatientVisitId { get; set; }
        public int? Priority { get; set; }
    }
}
