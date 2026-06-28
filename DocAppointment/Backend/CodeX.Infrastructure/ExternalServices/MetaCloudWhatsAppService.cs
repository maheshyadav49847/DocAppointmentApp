using System.Net.Http.Headers;
using System.Net.Http.Json;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.ExternalServices
{
    public class MetaCloudWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MetaCloudWhatsAppService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public MetaCloudWhatsAppService(HttpClient httpClient, ILogger<MetaCloudWhatsAppService> logger, IServiceScopeFactory scopeFactory)
        {
            _httpClient = httpClient;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        private async Task<(string? PhoneNumberId, string? SystemUserToken)> GetBranchMetaCredentialsAsync(Guid branchId)
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var branch = await dbContext.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            return (branch?.MetaPhoneNumberId, branch?.MetaSystemUserToken);
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

        private async Task SendMetaMessageAsync(string toPhoneNumber, object messagePayload, Guid branchId)
        {
            var (phoneNumberId, systemUserToken) = await GetBranchMetaCredentialsAsync(branchId);
            if (string.IsNullOrEmpty(phoneNumberId) || string.IsNullOrEmpty(systemUserToken))
            {
                _logger.LogWarning("Meta credentials missing for branch {BranchId}. Cannot send message.", branchId);
                return;
            }

            // Ensure recipient number format
            var cleanPhone = toPhoneNumber.Replace("+", "").Replace(" ", "").Replace("-", "");
            while (cleanPhone.StartsWith("0")) cleanPhone = cleanPhone.Substring(1);
            if (cleanPhone.Length == 10) cleanPhone = "91" + cleanPhone;


            var url = $"https://graph.facebook.com/v19.0/{phoneNumberId}/messages";
            
            var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", systemUserToken);
            request.Content = JsonContent.Create(messagePayload);

            try
            {
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Meta API Error: {StatusCode} - {Content}", response.StatusCode, content);
                }
                else
                {
                    _logger.LogInformation("Meta message sent successfully to {PhoneNumber}", cleanPhone);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Meta message to {PhoneNumber}", cleanPhone);
            }
        }

        public async Task SendTextMessage(string toPhoneNumber, string message, Guid branchId)
        {
            var cleanPhone = toPhoneNumber.Replace("+", "").Replace(" ", "").Replace("-", "");
            while (cleanPhone.StartsWith("0")) cleanPhone = cleanPhone.Substring(1);
            if (cleanPhone.Length == 10) cleanPhone = "91" + cleanPhone;
            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = cleanPhone,
                type = "text",
                text = new
                {
                    preview_url = false,
                    body = message
                }
            };

            await SendMetaMessageAsync(toPhoneNumber, payload, branchId);
        }

        public async Task SendDocumentMessage(string toPhoneNumber, string message, string fileName, string base64Data, Guid branchId)
        {
            var (phoneNumberId, systemUserToken) = await GetBranchMetaCredentialsAsync(branchId);
            if (string.IsNullOrEmpty(phoneNumberId) || string.IsNullOrEmpty(systemUserToken))
            {
                _logger.LogWarning("Meta credentials missing for branch {BranchId}. Cannot send document.", branchId);
                return;
            }

            var cleanPhone = toPhoneNumber.Replace("+", "").Replace(" ", "").Replace("-", "");
            while (cleanPhone.StartsWith("0")) cleanPhone = cleanPhone.Substring(1);
            if (cleanPhone.Length == 10) cleanPhone = "91" + cleanPhone;

            string mediaId = string.Empty;
            try
            {
                byte[] fileBytes = Convert.FromBase64String(base64Data);
                using var form = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("application/pdf");
                form.Add(fileContent, "file", fileName);
                form.Add(new StringContent("whatsapp"), "messaging_product");
                
                var uploadUrl = $"https://graph.facebook.com/v19.0/{phoneNumberId}/media";
                var uploadRequest = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
                uploadRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", systemUserToken);
                uploadRequest.Content = form;

                var uploadResponse = await _httpClient.SendAsync(uploadRequest);
                var uploadResponseStr = await uploadResponse.Content.ReadAsStringAsync();
                
                if (uploadResponse.IsSuccessStatusCode)
                {
                    var result = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(uploadResponseStr);
                    if (result.TryGetProperty("id", out var idProp))
                    {
                        mediaId = idProp.GetString() ?? "";
                    }
                }
                else
                {
                    _logger.LogError("Meta Media Upload Error: {StatusCode} - {Content}", uploadResponse.StatusCode, uploadResponseStr);
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to upload media to Meta");
                return;
            }

            if (string.IsNullOrEmpty(mediaId)) return;

            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = cleanPhone,
                type = "document",
                document = new
                {
                    id = mediaId,
                    caption = message,
                    filename = fileName
                }
            };

            await SendMetaMessageAsync(toPhoneNumber, payload, branchId);
        }

        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "WELCOME_MESSAGE", patientName, tokenNumber, estimatedWaitMinutes?.ToString() ?? "N/A");
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "DOCTOR_ARRIVAL_ALERT", doctorName);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "YOUR_TURN_ALERT", tokenNumber);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "UPCOMING_TURN_ALERT", tokensLeft);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "FEEDBACK_REQUEST", doctorName, tokenId);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendSessionCancelledAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "SESSION_CANCELLED_ALERT", doctorName);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public Task SendSessionTransferredAlert(string phoneNumber, string doctorName, string newSessionName, int newTokenNumber, Guid branchId)
        {
            _ = Task.Run(async () =>
            {
                var lang = await GetUserLanguageAsync(phoneNumber);
                var message = WhatsAppTranslationHelper.Get(lang, "SESSION_TRANSFERRED_ALERT", doctorName, newSessionName, newTokenNumber);
                await SendTextMessage(phoneNumber, message, branchId);
            });
            return Task.CompletedTask;
        }

        public async Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson, Guid branchId)
        {
            // Meta Cloud API uses specific template formats. 
            // Currently falling back to standard text or skipping depending on implementation.
            // A more complete implementation would convert Twilio's template IDs to Meta templates.
            _logger.LogWarning("SendTemplatedMessage called for MetaCloudWhatsAppService but not fully implemented. Falling back to simple log.");
            await Task.CompletedTask;
        }

        public Task<bool> TestConnection(string accountSid, string authToken, string fromNumber)
        {
            // Simple validation for Meta credentials instead of Twilio
            return Task.FromResult(!string.IsNullOrEmpty(accountSid) && !string.IsNullOrEmpty(authToken));
        }
    }
}
