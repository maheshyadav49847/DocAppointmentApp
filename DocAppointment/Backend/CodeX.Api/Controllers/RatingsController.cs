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
        private readonly CodeX.Application.Common.Interfaces.IApplicationDbContext _context;
        private readonly CodeX.Application.Common.Interfaces.ICurrentUserService _currentUserService;

        public RatingsController(ISender mediator, CodeX.Application.Common.Interfaces.IApplicationDbContext context, CodeX.Application.Common.Interfaces.ICurrentUserService currentUserService)
        {
            _mediator = mediator;
            _context = context;
            _currentUserService = currentUserService;
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
            // Enforcement: Ensure doctor belongs to current user's organization
            if (!_currentUserService.IsInRole("SuperAdmin"))
            {
                var doctorExists = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(_context.Doctors, d => d.Id == doctorId && d.OrganizationId == _currentUserService.OrgId);
                if (!doctorExists)
                {
                    return Forbid();
                }
            }

            var result = await _mediator.Send(new GetDoctorRatingsQuery { DoctorId = doctorId });
            return Ok(result);
        }
    }
}
