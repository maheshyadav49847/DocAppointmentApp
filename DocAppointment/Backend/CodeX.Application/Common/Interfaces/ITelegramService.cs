using System;
using System.Threading.Tasks;

namespace CodeX.Application.Common.Interfaces
{
    public interface ITelegramService
    {
        // --- Patient Notifications --------------------------------------------
        Task SendWelcomeMessage(string chatId, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null, string? lang = null);
        Task SendDoctorArrivalAlert(string chatId, string doctorName, Guid branchId, string? lang = null);
        Task SendYourTurnAlert(string chatId, int tokenNumber, Guid branchId, string? lang = null);
        Task SendUpcomingTurnAlert(string chatId, int tokensLeft, Guid branchId, string? lang = null);
        Task SendFeedbackRequest(string chatId, string doctorName, Guid tokenId, Guid branchId, string? lang = null);
        Task SendSessionCancelledAlert(string chatId, string doctorName, Guid branchId, string? lang = null);
        Task SendSessionTransferredAlert(string chatId, string doctorName, string newSessionName, int newTokenNumber, Guid branchId, string? lang = null);

        // --- Bot Reply --------------------------------------------------------
        Task SendTextMessage(string chatId, string message, Guid branchId);

        // --- Send Document / PDF ----------------------------------------------
        Task SendDocumentMessage(string chatId, string message, string fileName, string base64Data, Guid branchId);
    }
}
