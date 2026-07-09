using Microsoft.AspNetCore.SignalR;
using CodeX.Application.Common.Interfaces;
using CodeX.Api.Hubs;

namespace CodeX.Api.Services
{
    public class SignalRNotificationService : ISignalRNotificationService
    {
        private readonly IHubContext<AppHub> _hubContext;

        public SignalRNotificationService(IHubContext<AppHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task SendRolePermissionsUpdatedAsync(Guid orgId, string roleName, CancellationToken cancellationToken)
        {
            var groupName = $"Org_{orgId}_Role_{roleName}";
            await _hubContext.Clients.Group(groupName).SendAsync("RolePermissionsUpdated", roleName, cancellationToken);
        }
    }
}
