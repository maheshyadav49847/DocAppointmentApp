using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Api.Hubs
{
    [Authorize]
    public class AppHub : Hub
    {
        private readonly ICurrentUserService _currentUser;

        public AppHub(ICurrentUserService currentUser)
        {
            _currentUser = currentUser;
        }

        public override async Task OnConnectedAsync()
        {
            // Join a group based on the user's role to receive role-specific updates
            var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            var orgId = _currentUser.OrgId;

            if (!string.IsNullOrEmpty(role) && orgId != Guid.Empty)
            {
                var groupName = $"Org_{orgId}_Role_{role}";
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            }

            await base.OnConnectedAsync();
        }
    }
}
