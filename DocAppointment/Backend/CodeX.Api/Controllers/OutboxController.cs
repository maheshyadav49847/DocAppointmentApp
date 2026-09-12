using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Authorize]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/outbox")]
    public class OutboxController : ControllerBase
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IApplicationDbContext _context;

        public OutboxController(ICurrentUserService currentUserService, IApplicationDbContext context)
        {
            _currentUserService = currentUserService;
            _context = context;
        }

        /// <summary>
        /// Get paginated outbox messages with real-time status, filters, and statistics.
        /// </summary>
        [HttpGet("messages")]
        [HasPermission(SystemPermissions.Outbox.View)]
        public async Task<IActionResult> GetOutboxMessages(
            [FromQuery] Guid? branchId,
            [FromQuery] string? channel,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var query = _context.OutboxMessages
                    .Include(o => o.Branch)
                    .Include(o => o.Token)
                        .ThenInclude(t => t!.Patient)
                    .Include(o => o.PatientVisit)
                        .ThenInclude(pv => pv!.Patient)
                    .AsNoTracking();

                // Branch filter
                if (branchId.HasValue && branchId.Value != Guid.Empty)
                {
                    query = query.Where(o => o.BranchId == branchId.Value);
                }

                // Channel filter (Telegram, WhatsApp, SMS, Email)
                if (!string.IsNullOrWhiteSpace(channel) && !channel.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.Channel.ToLower() == channel.ToLower());
                }

                // Status filter (Pending, Processing, Sent, Failed, DeadLetter)
                if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.Status.ToLower() == status.ToLower());
                }

                // Date filter
                if (startDate.HasValue)
                {
                    var startUtc = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                    query = query.Where(o => o.CreatedAt >= startUtc);
                }
                if (endDate.HasValue)
                {
                    var endUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                    query = query.Where(o => o.CreatedAt <= endUtc);
                }

                // Search query
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    query = query.Where(o =>
                        o.Recipient.ToLower().Contains(s) ||
                        (o.MessageBody != null && o.MessageBody.ToLower().Contains(s)) ||
                        (o.FileName != null && o.FileName.ToLower().Contains(s)) ||
                        (o.Token != null && o.Token.Patient != null && (o.Token.Patient.Name.ToLower().Contains(s) || (o.Token.Patient.Phone != null && o.Token.Patient.Phone.Contains(s)))) ||
                        (o.PatientVisit != null && o.PatientVisit.Patient != null && (o.PatientVisit.Patient.Name.ToLower().Contains(s) || (o.PatientVisit.Patient.Phone != null && o.PatientVisit.Patient.Phone.Contains(s)))));
                }

                var totalCount = await query.CountAsync();

                // Stats Breakdown
                var pendingCount = await query.CountAsync(o => o.Status == "Pending" || o.Status == "Processing");
                var sentCount = await query.CountAsync(o => o.Status == "Sent");
                var failedCount = await query.CountAsync(o => o.Status == "Failed");
                var deadLetterCount = await query.CountAsync(o => o.Status == "DeadLetter");

                var items = await query
                    .OrderByDescending(o => o.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(o => new
                    {
                        o.Id,
                        o.BranchId,
                        BranchName = o.Branch != null ? o.Branch.Name : "Clinic Branch",
                        o.TokenId,
                        TokenNumber = o.Token != null ? (int?)o.Token.TokenNumber : null,
                        PatientName = o.Token != null && o.Token.Patient != null 
                            ? o.Token.Patient.Name 
                            : (o.PatientVisit != null && o.PatientVisit.Patient != null 
                                ? o.PatientVisit.Patient.Name 
                                : _context.Patients.Where(p => p.TelegramChatId == o.Recipient).Select(p => p.Name).FirstOrDefault()),
                        PatientPhone = o.Token != null && o.Token.Patient != null 
                            ? (o.Token.Patient.PhoneDialCode != null ? o.Token.Patient.PhoneDialCode + " " + o.Token.Patient.Phone : o.Token.Patient.Phone) 
                            : (o.PatientVisit != null && o.PatientVisit.Patient != null 
                                ? (o.PatientVisit.Patient.PhoneDialCode != null ? o.PatientVisit.Patient.PhoneDialCode + " " + o.PatientVisit.Patient.Phone : o.PatientVisit.Patient.Phone) 
                                : _context.Patients.Where(p => p.TelegramChatId == o.Recipient).Select(p => p.PhoneDialCode != null ? p.PhoneDialCode + " " + p.Phone : p.Phone).FirstOrDefault()),
                        o.PatientVisitId,
                        o.Channel,
                        o.MessageType,
                        o.Priority,
                        o.Recipient,
                        o.MessageBody,
                        o.FileName,
                        HasFile = !string.IsNullOrEmpty(o.FileBase64),
                        o.Status,
                        o.RetryCount,
                        o.MaxRetries,
                        o.NextRetryAtUtc,
                        o.ProcessedAtUtc,
                        o.ErrorMessage,
                        o.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new
                {
                    totalCount,
                    pendingCount,
                    sentCount,
                    failedCount,
                    deadLetterCount,
                    page,
                    pageSize,
                    items
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Retry a failed or dead-letter outbox message immediately.
        /// </summary>
        [HttpPost("messages/{id}/retry")]
        [HasPermission(SystemPermissions.Outbox.Retry)]
        public async Task<IActionResult> RetryMessage(Guid id)
        {
            var message = await _context.OutboxMessages.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == id);
            if (message == null) return NotFound("Outbox message not found");

            message.Status = "Pending";
            message.NextRetryAtUtc = DateTime.UtcNow;
            message.ErrorMessage = null;
            message.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(default);

            try
            {
                var notificationService = HttpContext.RequestServices.GetService<IQueueNotificationService>();
                if (notificationService != null)
                {
                    _ = notificationService.NotifyOutboxStatusChanged(message.BranchId, message.Id, message.Status, message.Channel, null);
                }
            }
            catch { }

            return Ok(new { success = true, message = "Outbox item requeued for immediate dispatch." });
        }
    }
}
