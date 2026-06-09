using Microsoft.AspNetCore.SignalR;
using CodeX.Api.Hubs;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Services
{
    public class QueueNotificationService : IQueueNotificationService
    {
        private readonly IHubContext<QueueHub> _hubContext;
        private readonly IApplicationDbContext _context;

        public QueueNotificationService(IHubContext<QueueHub> hubContext, IApplicationDbContext context)
        {
            _hubContext = hubContext;
            _context = context;
        }

        private async Task SaveNotificationAsync(Guid branchId, string title, string message, string type)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch != null)
            {
                var notification = new Notification
                {
                    BranchId = branchId,
                    OrganizationId = branch.OrganizationId,
                    Title = title,
                    Message = message,
                    Type = type,
                    IsRead = false
                };
                _context.Notifications.Add(notification);
                await _context.SaveChangesAsync(default);
            }
        }

        public async Task NotifyTokenUpdated(Guid branchId, Guid queueId, int newTokenNumber)
        {
            await SaveNotificationAsync(branchId, "Queue Updated", $"Token #{newTokenNumber} is now active.", "Info");
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("TokenUpdated", new { QueueId = queueId, TokenNumber = newTokenNumber });
        }

        public async Task NotifyDoctorArrived(Guid branchId, Guid queueId, string doctorName)
        {
            await SaveNotificationAsync(branchId, "Doctor Arrived", $"Dr. {doctorName} has arrived and started the session.", "Success");
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("DoctorArrived", new { QueueId = queueId, DoctorName = doctorName });
        }

        public async Task NotifyQueueEnded(Guid branchId, Guid queueId)
        {
            await SaveNotificationAsync(branchId, "Session Ended", "The queue session has been ended.", "Alert");
            await _hubContext.Clients.Group(branchId.ToString())
                .SendAsync("QueueEnded", new { QueueId = queueId });
        }
    }
}
