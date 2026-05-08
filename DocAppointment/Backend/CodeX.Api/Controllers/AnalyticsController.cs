using Microsoft.AspNetCore.Mvc;
using MediatR;
using CodeX.Application.Features.Analytics.Queries.GetHistoricalStats;
using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Controllers
{
    [ApiController]
    public class AnalyticsController : BaseApiController
    {
        [HttpGet("historical/{branchId}")]
        public async Task<ActionResult<HistoricalStatsDto>> GetHistoricalStats(Guid branchId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            var query = new GetHistoricalStatsQuery(branchId, startDate, endDate);
            var result = await Mediator.Send(query);
            return Ok(result);
        }
    }
}
