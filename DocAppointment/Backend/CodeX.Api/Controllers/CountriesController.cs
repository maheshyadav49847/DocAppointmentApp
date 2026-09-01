using CodeX.Application.Features.Countries.Queries.GetCountries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class CountriesController : BaseApiController
    {
        [HttpGet]
        public async Task<ActionResult<List<CountryDto>>> Get()
        {
            // Allowed for all users including anonymous if needed, but currently keeping it open or authorized based on global filter
            return await Mediator.Send(new GetCountriesQuery());
        }
    }
}
