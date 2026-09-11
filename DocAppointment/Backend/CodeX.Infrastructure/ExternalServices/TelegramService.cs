using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Generic;

namespace CodeX.Infrastructure.ExternalServices
{
    public class TelegramService : ITelegramService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IApplicationDbContext _context;
        private readonly ILogger<TelegramService> _logger;
        private readonly IMemoryCache _cache;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

        public TelegramService(
            IHttpClientFactory httpClientFactory,
            IApplicationDbContext context,
            ILogger<TelegramService> logger,
            IMemoryCache cache,
            Microsoft.Extensions.Configuration.IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
            _cache = cache;
            _configuration = configuration;
        }

        private async Task<string?> GetBotTokenAsync(Guid branchId)
        {
            var cacheKey = $"Branch_{branchId}_TelegramBotToken";
            if (!_cache.TryGetValue(cacheKey, out string? token))
            {
                var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
                token = branch?.TelegramBotToken;
                if (!string.IsNullOrEmpty(token))
                {
                    _cache.Set(cacheKey, token, TimeSpan.FromMinutes(5));
                }
            }
            return token;
        }

        private async Task<string?> GetGlobalSettingAsync(string key)
        {
            var cacheKey = $"AppSetting_{key}";
            if (!_cache.TryGetValue(cacheKey, out string? value))
            {
                var setting = await _context.ApplicationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Key == key);
                value = setting?.Value;
                
                if (setting != null && setting.IsSensitive && !string.IsNullOrEmpty(value))
                {
                    var encKey = _configuration["EncryptionSettings:Key"];
                    if (!string.IsNullOrEmpty(encKey) && encKey.Length >= 32)
                    {
                        var encrypter = new CodeX.Infrastructure.Persistence.Converters.EncryptedStringConverter(encKey);
                        var decrypt = encrypter.ConvertFromProviderExpression.Compile();
                        value = decrypt(value) ?? string.Empty;
                    }
                }
                
                if (value != null)
                {
                    _cache.Set(cacheKey, value, TimeSpan.FromMinutes(5));
                }
            }
            return value;
        }

        private async Task SendMessageInternal(Guid branchId, object payload, string method = "sendMessage", string? textContent = null)
        {
            var token = await GetBotTokenAsync(branchId);
            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("Telegram Bot Token is not configured for branch {BranchId}", branchId);
                return;
            }

            var url = $"https://api.telegram.org/bot{token}/{method}";
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(url, content);

            string? chatId = null;
            if (payload is System.Collections.Generic.IDictionary<string, object> dict && dict.TryGetValue("chat_id", out var chatVal)) chatId = chatVal?.ToString();
            else if (payload.GetType().GetProperty("chat_id")?.GetValue(payload)?.ToString() is string cId) chatId = cId;

            var patient = chatId != null ? await _context.Patients.FirstOrDefaultAsync(p => p.TelegramChatId == chatId) : null;
            var phone = patient?.Phone ?? chatId ?? "unknown";

            _context.MessageLogs.Add(new CodeX.Domain.Entities.MessageLog
            {
                BranchId = branchId,
                RecipientPhone = phone,
                MessageType = "OutgoingTelegram",
                Status = response.IsSuccessStatusCode ? "Sent" : "Failed",
                ErrorMessage = response.IsSuccessStatusCode ? null : await response.Content.ReadAsStringAsync(),
                MessageBody = textContent ?? "Media/Complex message"
            });
            await _context.SaveChangesAsync(default);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Telegram API Error: {Error}", error);
            }
        }

        public async Task SendTextMessage(string chatId, string message, Guid branchId)
        {
            var payload = new
            {
                chat_id = chatId,
                text = message,
                parse_mode = "Markdown"
            };
            await SendMessageInternal(branchId, payload, "sendMessage", message);
        }

        private async Task<string> ResolveChatLanguageAsync(string chatId, string? explicitLang)
        {
            if (!string.IsNullOrWhiteSpace(explicitLang))
                return CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.NormalizeLanguageCode(explicitLang);

            try
            {
                var patient = await _context.Patients
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(p => p.TelegramChatId == chatId && !p.IsDeleted);

                CodeX.Domain.Entities.ChatSession? session = null;
                if (patient != null && !string.IsNullOrEmpty(patient.Phone))
                {
                    session = await _context.ChatSessions
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(s => s.PhoneNumber == patient.Phone && !s.IsDeleted);
                }

                return CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.GetPatientLanguage(patient, session);
            }
            catch
            {
                return "1";
            }
        }

        public async Task SendWelcomeMessage(string chatId, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var waitTimeMsg = (estimatedWaitMinutes.HasValue && estimatedWaitMinutes.Value > 0)
                ? CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "ESTIMATED_WAIT_MSG", estimatedWaitMinutes.Value)
                : string.Empty;
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "BOOKING_CONFIRMED_ALERT", patientName, tokenNumber, waitTimeMsg);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendDoctorArrivalAlert(string chatId, string doctorName, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "DOCTOR_ARRIVED_ALERT", doctorName);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendYourTurnAlert(string chatId, int tokenNumber, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "YOUR_TURN_ALERT", tokenNumber);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendUpcomingTurnAlert(string chatId, int tokensLeft, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "UPCOMING_TURN_ALERT", tokensLeft);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendFeedbackRequest(string chatId, string doctorName, Guid tokenId, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var shortRef = $"CX-{tokenId.ToString().Substring(0, 6).ToUpper()}";
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "FEEDBACK_REQUEST_ALERT", doctorName, shortRef);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendSessionCancelledAlert(string chatId, string doctorName, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "SESSION_CANCELLED_ALERT", doctorName);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendSessionTransferredAlert(string chatId, string doctorName, string newSessionName, int newTokenNumber, Guid branchId, string? lang = null)
        {
            var l = await ResolveChatLanguageAsync(chatId, lang);
            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(l, "SESSION_TRANSFERRED_ALERT", doctorName, newSessionName, newTokenNumber);
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendDocumentMessage(string chatId, string message, string fileName, string base64Data, Guid branchId)
        {
            var token = await GetBotTokenAsync(branchId);
            if (string.IsNullOrWhiteSpace(token)) return;

            try
            {
                var bytes = Convert.FromBase64String(base64Data);
                var url = $"https://api.telegram.org/bot{token}/sendDocument";

                using var content = new MultipartFormDataContent();
                content.Add(new StringContent(chatId), "chat_id");
                if (!string.IsNullOrWhiteSpace(message))
                {
                    content.Add(new StringContent(message), "caption");
                }
                var fileContent = new ByteArrayContent(bytes);
                content.Add(fileContent, "document", fileName);

                var client = _httpClientFactory.CreateClient();
                var response = await client.PostAsync(url, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Telegram API Document Error: {Error}", error);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send document via Telegram.");
            }
        }
    }
}
