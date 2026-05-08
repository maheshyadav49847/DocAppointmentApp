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

        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId)
        {
            string msg =
                $"Booking confirmed.\n\n" +
                $"Hello {patientName},\n" +
                $"Your token number is #{tokenNumber}.\n\n" +
                $"Please arrive on time. We will notify you when your turn approaches.";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            string msg =
                $"Doctor arrived.\n\n" +
                $"Dr. {doctorName} is now present at the clinic.\n" +
                $"The queue is active. Please be ready.";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            string msg =
                $"Your turn is now.\n\n" +
                $"Token #{tokenNumber}: please proceed to the consultation room immediately.";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            string msg =
                $"Almost your turn.\n\n" +
                $"Only {tokensLeft} patient(s) are ahead of you.\n" +
                $"Please be ready.";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            string msg =
                $"How was your visit?\n\n" +
                $"Thank you for consulting Dr. {doctorName}.\n" +
                $"Reply with a number from 1 to 5.\n\n" +
                $"Reference: {tokenId}";
            return SendTextMessage(phoneNumber, msg, branchId);
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
                    SessionId = branchId.ToString(),
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
                _logger.LogError("Bridge send failed for session {SessionId}. Status={Status}, Body={Body}", branchId, response.StatusCode, body);
            }
        }

        public async Task<bool> TestConnection(string accountSid, string authToken, string fromNumber)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeBaseUrl}/status/test");
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
            public string SessionId { get; init; } = string.Empty;
            public string To { get; init; } = string.Empty;
            public string Message { get; init; } = string.Empty;
        }
    }
}
