using System.Net.Http.Json;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.ExternalServices
{
    public class BridgeWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<BridgeWhatsAppService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        private string BridgeBaseUrl => (_config["WhatsApp:BridgeBaseUrl"] ?? throw new Exception("WhatsApp:BridgeBaseUrl is not configured")).TrimEnd('/');
        private string? ApiKey => _config["WhatsApp:BridgeApiKey"];

        public BridgeWhatsAppService(HttpClient httpClient, IConfiguration config, ILogger<BridgeWhatsAppService> logger, IServiceScopeFactory scopeFactory)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        private async Task<string> GetUserLanguageAsync(string phoneNumber)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var session = await dbContext.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == phoneNumber);
                return session?.Language ?? "1"; // Default to Hindi
            }
            catch
            {
                return "1";
            }
        }

        public async Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var waitTimeMsg = estimatedWaitMinutes.HasValue 
                ? WhatsAppTranslationHelper.Get(lang, "ESTIMATED_WAIT_MSG", estimatedWaitMinutes.Value) 
                : "";
                
            var message = WhatsAppTranslationHelper.Get(lang, "BOOKING_CONFIRMED_ALERT", patientName, tokenNumber, waitTimeMsg);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var message = WhatsAppTranslationHelper.Get(lang, "DOCTOR_ARRIVED_ALERT", doctorName);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var message = WhatsAppTranslationHelper.Get(lang, "YOUR_TURN_ALERT", tokenNumber);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var message = WhatsAppTranslationHelper.Get(lang, "UPCOMING_TURN_ALERT", tokensLeft);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var shortRef = $"CX-{tokenId.ToString().Substring(0, 6).ToUpper()}";
            var message = WhatsAppTranslationHelper.Get(lang, "FEEDBACK_REQUEST_ALERT", doctorName, shortRef);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendSessionCancelledAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var message = WhatsAppTranslationHelper.Get(lang, "SESSION_CANCELLED_ALERT", doctorName);
            await SendTextMessage(phoneNumber, message, branchId);
        }

        public async Task SendSessionTransferredAlert(string phoneNumber, string doctorName, string newSessionName, int newTokenNumber, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var message = WhatsAppTranslationHelper.Get(lang, "SESSION_TRANSFERRED_ALERT", doctorName, newSessionName, newTokenNumber);
            await SendTextMessage(phoneNumber, message, branchId);
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
