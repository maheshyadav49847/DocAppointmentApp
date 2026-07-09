using CodeX.Api.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [HasPermission(SystemPermissions.Settings.View)]
    public class AuditLogsController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public AuditLogsController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50)
        {
            var orgId = _currentUserService.OrgId;
            var query = _context.AuditLogs.AsQueryable();

            if (orgId != Guid.Empty)
            {
                query = query.Where(a => a.OrganizationId == orgId);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(a =>
                    a.Action.ToLower().Contains(searchLower) ||
                    a.Path.ToLower().Contains(searchLower) ||
                    (a.UserId != null && a.UserId.ToLower().Contains(searchLower)));
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / limit);

            var logs = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            var userIds = logs.Where(l => !string.IsNullOrEmpty(l.UserId))
                              .Select(l => l.UserId!)
                              .Distinct()
                              .ToList();

            var validGuids = userIds.Where(id => Guid.TryParse(id, out _)).Select(Guid.Parse).ToList();

            var usersMap = await _context.Staff
                .Where(s => validGuids.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id.ToString(), s => s.FirstName + " " + s.LastName);

            var result = logs.Select(l => new
            {
                l.Id,
                l.UserId,
                UserName = !string.IsNullOrEmpty(l.UserId) && usersMap.ContainsKey(l.UserId) ? usersMap[l.UserId] : null,
                l.OrganizationId,
                l.Action,
                l.Path,
                l.Method,
                l.IpAddress,
                l.RequestPayload,
                l.StatusCode,
                l.Timestamp
            });

            return Ok(new
            {
                data = result,
                totalCount = totalCount,
                totalPages = totalPages,
                currentPage = page
            });
        }
    }
}
