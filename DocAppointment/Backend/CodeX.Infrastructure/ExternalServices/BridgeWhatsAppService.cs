using System.Net.Http.Json;
using CodeX.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.ExternalServices
{
    public class BridgeWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<BridgeWhatsAppService> _logger;

        private string BridgeBaseUrl => (_config["WhatsApp:BridgeBaseUrl"] ?? throw new Exception("WhatsApp:BridgeBaseUrl is not configured")).TrimEnd('/');
        private string? ApiKey => _config["WhatsApp:BridgeApiKey"];

        public BridgeWhatsAppService(HttpClient httpClient, IConfiguration config, ILogger<BridgeWhatsAppService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var waitTimeMsg = estimatedWaitMinutes.HasValue 
                ? $"⏱️ *Estimated Wait:* ~{estimatedWaitMinutes.Value} mins\n\n" 
                : "";
                
            var message =
                $"🏥 *APPOINTMENT CONFIRMED* 🏥\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Hello *{patientName}* 🙏,\n\n" +
                $"Aapka doctor appointment safaltapoorvak book ho gaya hai.\n\n" +
                $"🔢 *Aapka Token Number:* #{tokenNumber}\n\n" +
                waitTimeMsg +
                $"📌 *Zaroori Baatein:*\n" +
                $"• Kripya samay par clinic pahunchein.\n" +
                $"• Aapko baar-baar poochna nahi padega, aapka number aane se pehle hum aapko WhatsApp par alert bhej denge.\n\n" +
                $"✨ _Aapke acche swasthya ke liye humari shubhkaamnayein!_";
            return SendTextMessage(phoneNumber, message, branchId);
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var message =
                $"👨‍⚕️ *DOCTOR CLINIC ME HAIN* 👨‍⚕️\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Namaste 🙏,\n\n" +
                $"Aapko batate hue khushi ho rahi hai ki *Dr. {doctorName}* clinic pahunch chuke hain aur check-up shuru ho gaya hai.\n\n" +
                $"👉 Kripya clinic ke waiting area me tayyar rahein.\n\n" +
                $"✨ _Humari team aapki sahayata ke liye hamesha tatpar hai._";
            return SendTextMessage(phoneNumber, message, branchId);
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            var message =
                $"🔔 *AAPKA NUMBER AA GAYA HAI!* 🔔\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"👉 *Token #{tokenNumber}*\n\n" +
                $"Kripya turant doctor ke consultation room me check-up ke liye andar aaiye. Doctor aapka intezaar kar rahe hain.\n\n" +
                $"✨ _Swasth rahein, mast rahein!_";
            return SendTextMessage(phoneNumber, message, branchId);
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            var message =
                $"⏳ *AAPKA NUMBER AANE WALA HAI* ⏳\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Namaste 🙏,\n\n" +
                $"Aapke aage ab sirf *{tokensLeft} patient(s)* bache hain.\n\n" +
                $"👉 Kripya doctor ke cabin ke paas aakar tayyar rahein. Aapka number agla ho sakta hai!\n\n" +
                $"✨ _Aapke samay aur dhairya ke liye dhanyawad._";
            return SendTextMessage(phoneNumber, message, branchId);
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            var shortRef = $"CX-{tokenId.ToString().Substring(0, 6).ToUpper()}";
            var message =
                $"🌟 *AAPKA EXPERIENCE KAISA RAHA?* 🌟\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Namaste 🙏,\n\n" +
                $"Aaj *Dr. {doctorName}* se consultation ke liye dhanyawad.\n\n" +
                $"Kripya is message ke reply me *1 se 5* ke beech koi ek number bhej kar apna anubhav batayein:\n\n" +
                $"⭐⭐⭐⭐⭐ - *5* (Bahut Accha)\n" +
                $"⭐⭐⭐⭐ - *4* (Accha)\n" +
                $"⭐⭐⭐ - *3* (Theek)\n" +
                $"⭐⭐ - *2* (Sudhaar ki zaroorat)\n" +
                $"⭐ - *1* (Khaas nahi)\n\n" +
                $"Aapka feedback humari service ko behtar banane me madad karega. 🙌\n" +
                $"_Ref: {shortRef}_";
            return SendTextMessage(phoneNumber, message, branchId);
        }

        public Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson, Guid branchId)
        {
            _logger.LogInformation("Bridge provider does not support templates. Falling back to plain text send.");
            return SendTextMessage(toPhoneNumber, $"Template {contentSid}: {variablesJson}", branchId);
        }

        public async Task SendTextMessage(string toPhoneNumber, string message, Guid branchId)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeBaseUrl}/send-message")
            {
                Content = JsonContent.Create(new SendMessageRequest
                {
                    BranchId = branchId,
                    To = toPhoneNumber,
                    Message = message
                })
            };

            if (!string.IsNullOrWhiteSpace(ApiKey))
            {
                request.Headers.Add("X-Bridge-Api-Key", ApiKey);
            }

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError("Bridge send failed for branch {BranchId}. Status={Status}, Body={Body}", branchId, response.StatusCode, body);
            }
        }

        public async Task<bool> TestConnection(string accountSid, string authToken, string fromNumber)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeBaseUrl}/health");
                if (!string.IsNullOrWhiteSpace(ApiKey))
                {
                    request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                }

                var response = await _httpClient.SendAsync(request);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bridge health check failed.");
                return false;
            }
        }

        private sealed class SendMessageRequest
        {
            public Guid BranchId { get; init; }
            public string To { get; init; } = string.Empty;
            public string Message { get; init; } = string.Empty;
        }
    }
}
