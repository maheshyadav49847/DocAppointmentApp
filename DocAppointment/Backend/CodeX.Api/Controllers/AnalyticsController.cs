using Microsoft.AspNetCore.Mvc;
using MediatR;
using CodeX.Application.Features.Analytics.Queries.GetHistoricalStats;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class AnalyticsController : BaseApiController
    {
        private readonly ICurrentUserService _currentUserService;

        public AnalyticsController(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        [HttpGet("historical/{branchId}")]
        public async Task<ActionResult<HistoricalStatsDto>> GetHistoricalStats(Guid branchId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            // Enforcement: If user is BranchAdmin or Receptionist, they can only see their own branch
            if (!_currentUserService.IsInRole(nameof(StaffRole.SuperAdmin)) && 
                _currentUserService.BranchId.HasValue && 
                _currentUserService.BranchId != branchId)
            {
                return Forbid();
            }

            var query = new GetHistoricalStatsQuery(branchId, startDate, endDate);
            var result = await Mediator.Send(query);
            return Ok(result);
        }
    }
}
