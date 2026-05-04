using Microsoft.AspNetCore.SignalR;

namespace CodeX.Api.Hubs
{
    public class QueueHub : Hub
    {
        public async Task JoinBranchGroup(string branchId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, branchId);
        }

        public async Task LeaveBranchGroup(string branchId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, branchId);
        }
    }
}
