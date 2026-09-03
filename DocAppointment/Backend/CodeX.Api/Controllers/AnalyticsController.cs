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

        [HttpGet("operational")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<CodeX.Application.Features.Analytics.Queries.GetOperationalAnalytics.OperationalAnalyticsDto>> GetOperationalAnalytics(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate, 
            [FromQuery] Guid? branchId)
        {
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            var query = new CodeX.Application.Features.Analytics.Queries.GetOperationalAnalytics.GetOperationalAnalyticsQuery
            {
                OrganizationId = _currentUserService.OrgId,
                BranchId = effectiveBranchId,
                StartDate = startDate,
                EndDate = endDate
            };

            var result = await Mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("financial")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<CodeX.Application.Features.Analytics.Queries.GetFinancialAnalytics.FinancialAnalyticsDto>> GetFinancialAnalytics(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate, 
            [FromQuery] Guid? branchId)
        {
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            var query = new CodeX.Application.Features.Analytics.Queries.GetFinancialAnalytics.GetFinancialAnalyticsQuery
            {
                OrganizationId = _currentUserService.OrgId,
                BranchId = effectiveBranchId,
                StartDate = startDate,
                EndDate = endDate
            };

            var result = await Mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("clinical")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<CodeX.Application.Features.Analytics.Queries.GetClinicalAnalytics.ClinicalAnalyticsDto>> GetClinicalAnalytics(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate, 
            [FromQuery] Guid? branchId)
        {
            var effectiveBranchId = _currentUserService.BranchId ?? branchId;

            var query = new CodeX.Application.Features.Analytics.Queries.GetClinicalAnalytics.GetClinicalAnalyticsQuery
            {
                OrganizationId = _currentUserService.OrgId,
                BranchId = effectiveBranchId,
                StartDate = startDate,
                EndDate = endDate
            };

            var result = await Mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("system")]
        [Authorize(Roles = "SuperAdmin")]
        public async Task<ActionResult<CodeX.Application.Features.Analytics.Queries.GetSystemAnalytics.SystemAnalyticsDto>> GetSystemAnalytics()
        {
            return await Mediator.Send(new CodeX.Application.Features.Analytics.Queries.GetSystemAnalytics.GetSystemAnalyticsQuery());
        }
    }
}
