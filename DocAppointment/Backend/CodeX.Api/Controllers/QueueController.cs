using CodeX.Application.Features.Queue.Commands.CallNextToken;
using CodeX.Application.Features.Queue.Commands.DoctorArrived;
using CodeX.Application.Features.Queue.Commands.CreateDailyQueue;
using CodeX.Application.Features.Queue.Commands.SkipToken;
using CodeX.Application.Features.Queue.Commands.EndQueue;
using CodeX.Application.Features.Queue.Queries.GetQueueStats;
using CodeX.Application.Features.Queue.Commands.AlertPatient;
using CodeX.Application.Features.Queue.Commands.CancelQueue;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using CodeX.Api.Authorization;
using CodeX.Domain.Constants;

namespace CodeX.Api.Controllers
{
    [Authorize]
    public class QueueController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public QueueController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpPost("initialize")]
        [HasPermission($"{SystemPermissions.Queue.CallNext},{SystemPermissions.DoctorDesk.CallNext}")]
        public async Task<ActionResult<Guid>> Create(CreateDailyQueueCommand command)
        {
            if (_currentUserService.OrgId != Guid.Empty)
            {
                var sessionQuery = _context.Sessions
                    .Where(s => s.Id == command.SessionId &&
                                s.DoctorId == command.DoctorId &&
                                s.Branch.OrganizationId == _currentUserService.OrgId);

                // Branch Isolation
                if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && !_currentUserService.DoctorId.HasValue)
                {
                    sessionQuery = sessionQuery.Where(s => s.BranchId == _currentUserService.BranchId.Value);
                }

                if (!await sessionQuery.AnyAsync())
                {
                    return Forbid();
                }
            }

            return await Mediator.Send(command);
        }

        [HttpGet("search-patients")]
        [HasPermission(SystemPermissions.Queue.AddPatient)]
        public async Task<ActionResult<List<CodeX.Application.Features.Queue.Queries.SearchQueuePatients.QueuePatientDto>>> SearchPatients([FromQuery] Guid? branchId, [FromQuery] string? search)
        {
            return await Mediator.Send(new CodeX.Application.Features.Queue.Queries.SearchQueuePatients.SearchQueuePatientsQuery(branchId, search ?? string.Empty));
        }

        [HttpPost("quick-start")]
        [HasPermission($"{SystemPermissions.Queue.CallNext},{SystemPermissions.DoctorDesk.CallNext}")] // Ensures Doctor/Admin can do this
        public async Task<ActionResult<Guid>> QuickStart()
        {
            var doctorId = _currentUserService.DoctorId;
            if (doctorId == null)
            {
                // Fallback: If not a doctor, maybe they have a doctor assigned or we try to find one in the branch
                var firstDoctor = await _context.Doctors.FirstOrDefaultAsync(d => d.OrganizationId == _currentUserService.OrgId);
                if (firstDoctor == null) return BadRequest(new { message = "No doctor profile found for quick start." });
                doctorId = firstDoctor.Id;
            }

            var branchId = _currentUserService.BranchId;
            if (branchId == null || branchId == Guid.Empty)
            {
                var firstBranch = await _context.Branches.FirstOrDefaultAsync(b => b.OrganizationId == _currentUserService.OrgId);
                if (firstBranch == null) return BadRequest(new { message = "No branch found for quick start." });
                branchId = firstBranch.Id;
            }

            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(null); // Assuming default TZ
            var tomorrow = today.AddDays(1);

            // Check if queue already running
            var existingQueue = await _context.DailyQueues
                .Where(q => q.DoctorId == doctorId && q.BranchId == branchId && q.QueueDate >= today && q.QueueDate < tomorrow && q.Status != QueueStatus.Completed && q.Status != QueueStatus.Cancelled)
                .OrderByDescending(q => q.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingQueue != null)
            {
                return Ok(existingQueue.Id); // Queue already running, just return it
            }

            // Find or create a session for today
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.DoctorId == doctorId && s.BranchId == branchId && s.SessionName == "Walk-in Session");

            if (session == null)
            {
                session = new CodeX.Domain.Entities.Session
                {
                    DoctorId = doctorId.Value,
                    BranchId = branchId.Value,
                    SessionName = "Walk-in Session",
                    StartTime = new TimeSpan(0, 0, 0),
                    EndTime = new TimeSpan(23, 59, 59),
                    IsDaily = true,
                    DefaultCapacity = 100,
                    IsActive = true
                };
                _context.Sessions.Add(session);
                await _context.SaveChangesAsync(default);
            }

            return await Mediator.Send(new CreateDailyQueueCommand { DoctorId = doctorId.Value, SessionId = session.Id });
        }

        [HttpGet("branches")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("doctors")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<List<CodeX.Application.Features.Doctors.Queries.GetDoctorsList.DoctorDto>>> GetDoctors([FromQuery] Guid? branchId)
        {
            var effectiveBranchId = branchId ?? _currentUserService.BranchId ?? Guid.Empty;
            return await Mediator.Send(new CodeX.Application.Features.Doctors.Queries.GetDoctorsList.GetDoctorsListQuery(effectiveBranchId));
        }

        [HttpGet("sessions")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<List<CodeX.Application.Features.Sessions.Queries.GetSessionsList.SessionDto>>> GetSessions([FromQuery] Guid doctorId, [FromQuery] Guid? branchId)
        {
            return await Mediator.Send(new CodeX.Application.Features.Sessions.Queries.GetSessionsList.GetSessionsListQuery(doctorId, branchId));
        }

        [HttpPost("token/{tokenId}/priority")]
        [HasPermission($"{SystemPermissions.Queue.EditPatient},{SystemPermissions.DoctorDesk.CallNext}")]
        public async Task<ActionResult<bool>> ToggleTokenPriority(Guid tokenId)
        {
            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.ToggleTokenPriority.ToggleTokenPriorityCommand(tokenId));
        }

        public class PauseQueueDto { public int DurationMinutes { get; set; } public string? Reason { get; set; } }

        [HttpPost("{queueId}/pause")]
        [HasPermission($"{SystemPermissions.Queue.EndSession},{SystemPermissions.DoctorDesk.EndSession}")]
        public async Task<ActionResult<bool>> Pause(Guid queueId, [FromBody] PauseQueueDto dto)
        {
            if (!await CanAccessQueue(queueId)) return Forbid();
            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.PauseQueue.PauseQueueCommand(queueId, dto.DurationMinutes, dto.Reason));
        }

        [HttpPost("{queueId}/resume")]
        [HasPermission($"{SystemPermissions.Queue.EndSession},{SystemPermissions.DoctorDesk.EndSession}")]
        public async Task<ActionResult<bool>> Resume(Guid queueId)
        {
            if (!await CanAccessQueue(queueId)) return Forbid();
            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.ResumeQueue.ResumeQueueCommand(queueId));
        }

        [HttpPost("{queueId}/next")]
        [HasPermission($"{SystemPermissions.Queue.CallNext},{SystemPermissions.DoctorDesk.CallNext}")]
        public async Task<ActionResult<int>> Next(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            var result = await Mediator.Send(new CallNextTokenCommand(queueId));
            return Ok(result);
        }

        [HttpPost("{queueId}/arrived")]
        [HasPermission($"{SystemPermissions.Queue.MarkDoctorArrived},{SystemPermissions.DoctorDesk.MarkDoctorArrived}")]
        public async Task<ActionResult<bool>> Arrived(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new DoctorArrivedCommand(queueId));
        }

        [HttpPost("{queueId}/skip")]
        [HasPermission($"{SystemPermissions.Queue.SkipToken},{SystemPermissions.DoctorDesk.SkipToken}")]
        public async Task<ActionResult<bool>> Skip(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new SkipTokenCommand(queueId));
        }

        [HttpPost("{queueId}/complete")]
        [HasPermission($"{SystemPermissions.Queue.CompleteToken},{SystemPermissions.DoctorDesk.CompleteToken}")]
        public async Task<ActionResult<bool>> Complete(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.CompleteToken.CompleteTokenCommand(queueId));
        }

        [HttpPost("{queueId}/end")]
        [HasPermission($"{SystemPermissions.Queue.EndSession},{SystemPermissions.DoctorDesk.EndSession}")]
        public async Task<ActionResult<bool>> End(Guid queueId, [FromBody] EndQueueDto? dto = null)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new EndQueueCommand(queueId, dto?.Action ?? EndQueueAction.CancelRemaining, dto?.TargetSessionId));
        }

        [HttpPost("{queueId}/alert")]
        [HasPermission(SystemPermissions.Queue.SendAlert)]
        public async Task<ActionResult<bool>> Alert(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new AlertPatientCommand(queueId));
        }

        [HttpPost("{queueId}/cancel")]
        [HasPermission($"{SystemPermissions.Queue.EndSession},{SystemPermissions.DoctorDesk.EndSession}")]
        public async Task<ActionResult<bool>> Cancel(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new CancelQueueCommand(queueId));
        }

        [HttpGet("stats/{branchId}")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<QueueStatsDto>> GetStats(Guid branchId)
        {
            // IDOR Protection
            var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == _currentUserService.OrgId);
            if (!branchExists && _currentUserService.OrgId != Guid.Empty) return Forbid();

            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty && _currentUserService.BranchId.Value != branchId && !_currentUserService.DoctorId.HasValue)
            {
                return Forbid();
            }

            return await Mediator.Send(new GetQueueStatsQuery(branchId));
        }

        [HttpGet("{queueId}")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<object>> GetQueueDetails(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Invoices)
                .Include(q => q.Doctor)
                .Include(q => q.Branch)
                .Include(q => q.Session)
                .FirstOrDefaultAsync(q => q.Id == queueId && 
                    q.Branch.OrganizationId == _currentUserService.OrgId &&
                    (_currentUserService.BranchId == null || _currentUserService.DoctorId.HasValue || q.BranchId == _currentUserService.BranchId));

            if (queue == null) return NotFound();

            var currentToken = queue.Tokens
                .Where(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefault();

            var waitingCount = queue.Tokens.Count(t => t.Status == TokenStatus.Pending);
            var completedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Completed);
            var skippedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Skipped);
            var cancelledCount = queue.Tokens.Count(t => t.Status == TokenStatus.Cancelled);

            return Ok(new
            {
                id = queue.Id,
                status = queue.Status,
                currentTokenNumber = queue.CurrentTokenNumber,
                doctorId = queue.DoctorId,
                sessionId = queue.SessionId,
                doctorName = queue.Doctor?.Name ?? "Unknown Doctor",
                sessionName = queue.Session?.SessionName ?? "Unknown Session",
                waitingCount,
                completedCount,
                skippedCount,
                cancelledCount,
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id,
                currentInvoiceId = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Id,
                currentInvoiceStatus = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Status,
                startedAt = queue.CreatedAt,
                currentTokenCalledAt = currentToken?.CalledAt,
                pausedUntil = queue.PausedUntil,
                pauseReason = queue.PauseReason
            });
        }

        [HttpGet("{queueId}/tokens/upcoming")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<List<object>>> GetUpcomingTokens(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Invoices)
                .Include(q => q.Doctor)
                .Include(q => q.Branch)
                .FirstOrDefaultAsync(q => q.Id == queueId && 
                    q.Branch.OrganizationId == _currentUserService.OrgId &&
                    (_currentUserService.BranchId == null || _currentUserService.DoctorId.HasValue || q.BranchId == _currentUserService.BranchId));

            if (queue == null) return NotFound();

            var upcoming = queue.Tokens
                .OrderBy(t => t.TokenNumber)
                .Select(t => new
                {
                    id = t.Id,
                    tokenNumber = t.TokenNumber,
                    patientId = t.PatientId,
                    invoiceId = t.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Id,
                    invoiceStatus = t.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Status,
                    patientName = t.Patient?.Name ?? "Unknown",
                    patientPhone = t.Patient?.Phone ?? "",
                    patientPhoneDialCode = t.Patient?.PhoneDialCode ?? "+91",
                    source = t.Source,
                    status = t.Status,
                    isPriority = t.IsPriority,
                    createdAt = t.CreatedAt,
                    completedAt = t.CompletedAt,
                    updatedAt = t.UpdatedAt
                })
                .ToList();

            return Ok(upcoming);
        }

        [HttpGet("active/{doctorId}")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<object>> GetActiveQueue(Guid doctorId)
        {
            var query = _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Branch)
                .Include(q => q.Session)
                .Where(q => q.DoctorId == doctorId &&
                            q.Status != QueueStatus.Completed &&
                            q.Status != QueueStatus.Cancelled);

            if (!_currentUserService.IsInRole("SuperAdmin"))
            {
                query = query.Where(q => q.Branch.OrganizationId == _currentUserService.OrgId);
            }

            var queues = await query.OrderByDescending(q => q.CreatedAt).Take(5).ToListAsync();
            
            var queue = queues.FirstOrDefault(q => 
            {
                var tzToday = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(q.Branch?.Timezone);
                return q.QueueDate >= tzToday && q.QueueDate < tzToday.AddDays(1);
            });

            if (queue == null) return Ok(null);

            var currentToken = queue.Tokens
                .Where(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefault();

            var waitingCount = queue.Tokens.Count(t => t.Status == TokenStatus.Pending);
            var completedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Completed);
            var skippedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Skipped);
            var cancelledCount = queue.Tokens.Count(t => t.Status == TokenStatus.Cancelled);

            return Ok(new
            {
                id = queue.Id,
                status = queue.Status,
                currentTokenNumber = queue.CurrentTokenNumber,
                doctorId = queue.DoctorId,
                sessionId = queue.SessionId,
                waitingCount,
                completedCount,
                skippedCount,
                cancelledCount,
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id,
                currentInvoiceId = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Id,
                currentInvoiceStatus = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Status,
                branchName = queue.Branch?.Name,
                branchId = queue.BranchId,
                sessionName = queue.Session?.SessionName ?? "Walk-in Session",
                startedAt = queue.CreatedAt,
                currentTokenCalledAt = currentToken?.CalledAt,
                pausedUntil = queue.PausedUntil,
                pauseReason = queue.PauseReason
            });
        }

        [HttpGet("active/{doctorId}/{sessionId}")]
        [HasPermission($"{SystemPermissions.Queue.View},{SystemPermissions.DoctorDesk.View}")]
        public async Task<ActionResult<object>> GetActiveQueueForSession(Guid doctorId, Guid sessionId)
        {
            var sessionObj = await _context.Sessions.Include(s => s.Branch).FirstOrDefaultAsync(s => s.Id == sessionId);
            if (sessionObj == null) return Ok(null);
            
            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(sessionObj.Branch?.Timezone);
            var tomorrow = today.AddDays(1);
            
            var query = _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Branch)
                .Where(q => q.DoctorId == doctorId &&
                            q.SessionId == sessionId &&
                            q.QueueDate >= today &&
                            q.QueueDate < tomorrow &&
                            q.Status != QueueStatus.Completed &&
                            q.Status != QueueStatus.Cancelled);

            if (!_currentUserService.IsInRole("SuperAdmin"))
            {
                query = query.Where(q => q.Branch.OrganizationId == _currentUserService.OrgId);
            }

            var queue = await query
                .OrderByDescending(q => q.CreatedAt)
                .FirstOrDefaultAsync();
                
            if (queue == null) return Ok(null);

            var currentToken = queue.Tokens
                .Where(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefault();

            var waitingCount = queue.Tokens.Count(t => t.TokenNumber > queue.CurrentTokenNumber && t.Status == TokenStatus.Pending);
            var completedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Completed);
            var skippedCount = queue.Tokens.Count(t => t.Status == TokenStatus.Skipped);
            var cancelledCount = queue.Tokens.Count(t => t.Status == TokenStatus.Cancelled);

            return Ok(new
            {
                id = queue.Id,
                status = queue.Status,
                currentTokenNumber = queue.CurrentTokenNumber,
                doctorId = queue.DoctorId,
                sessionId = queue.SessionId,
                waitingCount,
                completedCount,
                skippedCount,
                cancelledCount,
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id,
                currentInvoiceId = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Id,
                currentInvoiceStatus = currentToken?.Invoices.OrderByDescending(i => i.CreatedAt).FirstOrDefault(i => i.Status != CodeX.Domain.Enums.InvoiceStatus.Cancelled)?.Status,
                branchName = queue.Branch?.Name,
                branchId = queue.BranchId,
                startedAt = queue.CreatedAt,
                currentTokenCalledAt = currentToken?.CalledAt,
                pausedUntil = queue.PausedUntil,
                pauseReason = queue.PauseReason
            });
        }



        [AllowAnonymous]
        [HttpGet("branch/{branchId}/active")]
        public async Task<ActionResult<List<object>>> GetActiveQueuesByBranch(Guid branchId)
        {
            // Must bypass ALL global OrgId query filters since this is anonymous
            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .Where(b => b.Id == branchId && !b.IsDeleted)
                .FirstOrDefaultAsync();
            if (branch == null) return NotFound();

            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(branch.Timezone);
            var tomorrow = today.AddDays(1);

            // Load queues without global filters
            var queues = await _context.DailyQueues
                .IgnoreQueryFilters()
                .Where(q => !q.IsDeleted &&
                            q.BranchId == branchId &&
                            q.QueueDate >= today &&
                            q.QueueDate < tomorrow &&
                            q.Status != QueueStatus.Completed &&
                            q.Status != QueueStatus.Cancelled)
                .OrderBy(q => q.CreatedAt)
                .ToListAsync();

            if (queues.Count == 0) return Ok(new List<object>());

            // Load related data separately to bypass filters
            var queueIds = queues.Select(q => q.Id).ToList();
            var doctorIds = queues.Select(q => q.DoctorId).Distinct().ToList();

            var doctors = await _context.Doctors
                .IgnoreQueryFilters()
                .Where(d => doctorIds.Contains(d.Id) && !d.IsDeleted)
                .ToDictionaryAsync(d => d.Id);

            var tokens = await _context.Tokens
                .IgnoreQueryFilters()
                .Include(t => t.Patient)
                .Where(t => queueIds.Contains(t.QueueId) && !t.IsDeleted)
                .ToListAsync();

            var tokensByQueue = tokens.GroupBy(t => t.QueueId).ToDictionary(g => g.Key, g => g.ToList());

            var result = queues.Select(q => {
                var qTokens = tokensByQueue.GetValueOrDefault(q.Id) ?? new List<Domain.Entities.Token>();
                doctors.TryGetValue(q.DoctorId, out var doctor);

                var currentToken = qTokens
                    .Where(t => t.TokenNumber == q.CurrentTokenNumber && t.Status == TokenStatus.Called)
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefault();

                var upcoming = qTokens
                    .Where(t => t.Status == TokenStatus.Pending)
                    .OrderBy(t => t.TokenNumber)
                    .Take(5)
                    .Select(t => t.TokenNumber)
                    .ToList();

                return new {
                    id = q.Id,
                    doctorId = q.DoctorId,
                    doctorName = doctor?.Name ?? "Unknown",
                    currentTokenNumber = q.CurrentTokenNumber,
                    currentPatientName = currentToken?.Patient?.Name ?? "Walk-in",
                    waitingCount = qTokens.Count(t => t.Status == TokenStatus.Pending),
                    completedCount = qTokens.Count(t => t.Status == TokenStatus.Completed),
                    skippedCount = qTokens.Count(t => t.Status == TokenStatus.Skipped),
                    cancelledCount = qTokens.Count(t => t.Status == TokenStatus.Cancelled),
                    upcomingTokens = upcoming,
                    startedAt = q.CreatedAt,
                    currentTokenCalledAt = currentToken?.CalledAt,
                    pausedUntil = q.PausedUntil,
                    pauseReason = q.PauseReason
                };
            }).ToList();

            return Ok(result);
        }

        private async Task<bool> CanAccessQueue(Guid queueId)
        {
            var query = _context.DailyQueues.Where(q => q.Id == queueId);

            if (_currentUserService.OrgId != Guid.Empty)
            {
                query = query.Where(q => q.Branch.OrganizationId == _currentUserService.OrgId);
            }

            // If user has a DoctorId, restrict them to their own queues ONLY (ignore BranchId filter for them)
            if (_currentUserService.DoctorId.HasValue)
            {
                query = query.Where(q => q.DoctorId == _currentUserService.DoctorId.Value);
            }
            // For other staff (e.g. receptionists), restrict by their current active BranchId
            else if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty)
            {
                query = query.Where(q => q.BranchId == _currentUserService.BranchId.Value);
            }

            return await query.AnyAsync();
        }
    }
}
