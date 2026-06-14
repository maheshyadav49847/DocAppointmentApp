using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class NotificationsController : BaseApiController
    {
        private readonly IApplicationDbContext _context;

        public NotificationsController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("branch/{branchId}")]
        public async Task<IActionResult> GetBranchNotifications(Guid branchId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.BranchId == branchId && !n.IsDeleted)
                .OrderByDescending(n => n.CreatedAt)
                .Take(50)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.CreatedAt,
                    n.IsRead
                })
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return NotFound();

            notification.IsRead = true;
            await _context.SaveChangesAsync(default);
            return Ok();
        }

        [HttpPost("branch/{branchId}/read-all")]
        public async Task<IActionResult> MarkAllAsRead(Guid branchId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.BranchId == branchId && !n.IsRead && !n.IsDeleted)
                .ToListAsync();

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
            }

            await _context.SaveChangesAsync(default);
            return Ok();
        }
    }
}
