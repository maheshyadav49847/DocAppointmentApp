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
        [HasPermission(SystemPermissions.Queue.CallNext)]
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
        public async Task<ActionResult<List<CodeX.Application.Features.Queue.Queries.SearchQueuePatients.QueuePatientDto>>> SearchPatients([FromQuery] Guid? branchId, [FromQuery] string search)
        {
            return await Mediator.Send(new CodeX.Application.Features.Queue.Queries.SearchQueuePatients.SearchQueuePatientsQuery(branchId, search));
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("doctors")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<List<CodeX.Application.Features.Doctors.Queries.GetDoctorsList.DoctorDto>>> GetDoctors([FromQuery] Guid? branchId)
        {
            var effectiveBranchId = branchId ?? _currentUserService.BranchId ?? Guid.Empty;
            return await Mediator.Send(new CodeX.Application.Features.Doctors.Queries.GetDoctorsList.GetDoctorsListQuery(effectiveBranchId));
        }

        [HttpGet("sessions")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<List<CodeX.Application.Features.Sessions.Queries.GetSessionsList.SessionDto>>> GetSessions([FromQuery] Guid doctorId, [FromQuery] Guid? branchId)
        {
            return await Mediator.Send(new CodeX.Application.Features.Sessions.Queries.GetSessionsList.GetSessionsListQuery(doctorId, branchId));
        }

        [HttpPost("{queueId}/next")]
        [HasPermission(SystemPermissions.Queue.CallNext)]
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
        [HasPermission(SystemPermissions.Queue.MarkDoctorArrived)]
        public async Task<ActionResult<bool>> Arrived(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new DoctorArrivedCommand(queueId));
        }

        [HttpPost("{queueId}/skip")]
        [HasPermission(SystemPermissions.Queue.SkipToken)]
        public async Task<ActionResult<bool>> Skip(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new SkipTokenCommand(queueId));
        }

        [HttpPost("{queueId}/complete")]
        [HasPermission(SystemPermissions.Queue.CompleteToken)]
        public async Task<ActionResult<bool>> Complete(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.CompleteToken.CompleteTokenCommand(queueId));
        }

        [HttpPost("{queueId}/end")]
        [HasPermission(SystemPermissions.Queue.EndSession)]
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
        [HasPermission(SystemPermissions.Queue.EndSession)]
        public async Task<ActionResult<bool>> Cancel(Guid queueId)
        {
            if (!await CanAccessQueue(queueId))
            {
                return Forbid();
            }

            return await Mediator.Send(new CancelQueueCommand(queueId));
        }

        [HttpGet("stats/{branchId}")]
        [HasPermission(SystemPermissions.Queue.View)]
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
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<object>> GetQueueDetails(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
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
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id
            });
        }

        [HttpGet("{queueId}/tokens/upcoming")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<List<object>>> GetUpcomingTokens(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
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
                    patientName = t.Patient?.Name ?? "Unknown",
                    patientPhone = t.Patient?.Phone ?? "",
                    source = t.Source,
                    status = t.Status,
                    createdAt = t.CreatedAt,
                    completedAt = t.CompletedAt,
                    updatedAt = t.UpdatedAt
                })
                .ToList();

            return Ok(upcoming);
        }

        [HttpGet("active/{doctorId}")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<object>> GetActiveQueue(Guid doctorId)
        {
            var query = _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Branch)
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
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id,
                branchName = queue.Branch?.Name
            });
        }

        [HttpGet("active/{doctorId}/{sessionId}")]
        [HasPermission(SystemPermissions.Queue.View)]
        public async Task<ActionResult<object>> GetActiveQueueBySession(Guid doctorId, Guid sessionId)
        {
            var sessionObj = await _context.Sessions.Include(s => s.Branch).FirstOrDefaultAsync(s => s.Id == sessionId);
            if (sessionObj == null) return Ok(null);
            
            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(sessionObj.Branch?.Timezone);
            var tomorrow = today.AddDays(1);
            
            var query = _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
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

            return Ok(new
            {
                id = queue.Id,
                status = queue.Status,
                currentTokenNumber = queue.CurrentTokenNumber,
                waitingCount,
                currentPatientName = currentToken?.Patient?.Name ?? "No one",
                currentPatientId = currentToken?.PatientId,
                currentTokenId = currentToken?.Id
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
                    upcomingTokens = upcoming
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

            if (_currentUserService.BranchId.HasValue && _currentUserService.BranchId.Value != Guid.Empty)
            {
                query = query.Where(q => q.BranchId == _currentUserService.BranchId.Value);
            }

            // If user has a DoctorId, restrict them to their own queues
            if (_currentUserService.DoctorId.HasValue)
            {
                query = query.Where(q => q.DoctorId == _currentUserService.DoctorId.Value);
            }

            return await query.AnyAsync();
        }
    }
}
