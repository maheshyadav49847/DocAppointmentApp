using Microsoft.AspNetCore.SignalR;
using CodeX.Api.Hubs;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Api.Services
{
    public class QueueNotificationService : IQueueNotificationService
    {
        private readonly IHubContext<QueueHub> _hubContext;

        public QueueNotificationService(IHubContext<QueueHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task NotifyTokenUpdated(Guid branchId, Guid queueId, int newTokenNumber)
        {
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("TokenUpdated", new { QueueId = queueId, TokenNumber = newTokenNumber });
        }

        public async Task NotifyDoctorArrived(Guid branchId, Guid queueId, string doctorName)
        {
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("DoctorArrived", new { QueueId = queueId, DoctorName = doctorName });
        }

        public async Task NotifyQueueEnded(Guid branchId, Guid queueId)
        {
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("QueueEnded", new { QueueId = queueId });
        }
    }
}
