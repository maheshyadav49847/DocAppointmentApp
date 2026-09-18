using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using CodeX.Domain.Constants;
using System.ComponentModel.DataAnnotations;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1.0/leaves")]
    public class LeaveController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public LeaveController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public class ApplyLeaveRequest
        {
            public Guid? StaffId { get; set; }
            public Guid? DoctorId { get; set; }
            public Guid? BranchId { get; set; }
            public Guid? SessionId { get; set; }

            public LeaveType LeaveType { get; set; } = LeaveType.Planned;

            [Required]
            public DateTime StartDate { get; set; }

            [Required]
            public DateTime EndDate { get; set; }

            [Required]
            public string Reason { get; set; } = string.Empty;

            public string? PublicNotice { get; set; }

            public bool NotifyPatients { get; set; } = true;
        }

        public class RejectLeaveRequest
        {
            [Required]
            public string RejectionReason { get; set; } = string.Empty;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaves(
            [FromQuery] Guid? branchId,
            [FromQuery] Guid? doctorId,
            [FromQuery] Guid? staffId,
            [FromQuery] LeaveStatus? status,
            [FromQuery] LeaveType? type,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? search)
        {
            var orgId = _currentUserService.OrgId;
            var query = _context.LeaveRecords
                .IgnoreQueryFilters()
                .Include(l => l.Staff)
                .Include(l => l.Doctor)
                .Include(l => l.Branch)
                .Include(l => l.Session)
                .Where(l => l.OrganizationId == orgId && (!l.IsDeleted || l.Status == LeaveStatus.Cancelled))
                .AsQueryable();

            if (branchId.HasValue && branchId != Guid.Empty)
            {
                query = query.Where(l => l.BranchId == null || l.BranchId == branchId.Value);
            }

            if (doctorId.HasValue && doctorId != Guid.Empty)
            {
                query = query.Where(l => l.DoctorId == doctorId.Value);
            }

            if (staffId.HasValue && staffId != Guid.Empty)
            {
                query = query.Where(l => l.StaffId == staffId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(l => l.Status == status.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(l => l.LeaveType == type.Value);
            }

            if (startDate.HasValue)
            {
                var startUtc = DateTime.SpecifyKind(startDate.Value.Date, DateTimeKind.Utc);
                query = query.Where(l => l.EndDate >= startUtc);
            }

            if (endDate.HasValue)
            {
                var endUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                query = query.Where(l => l.StartDate <= endUtc);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(l =>
                    (l.Doctor != null && l.Doctor.Name.ToLower().Contains(term)) ||
                    (l.Staff != null && (l.Staff.FirstName.ToLower().Contains(term) || l.Staff.LastName.ToLower().Contains(term) || l.Staff.Email.ToLower().Contains(term))) ||
                    l.Reason.ToLower().Contains(term) ||
                    (l.PublicNotice != null && l.PublicNotice.ToLower().Contains(term)));
            }

            var list = await query
                .OrderByDescending(l => l.StartDate)
                .ThenByDescending(l => l.CreatedAt)
                .ToListAsync();

            // Fetch approver/creator names
            var staffIds = list.Select(l => l.AppliedByStaffId)
                .Concat(list.Where(l => l.ApprovedByStaffId.HasValue).Select(l => l.ApprovedByStaffId!.Value))
                .Distinct()
                .ToList();

            var staffDict = await _context.Staff
                .Where(s => staffIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => $"{s.FirstName} {s.LastName}".Trim());

            var result = list.Select(l => new
            {
                l.Id,
                l.OrganizationId,
                l.BranchId,
                BranchName = l.Branch?.Name ?? "All Branches",
                l.StaffId,
                StaffName = l.Staff != null ? $"{l.Staff.FirstName} {l.Staff.LastName}".Trim() : null,
                StaffEmail = l.Staff?.Email,
                l.DoctorId,
                DoctorName = l.Doctor?.Name,
                DoctorSpecialization = l.Doctor?.Specialization,
                l.LeaveType,
                StartDate = l.StartDate.ToString("yyyy-MM-dd"),
                EndDate = l.EndDate.ToString("yyyy-MM-dd"),
                l.SessionId,
                SessionName = l.Session?.SessionName ?? "Full Day",
                l.Reason,
                l.PublicNotice,
                l.Status,
                l.AppliedByStaffId,
                AppliedByName = staffDict.TryGetValue(l.AppliedByStaffId, out var abn) ? abn : "System",
                l.ApprovedByStaffId,
                ApprovedByName = l.ApprovedByStaffId.HasValue && staffDict.TryGetValue(l.ApprovedByStaffId.Value, out var apbn) ? apbn : null,
                l.ApprovedAt,
                l.RejectionReason,
                l.NotifyPatients,
                l.AffectedTokensCount,
                l.CreatedAt
            });

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> ApplyLeave([FromBody] ApplyLeaveRequest request)
        {
            if (request.StartDate.Date > request.EndDate.Date)
            {
                return BadRequest(new { message = "End Date cannot be earlier than Start Date." });
            }

            var currentUserIdStr = _currentUserService.UserId;
            Guid currentStaffId = Guid.Empty;
            if (Guid.TryParse(currentUserIdStr, out var parsedStaffId))
            {
                currentStaffId = parsedStaffId;
            }

            bool isAdmin = _currentUserService.IsInRole("OrgAdmin") || _currentUserService.IsInRole("BranchAdmin") || _currentUserService.IsInRole("SuperAdmin") || User.IsInRole("OrgAdmin") || User.IsInRole("BranchAdmin") || User.IsInRole("SuperAdmin");
            bool isEmergency = request.LeaveType == LeaveType.Unplanned;

            // Resolve target doctor/staff
            Guid? targetDoctorId = request.DoctorId;
            Guid? targetStaffId = request.StaffId;

            if (targetDoctorId.HasValue && targetDoctorId != Guid.Empty && !targetStaffId.HasValue)
            {
                var linkedStaff = await _context.Staff
                    .FirstOrDefaultAsync(s => s.DoctorId == targetDoctorId.Value && !s.IsDeleted);
                if (linkedStaff != null)
                {
                    targetStaffId = linkedStaff.Id;
                }
            }
            else if (targetStaffId.HasValue && targetStaffId != Guid.Empty && !targetDoctorId.HasValue)
            {
                var staffUser = await _context.Staff
                    .FirstOrDefaultAsync(s => s.Id == targetStaffId.Value && !s.IsDeleted);
                if (staffUser?.DoctorId != null)
                {
                    targetDoctorId = staffUser.DoctorId;
                }
            }

            if (!targetDoctorId.HasValue && !targetStaffId.HasValue)
            {
                // Default to current logged-in user
                targetStaffId = currentStaffId;
                if (_currentUserService.DoctorId.HasValue)
                {
                    targetDoctorId = _currentUserService.DoctorId.Value;
                }
            }

            var startUtc = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc);

            // Check for overlapping active leaves for the same person
            var overlappingQuery = _context.LeaveRecords
                .Where(l => !l.IsDeleted && l.Status != LeaveStatus.Rejected && l.Status != LeaveStatus.Cancelled)
                .Where(l => l.StartDate <= endUtc && l.EndDate >= startUtc);

            if (targetDoctorId.HasValue)
            {
                overlappingQuery = overlappingQuery.Where(l => l.DoctorId == targetDoctorId.Value);
            }
            else if (targetStaffId.HasValue)
            {
                overlappingQuery = overlappingQuery.Where(l => l.StaffId == targetStaffId.Value);
            }

            if (request.SessionId.HasValue && request.SessionId != Guid.Empty)
            {
                overlappingQuery = overlappingQuery.Where(l => l.SessionId == null || l.SessionId == request.SessionId.Value);
            }

            var hasOverlap = await overlappingQuery.AnyAsync();
            if (hasOverlap)
            {
                return BadRequest(new { message = "A leave record already exists for the selected date range and shift." });
            }

            // Auto-Approval condition
            bool autoApprove = isAdmin || isEmergency;
            var initialStatus = autoApprove ? LeaveStatus.Approved : LeaveStatus.Pending;

            var leaveRecord = new LeaveRecord
            {
                OrganizationId = _currentUserService.OrgId,
                BranchId = request.BranchId != Guid.Empty ? request.BranchId : null,
                StaffId = targetStaffId != Guid.Empty ? targetStaffId : null,
                DoctorId = targetDoctorId != Guid.Empty ? targetDoctorId : null,
                SessionId = request.SessionId != Guid.Empty ? request.SessionId : null,
                LeaveType = request.LeaveType,
                StartDate = startUtc,
                EndDate = endUtc,
                Reason = request.Reason.Trim(),
                PublicNotice = !string.IsNullOrWhiteSpace(request.PublicNotice) ? request.PublicNotice.Trim() : (request.LeaveType == LeaveType.Unplanned ? "Doctor unavailable due to an emergency" : null),
                Status = initialStatus,
                AppliedByStaffId = currentStaffId,
                ApprovedByStaffId = autoApprove ? currentStaffId : null,
                ApprovedAt = autoApprove ? DateTime.UtcNow : null,
                NotifyPatients = request.NotifyPatients,
                AffectedTokensCount = 0
            };

            // If auto-approved and doctor is involved, calculate & process affected tokens
            if (autoApprove && targetDoctorId.HasValue)
            {
                await ProcessDoctorLeaveImpactAsync(leaveRecord, startUtc, endUtc, request.NotifyPatients);
            }

            _context.LeaveRecords.Add(leaveRecord);
            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new
            {
                message = autoApprove ? "Leave approved and applied successfully." : "Leave request submitted for approval.",
                leave = leaveRecord
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLeave(Guid id, [FromBody] ApplyLeaveRequest request)
        {
            if (request.StartDate.Date > request.EndDate.Date)
            {
                return BadRequest(new { message = "End Date cannot be earlier than Start Date." });
            }

            var orgId = _currentUserService.OrgId;
            var leave = await _context.LeaveRecords
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.Id == id && l.OrganizationId == orgId);

            if (leave == null) return NotFound("Leave record not found.");

            if (leave.Status != LeaveStatus.Pending)
            {
                return BadRequest(new { message = $"Cannot edit leave in {leave.Status} status. Only pending leave requests can be modified." });
            }

            var currentUserIdStr = _currentUserService.UserId;
            Guid currentStaffId = Guid.Empty;
            if (Guid.TryParse(currentUserIdStr, out var parsedStaffId))
            {
                currentStaffId = parsedStaffId;
            }

            bool isAdmin = _currentUserService.IsInRole("OrgAdmin") || 
                           _currentUserService.IsInRole("SuperAdmin") || 
                           _currentUserService.IsInRole("BranchAdmin") ||
                           User.IsInRole("OrgAdmin") ||
                           User.IsInRole("SuperAdmin") ||
                           User.IsInRole("BranchAdmin");

            bool isOwner = (leave.AppliedByStaffId == currentStaffId) ||
                           (leave.StaffId.HasValue && leave.StaffId.Value == currentStaffId) ||
                           (_currentUserService.DoctorId.HasValue && leave.DoctorId.HasValue && leave.DoctorId.Value == _currentUserService.DoctorId.Value);

            if (!isAdmin && !isOwner)
            {
                return Forbid();
            }

            // Target doctor / staff
            Guid? targetDoctorId = request.DoctorId.HasValue && request.DoctorId != Guid.Empty ? request.DoctorId : leave.DoctorId;
            Guid? targetStaffId = request.StaffId.HasValue && request.StaffId != Guid.Empty ? request.StaffId : leave.StaffId;

            // Date UTC handling
            var startUtc = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc);

            // Check for overlapping active leaves excluding this leave itself
            var overlappingQuery = _context.LeaveRecords
                .Where(l => l.Id != id && !l.IsDeleted && l.Status != LeaveStatus.Rejected && l.Status != LeaveStatus.Cancelled)
                .Where(l => l.StartDate <= endUtc && l.EndDate >= startUtc);

            if (targetDoctorId.HasValue)
            {
                overlappingQuery = overlappingQuery.Where(l => l.DoctorId == targetDoctorId.Value);
            }
            else if (targetStaffId.HasValue)
            {
                overlappingQuery = overlappingQuery.Where(l => l.StaffId == targetStaffId.Value);
            }

            if (request.SessionId.HasValue && request.SessionId != Guid.Empty)
            {
                overlappingQuery = overlappingQuery.Where(l => l.SessionId == null || l.SessionId == request.SessionId.Value);
            }

            var hasOverlap = await overlappingQuery.AnyAsync();
            if (hasOverlap)
            {
                return BadRequest(new { message = "Another leave record already exists for the selected date range and shift." });
            }

            // Update allowed fields
            if (isAdmin)
            {
                if (request.BranchId.HasValue && request.BranchId != Guid.Empty) leave.BranchId = request.BranchId.Value;
                if (request.StaffId.HasValue && request.StaffId != Guid.Empty) leave.StaffId = request.StaffId.Value;
                if (request.DoctorId.HasValue && request.DoctorId != Guid.Empty) leave.DoctorId = request.DoctorId.Value;
            }

            leave.SessionId = request.SessionId.HasValue && request.SessionId != Guid.Empty ? request.SessionId.Value : null;
            leave.LeaveType = request.LeaveType;
            leave.StartDate = startUtc;
            leave.EndDate = endUtc;
            leave.Reason = request.Reason.Trim();
            leave.PublicNotice = !string.IsNullOrWhiteSpace(request.PublicNotice) ? request.PublicNotice.Trim() : (request.LeaveType == LeaveType.Unplanned ? "Doctor unavailable due to an emergency" : null);
            leave.NotifyPatients = request.NotifyPatients;

            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new
            {
                message = "Leave request updated successfully.",
                leave
            });
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveLeave(Guid id)
        {
            var leave = await _context.LeaveRecords
                .Include(l => l.Doctor)
                .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);

            if (leave == null) return NotFound("Leave record not found.");
            if (leave.Status == LeaveStatus.Approved) return BadRequest("Leave is already approved.");
            if (leave.Status == LeaveStatus.Cancelled) return BadRequest("Cannot approve a cancelled leave.");

            var currentUserIdStr = _currentUserService.UserId;
            Guid currentStaffId = Guid.Empty;
            if (Guid.TryParse(currentUserIdStr, out var parsedStaffId))
            {
                currentStaffId = parsedStaffId;
            }

            leave.Status = LeaveStatus.Approved;
            leave.ApprovedByStaffId = currentStaffId;
            leave.ApprovedAt = DateTime.UtcNow;
            leave.RejectionReason = null;

            if (leave.DoctorId.HasValue)
            {
                await ProcessDoctorLeaveImpactAsync(leave, leave.StartDate, leave.EndDate, leave.NotifyPatients);
            }

            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Leave approved successfully.", affectedTokens = leave.AffectedTokensCount });
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectLeave(Guid id, [FromBody] RejectLeaveRequest request)
        {
            var leave = await _context.LeaveRecords
                .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted);

            if (leave == null) return NotFound("Leave record not found.");
            if (leave.Status == LeaveStatus.Approved) return BadRequest("Cannot reject an already approved leave. Cancel it instead.");
            if (leave.Status == LeaveStatus.Cancelled) return BadRequest("Cannot reject a cancelled leave.");

            leave.Status = LeaveStatus.Rejected;
            leave.RejectionReason = request.RejectionReason.Trim();

            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Leave request rejected." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelLeave(Guid id)
        {
            var orgId = _currentUserService.OrgId;
            var leave = await _context.LeaveRecords
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => l.Id == id && l.OrganizationId == orgId);

            if (leave == null) return NotFound("Leave record not found.");
            if (leave.Status == LeaveStatus.Cancelled) return BadRequest("Leave is already cancelled.");

            leave.Status = LeaveStatus.Cancelled;
            leave.IsDeleted = false; // Retain in audit history & UI listings with Cancelled status

            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Leave cancelled successfully." });
        }

        [AllowAnonymous]
        [HttpGet("check-doctor-availability")]
        public async Task<IActionResult> CheckDoctorAvailability(
            [FromQuery] Guid doctorId,
            [FromQuery] string date,
            [FromQuery] Guid? sessionId,
            [FromQuery] Guid? branchId)
        {
            if (doctorId == Guid.Empty || !DateTime.TryParse(date, out var parsedDate))
            {
                return BadRequest("Invalid doctorId or date parameter (format: yyyy-MM-dd).");
            }

            var targetUtc = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);

            var activeLeave = await _context.LeaveRecords
                .IgnoreQueryFilters()
                .Include(l => l.Doctor)
                .Where(l => !l.IsDeleted && l.Status == LeaveStatus.Approved)
                .Where(l => l.DoctorId == doctorId)
                .Where(l => l.StartDate <= targetUtc && l.EndDate >= targetUtc)
                .Where(l => !branchId.HasValue || l.BranchId == null || l.BranchId == branchId.Value)
                .Where(l => !sessionId.HasValue || l.SessionId == null || l.SessionId == sessionId.Value)
                .FirstOrDefaultAsync();

            if (activeLeave != null)
            {
                return Ok(new
                {
                    isAvailable = false,
                    onLeave = true,
                    leaveType = activeLeave.LeaveType.ToString(),
                    reason = activeLeave.Reason,
                    publicNotice = activeLeave.PublicNotice ?? (activeLeave.LeaveType == LeaveType.Unplanned ? "Doctor is on emergency leave today" : "Doctor is on planned leave"),
                    startDate = activeLeave.StartDate.ToString("yyyy-MM-dd"),
                    endDate = activeLeave.EndDate.ToString("yyyy-MM-dd"),
                    nextAvailableDate = activeLeave.EndDate.AddDays(1).ToString("yyyy-MM-dd")
                });
            }

            return Ok(new
            {
                isAvailable = true,
                onLeave = false
            });
        }

        private async Task ProcessDoctorLeaveImpactAsync(LeaveRecord leave, DateTime startUtc, DateTime endUtc, bool notifyPatients)
        {
            // Find queues matching doctor on the dates
            var queueQuery = _context.DailyQueues
                .Include(q => q.Branch)
                .Include(q => q.Doctor)
                .Where(q => !q.IsDeleted && q.DoctorId == leave.DoctorId!.Value)
                .Where(q => q.QueueDate >= startUtc && q.QueueDate <= endUtc);

            if (leave.BranchId.HasValue)
            {
                queueQuery = queueQuery.Where(q => q.BranchId == leave.BranchId.Value);
            }

            if (leave.SessionId.HasValue)
            {
                queueQuery = queueQuery.Where(q => q.SessionId == leave.SessionId.Value);
            }

            var affectedQueues = await queueQuery.ToListAsync();

            if (!affectedQueues.Any()) return;

            var queueIds = affectedQueues.Select(q => q.Id).ToList();

            // Find all active/waiting tokens
            var affectedTokens = await _context.Tokens
                .Include(t => t.Patient)
                .Where(t => queueIds.Contains(t.QueueId) && !t.IsDeleted)
                .Where(t => t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called)
                .ToListAsync();

            leave.AffectedTokensCount = affectedTokens.Count;

            // If leave is unplanned or for today, update daily queue status
            var todayUtc = DateTime.UtcNow.Date;
            foreach (var q in affectedQueues)
            {
                if (q.QueueDate.Date == todayUtc)
                {
                    q.Status = QueueStatus.Cancelled;
                    q.PauseReason = $"Doctor on leave: {leave.Reason}";
                }
            }

            if (notifyPatients && affectedTokens.Any())
            {
                var docName = affectedQueues.FirstOrDefault()?.Doctor?.Name ?? "Doctor";
                var notice = !string.IsNullOrWhiteSpace(leave.PublicNotice) ? leave.PublicNotice : "unavoidable circumstances";

                foreach (var token in affectedTokens)
                {
                    // Cancel token
                    token.Status = TokenStatus.Cancelled;

                    // Send notification via Outbox
                    string recipient = !string.IsNullOrWhiteSpace(token.Patient?.Phone) ? token.Patient.Phone : "";
                    string channel = "WhatsApp";
                    if (!string.IsNullOrWhiteSpace(token.Patient?.TelegramChatId))
                    {
                        recipient = token.Patient.TelegramChatId;
                        channel = "Telegram";
                    }

                    if (!string.IsNullOrWhiteSpace(recipient))
                    {
                        var queueObj = affectedQueues.FirstOrDefault(q => q.Id == token.QueueId);
                        var branchId = queueObj?.BranchId ?? Guid.Empty;
                        var pName = token.Patient?.Name ?? "Patient";

                        var msg = new OutboxMessage
                        {
                            BranchId = branchId,
                            TokenId = token.Id,
                            Channel = channel,
                            MessageType = "Cancellation",
                            Recipient = recipient,
                            MessageBody = $"Namaste {pName}, Dr. {docName} is on leave ({leave.LeaveType} Leave). Your appointment token #{token.TokenNumber} for {queueObj?.QueueDate:dd-MMM-yyyy} has been cancelled ({notice}). We deeply regret the inconvenience. You may re-book for the next available slot.",
                            Priority = 100,
                            Status = "Pending",
                            MaxRetries = 3
                        };

                        _context.OutboxMessages.Add(msg);
                    }
                }
            }
        }
    }
}
