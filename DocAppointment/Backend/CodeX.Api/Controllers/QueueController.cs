using CodeX.Application.Features.Queue.Commands.CallNextToken;
using CodeX.Application.Features.Queue.Commands.DoctorArrived;
using CodeX.Application.Features.Queue.Commands.CreateDailyQueue;
using CodeX.Application.Features.Queue.Commands.SkipToken;
using CodeX.Application.Features.Queue.Commands.EndQueue;
using CodeX.Application.Features.Queue.Queries.GetQueueStats;
using CodeX.Application.Features.Queue.Commands.AlertPatient;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Api.Controllers
{
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
        public async Task<ActionResult<Guid>> Create(CreateDailyQueueCommand command)
        {
            return await Mediator.Send(command);
        }

        [HttpPost("{queueId}/next")]
        public async Task<ActionResult<int>> Next(Guid queueId)
        {
            try
            {
                var result = await Mediator.Send(new CallNextTokenCommand(queueId));
                return Ok(result);
            }
            catch (Exception ex)
            {
                // Return 400 for domain exceptions like "No more tokens"
                if (ex.Message.Contains("No more pending tokens"))
                {
                    return BadRequest(new { message = ex.Message });
                }
                return StatusCode(500, new { message = "An error occurred while processing the queue.", detail = "Please contact support if the issue persists." });
            }
        }

        [HttpPost("{queueId}/arrived")]
        public async Task<ActionResult<bool>> Arrived(Guid queueId)
        {
            return await Mediator.Send(new DoctorArrivedCommand(queueId));
        }

        [HttpPost("{queueId}/skip")]
        public async Task<ActionResult<bool>> Skip(Guid queueId)
        {
            return await Mediator.Send(new SkipTokenCommand(queueId));
        }

        [HttpPost("{queueId}/complete")]
        public async Task<ActionResult<bool>> Complete(Guid queueId)
        {
            return await Mediator.Send(new CodeX.Application.Features.Queue.Commands.CompleteToken.CompleteTokenCommand(queueId));
        }

        [HttpPost("{queueId}/end")]
        public async Task<ActionResult<bool>> End(Guid queueId)
        {
            return await Mediator.Send(new EndQueueCommand(queueId));
        }

        [HttpPost("{queueId}/alert")]
        public async Task<ActionResult<bool>> Alert(Guid queueId)
        {
            return await Mediator.Send(new AlertPatientCommand(queueId));
        }

        [HttpGet("stats/{branchId}")]
        public async Task<ActionResult<QueueStatsDto>> GetStats(Guid branchId)
        {
            // IDOR Protection
            var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == _currentUserService.OrgId);
            if (!branchExists && !_currentUserService.IsInRole("SuperAdmin")) return Forbid();

            return await Mediator.Send(new GetQueueStatsQuery(branchId));
        }

        [HttpGet("{queueId}")]
        public async Task<ActionResult<object>> GetQueueDetails(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Doctor)
                .Include(q => q.Branch)
                .Include(q => q.Session)
                .FirstOrDefaultAsync(q => q.Id == queueId && q.Branch.OrganizationId == _currentUserService.OrgId);

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
                doctorName = queue.Doctor?.Name ?? "Unknown Doctor",
                sessionName = queue.Session?.SessionName ?? "Unknown Session",
                waitingCount,
                completedCount,
                skippedCount,
                currentPatientName = currentToken?.Patient?.Name ?? "No one"
            });
        }

        [HttpGet("{queueId}/tokens/upcoming")]
        public async Task<ActionResult<List<object>>> GetUpcomingTokens(Guid queueId)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Include(q => q.Doctor)
                .Include(q => q.Branch)
                .FirstOrDefaultAsync(q => q.Id == queueId && q.Branch.OrganizationId == _currentUserService.OrgId);

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

        [HttpGet("active/{doctorId}/{sessionId}")]
        public async Task<ActionResult<object>> GetActiveQueueBySession(Guid doctorId, Guid sessionId)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var queue = await _context.DailyQueues
                .Include(q => q.Tokens)
                .ThenInclude(t => t.Patient)
                .Where(q => q.DoctorId == doctorId && q.SessionId == sessionId && q.QueueDate >= today && q.QueueDate < tomorrow && q.Status != QueueStatus.Completed && q.Status != QueueStatus.Cancelled)
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
                currentPatientName = currentToken?.Patient?.Name ?? "No one"
            });
        }

        [HttpGet("active/{doctorId}")]
        public async Task<ActionResult<Guid>> GetActiveQueue(Guid doctorId)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var queue = await _context.DailyQueues
                .Where(q => q.DoctorId == doctorId && q.QueueDate >= today && q.QueueDate < tomorrow)
                .OrderByDescending(q => q.CreatedAt)
                .FirstOrDefaultAsync();
 
            return queue?.Id ?? Guid.Empty;
        }
    }
}
