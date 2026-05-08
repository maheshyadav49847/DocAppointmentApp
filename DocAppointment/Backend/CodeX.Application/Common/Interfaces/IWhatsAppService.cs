namespace CodeX.Application.Common.Interfaces
{
    public interface IWhatsAppService
    {
        // ─── Patient Notifications ────────────────────────────────────────────
        Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId);
        Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId);
        Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId);
        Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId);
        Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId);

        // ─── Templated Messages (Twilio Content API) ──────────────────────────
        Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson, Guid branchId);

        // ─── Bot Reply (send a raw text reply to an incoming WhatsApp message) ─
        Task SendTextMessage(string toPhoneNumber, string message, Guid branchId);

        // ─── Health Check ─────────────────────────────────────────────────────
        Task<bool> TestConnection(string accountSid, string authToken, string fromNumber);
    }
}
