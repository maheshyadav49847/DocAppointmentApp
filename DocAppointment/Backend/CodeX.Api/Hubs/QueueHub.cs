using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using CodeX.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Hubs
{
    [Authorize]
    public class QueueHub : Hub
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public QueueHub(IApplicationDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task JoinBranchGroup(string branchId)
        {
            // IDOR Protection: Verify branch belongs to user's Org
            if (Guid.TryParse(branchId, out var branchGuid))
            {
                var belongsToOrg = await _context.Branches
                    .AnyAsync(b => b.Id == branchGuid && b.OrganizationId == _currentUser.OrgId);

                if (belongsToOrg || _currentUser.IsInRole("SuperAdmin"))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, branchId);
                }
            }
        }

        public async Task LeaveBranchGroup(string branchId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, branchId);
        }
    }
}
