using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Analytics.Queries.GetHistoricalStats;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class AnalyticsController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;
        private readonly IApplicationDbContext _context;

        public AnalyticsController(ICurrentUserService currentUserService, IApplicationDbContext context)
        {
            _currentUserService = currentUserService;
            _context = context;
        }

        [HttpGet("historical/{branchId}")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<HistoricalStatsDto>> GetHistoricalStats(Guid branchId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            // Enforcement: If user is branch-specific, they can only see their own branch
            if (_currentUserService.BranchId.HasValue &&
                _currentUserService.BranchId != branchId)
            {
                return Forbid();
            }

            // Enforcement: Org isolation
            if (_currentUserService.OrgId != Guid.Empty)
            {
                var branchExists = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == _currentUserService.OrgId);
                if (!branchExists) return Forbid();
            }

            var query = new GetHistoricalStatsQuery(branchId, startDate, endDate);
            var result = await Mediator.Send(query);
            return Ok(result);
        }
    }
}
