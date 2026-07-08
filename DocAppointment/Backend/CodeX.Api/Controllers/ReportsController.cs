using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Reports.Queries.GetBranchAnalytics;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class ReportsController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public ReportsController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet("branches")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<List<CodeX.Domain.Entities.Branch>>> GetBranches()
        {
            return await Mediator.Send(new CodeX.Application.Features.Branches.Queries.GetBranches.GetBranchesQuery());
        }

        [HttpGet("branch-analytics")]
        [HasPermission(SystemPermissions.Analytics.View)]
        public async Task<ActionResult<BranchAnalyticsDto>> GetBranchAnalytics(
            [FromQuery] Guid? branchId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;

            var isSuperAdmin = _currentUserService.OrgId == Guid.Empty;

            // Default to last 30 days if no dates provided
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Enforcement: If user is branch-specific, they can only see their own branch
            var effectiveBranchId = branchId;
            if (_currentUserService.BranchId.HasValue)
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetBranchAnalyticsQuery(orgId, effectiveBranchId, start, end, isSuperAdmin));
        }
    }
}
