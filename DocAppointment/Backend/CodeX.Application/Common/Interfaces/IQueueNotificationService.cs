namespace CodeX.Application.Common.Interfaces
{
    public interface IQueueNotificationService
    {
        Task NotifyTokenUpdated(Guid branchId, Guid queueId, int newTokenNumber);
        Task NotifyDoctorArrived(Guid branchId, Guid queueId, string doctorName);
        Task NotifyQueueEnded(Guid branchId, Guid queueId);
    }
}
