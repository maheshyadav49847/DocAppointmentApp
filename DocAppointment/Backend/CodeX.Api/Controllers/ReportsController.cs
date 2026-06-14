using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CodeX.Application.Features.Reports.Queries.GetBranchAnalytics;
using CodeX.Domain.Enums;
using CodeX.Application.Common.Interfaces;

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

        [HttpGet("branch-analytics")]
        public async Task<ActionResult<BranchAnalyticsDto>> GetBranchAnalytics(
            [FromQuery] Guid? branchId, 
            [FromQuery] DateTime? startDate, 
            [FromQuery] DateTime? endDate)
        {
            var orgId = _currentUserService.OrgId;
            
            var isSuperAdmin = _currentUserService.IsInRole("SuperAdmin");
            
            // Default to last 30 days if no dates provided
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Enforcement: If user is BranchAdmin, they can only see their own branch
            var effectiveBranchId = branchId;
            if (_currentUserService.IsInRole(nameof(StaffRole.BranchAdmin)) || _currentUserService.IsInRole(nameof(StaffRole.Receptionist)))
            {
                effectiveBranchId = _currentUserService.BranchId;
            }

            return await Mediator.Send(new GetBranchAnalyticsQuery(orgId, effectiveBranchId, start, end, isSuperAdmin));
        }
    }
}
