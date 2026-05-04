using Microsoft.AspNetCore.Mvc;
using MediatR;
using CodeX.Application.Features.Ratings.Commands.CreateRating;
using CodeX.Application.Features.Ratings.Queries.GetDoctorRatings;
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RatingsController : ControllerBase
    {
        private readonly ISender _mediator;

        public RatingsController(ISender mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Public endpoint for patients to submit a rating after their visit.
        /// Does not require authentication so it can be called from a WhatsApp link.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> CreateRating([FromBody] CreateRatingCommand command)
        {
            try
            {
                var ratingId = await _mediator.Send(command);
                return Ok(new { id = ratingId, message = "Thank you for your feedback!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets the aggregated ratings and recent feedback for a specific doctor.
        /// </summary>
        [HttpGet("doctor/{doctorId}")]
        [Authorize]
        public async Task<IActionResult> GetDoctorRatings(Guid doctorId)
        {
            var result = await _mediator.Send(new GetDoctorRatingsQuery { DoctorId = doctorId });
            return Ok(result);
        }
    }
}
