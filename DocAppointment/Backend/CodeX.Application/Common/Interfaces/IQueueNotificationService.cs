namespace CodeX.Application.Common.Interfaces
{
    public interface IQueueNotificationService
    {
        Task NotifyQueueStarted(Guid branchId, Guid queueId);
        Task NotifyTokenUpdated(Guid branchId, Guid queueId, int newTokenNumber);
        Task NotifyDoctorArrived(Guid branchId, Guid queueId, string doctorName);
        Task NotifyQueueEnded(Guid branchId, Guid queueId);
        Task NotifyTokenCreated(Guid branchId, Guid queueId, int tokenNumber, string patientName);
        Task NotifyConsultationSaved(Guid branchId, Guid? tokenId, Guid patientId, string patientName);
        Task NotifyOutboxStatusChanged(Guid branchId, Guid outboxId, string status, string channel, string? error = null);
        Task NotifyInvoiceUpdated(Guid branchId, Guid invoiceId, string invoiceNumber, string status);
    }
}
