using Microsoft.Extensions.DependencyInjection;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace CodeX.Infrastructure.ExternalServices
{
    public class TwilioWhatsAppService : IWhatsAppService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<TwilioWhatsAppService> _logger;
        private readonly IServiceProvider _serviceProvider;

        // Config keys — prioritises DB over appsettings.json
        private string GetSetting(string key, string configKey)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var setting = context.SystemSettings.FirstOrDefault(s => s.Key == key);
                return setting?.Value ?? _config[configKey] ?? string.Empty;
            }
        }

        private string AccountSid => GetSetting("Twilio:AccountSid", "Twilio:AccountSid");
        private string AuthToken  => GetSetting("Twilio:AuthToken",  "Twilio:AuthToken");
        private string FromNumber => GetSetting("Twilio:WhatsAppFromNumber", "Twilio:WhatsAppFromNumber");

        public TwilioWhatsAppService(IConfiguration config, ILogger<TwilioWhatsAppService> logger, IServiceProvider serviceProvider)
        {
            _config = config;
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        private async Task<string> GetUserLanguageAsync(string phoneNumber)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var session = await dbContext.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == phoneNumber);
                return session?.Language ?? "1"; // Default to Hindi
            }
            catch
            {
                return "1";
            }
        }

        // ─── Core send ───────────────────────────────────────────────────────
        public async Task SendTextMessage(string toPhoneNumber, string message, Guid branchId)
        {
            if (!IsConfigured())
            {
                _logger.LogWarning("Twilio not configured. Skipping SendTextMessage to {Phone}.", toPhoneNumber);
                return;
            }

            try
            {
                TwilioClient.Init(AccountSid, AuthToken);
                var to = NormaliseWhatsApp(toPhoneNumber);
                var from = NormaliseWhatsApp(FromNumber);
                
                await MessageResource.CreateAsync(
                    body: message,
                    from: new PhoneNumber(from),
                    to:   new PhoneNumber(to)
                );
                _logger.LogInformation("WhatsApp message sent from {From} to {To} (Branch: {BranchId}).", from, to, branchId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send WhatsApp message to {Phone}.", toPhoneNumber);
                throw;
            }
        }

        public async Task SendTemplatedMessage(string toPhoneNumber, string contentSid, string variablesJson, Guid branchId)
        {
            if (!IsConfigured())
            {
                _logger.LogWarning("Twilio not configured. Please check AccountSid, AuthToken and FromNumber in appsettings.json.");
                return;
            }

            try
            {
                TwilioClient.Init(AccountSid, AuthToken);
                var to = NormaliseWhatsApp(toPhoneNumber);
                var from = NormaliseWhatsApp(FromNumber);
                
                _logger.LogInformation("Attempting to send WhatsApp Template. From: {From}, To: {To}, ContentSid: {Sid}", from, to, contentSid);

                var messageOptions = new CreateMessageOptions(new PhoneNumber(to))
                {
                    From = new PhoneNumber(from),
                    ContentSid = contentSid,
                    ContentVariables = variablesJson
                };

                var msg = await MessageResource.CreateAsync(messageOptions);
                _logger.LogInformation("Twilio Template Sent! MessageSid: {MsgSid}, Status: {Status}", msg.Sid, msg.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TWILIO ERROR: Failed to send templated WhatsApp to {Phone}. Exception: {Message}", toPhoneNumber, ex.Message);
                throw;
            }
        }

        // ─── Templated messages ──────────────────────────────────────────────
        public async Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var waitTimeMsg = estimatedWaitMinutes.HasValue 
                ? WhatsAppTranslationHelper.Get(lang, "ESTIMATED_WAIT_MSG", estimatedWaitMinutes.Value) 
                : "";
                
            var msg = WhatsAppTranslationHelper.Get(lang, "BOOKING_CONFIRMED_ALERT", patientName, tokenNumber, waitTimeMsg);
            await SendTextMessage(phoneNumber, msg, branchId);
        }

        public async Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var msg = WhatsAppTranslationHelper.Get(lang, "DOCTOR_ARRIVED_ALERT", doctorName);
            await SendTextMessage(phoneNumber, msg, branchId);
        }

        public async Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var msg = WhatsAppTranslationHelper.Get(lang, "YOUR_TURN_ALERT", tokenNumber);
            await SendTextMessage(phoneNumber, msg, branchId);
        }

        public async Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var msg = WhatsAppTranslationHelper.Get(lang, "UPCOMING_TURN_ALERT", tokensLeft);
            await SendTextMessage(phoneNumber, msg, branchId);
        }

        public async Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            var lang = await GetUserLanguageAsync(phoneNumber);
            var shortRef = $"CX-{tokenId.ToString().Substring(0, 6).ToUpper()}";
            var msg = WhatsAppTranslationHelper.Get(lang, "FEEDBACK_REQUEST_ALERT", doctorName, shortRef);
            await SendTextMessage(phoneNumber, msg, branchId);
        }

        // ─── Health check (called from settings) ─────────────────────────────
        public async Task<bool> TestConnection(string accountSid, string authToken, string fromNumber)
        {
            try
            {
                var sid = accountSid?.Trim() ?? string.Empty;
                var token = authToken?.Trim() ?? string.Empty;

                TwilioClient.Init(sid, token);
                // Validate by fetching the account — throws on bad creds
                var account = await Twilio.Rest.Api.V2010.AccountResource.FetchAsync(sid);
                
                _logger.LogInformation("Twilio authentication successful for Account: {Name}", account.FriendlyName);
                return account != null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Twilio connection test failed. Possible invalid SID or Token.");
                return false;
            }
        }

        // ─── Helpers ─────────────────────────────────────────────────────────
        private bool IsConfigured() =>
            !string.IsNullOrEmpty(AccountSid) &&
            !string.IsNullOrEmpty(AuthToken) &&
            !string.IsNullOrEmpty(FromNumber);

        private static string NormaliseWhatsApp(string number, string defaultCountryCode = "91")
        {
            if (string.IsNullOrWhiteSpace(number)) return string.Empty;
            
            var normalized = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(number, defaultCountryCode);
            if (normalized.StartsWith("+"))
            {
                normalized = normalized.Substring(1);
            }
            return "whatsapp:+" + normalized;
        }
    }
}
