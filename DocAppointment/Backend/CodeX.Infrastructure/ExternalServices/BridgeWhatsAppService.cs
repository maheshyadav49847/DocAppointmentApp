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

        private string BridgeBaseUrl => (_config["WhatsApp:BridgeBaseUrl"] ?? "http://localhost:3100").TrimEnd('/');
        private string? ApiKey => _config["WhatsApp:BridgeApiKey"];

        public BridgeWhatsAppService(HttpClient httpClient, IConfiguration config, ILogger<BridgeWhatsAppService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber)
        {
            string msg =
                $"Booking confirmed.\n\n" +
                $"Hello {patientName},\n" +
                $"Your token number is #{tokenNumber}.\n\n" +
                $"Please arrive on time. We will notify you when your turn approaches.";
            return SendTextMessage(phoneNumber, msg);
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName)
        {
            string msg =
                $"Doctor arrived.\n\n" +
                $"Dr. {doctorName} is now present at the clinic.\n" +
                $"The queue is active. Please be ready.";
            return SendTextMessage(phoneNumber, msg);
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber)
        {
            string msg =
                $"Your turn is now.\n\n" +
                $"Token #{tokenNumber}: please proceed to the consultation room immediately.";
            return SendTextMessage(phoneNumber, msg);
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft)
        {
            string msg =
                $"Almost your turn.\n\n" +
                $"Only {tokensLeft} patient(s) are ahead of you.\n" +
                $"Please be ready.";
            return SendTextMessage(phoneNumber, msg);
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId)
        {
            string msg =
                $"How was your visit?\n\n" +
                $"Thank you for consulting Dr. {doctorName}.\n" +
                $"Reply with a number from 1 to 5.\n\n" +
                $"Reference: {tokenId}";
            return SendTextMessage(phoneNumber, msg);
        }

        public Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson)
        {
            _logger.LogInformation("Bridge provider does not support templates. Falling back to plain text send.");
            return SendTextMessage(toPhoneNumber, $"Template {contentSid}: {variablesJson}");
        }

        public async Task SendTextMessage(string toPhoneNumber, string message)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeBaseUrl}/send")
            {
                Content = JsonContent.Create(new SendMessageRequest
                {
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
                _logger.LogError("Bridge send failed. Status={Status}, Body={Body}", response.StatusCode, body);
                response.EnsureSuccessStatusCode();
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
            public string To { get; init; } = string.Empty;
            public string Message { get; init; } = string.Empty;
        }
    }
}
