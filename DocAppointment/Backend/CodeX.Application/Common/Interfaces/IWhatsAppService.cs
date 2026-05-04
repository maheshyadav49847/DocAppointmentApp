namespace CodeX.Application.Common.Interfaces
{
    public interface IWhatsAppService
    {
        // ─── Patient Notifications ────────────────────────────────────────────
        Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber);
        Task SendDoctorArrivalAlert(string phoneNumber, string doctorName);
        Task SendYourTurnAlert(string phoneNumber, int tokenNumber);
        Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft);
        Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId);

        // ─── Templated Messages (Twilio Content API) ──────────────────────────
        Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson);

        // ─── Bot Reply (send a raw text reply to an incoming WhatsApp message) ─
        Task SendTextMessage(string toPhoneNumber, string message);

        // ─── Health Check ─────────────────────────────────────────────────────
        Task<bool> TestConnection(string accountSid, string authToken, string fromNumber);
    }
}
