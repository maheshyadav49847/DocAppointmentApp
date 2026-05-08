using Microsoft.Extensions.DependencyInjection;
using CodeX.Application.Common.Interfaces;
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
        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId)
        {
            string msg =
                $"✅ *Booking Confirmed!*\n\n" +
                $"Hello *{patientName}*,\n" +
                $"Your token number is *#{tokenNumber}*.\n\n" +
                $"Please arrive on time. We'll notify you when your turn approaches.\n\n" +
                $"📍 _DocAppointment System_";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            string msg =
                $"🏥 *Doctor Has Arrived!*\n\n" +
                $"Dr. *{doctorName}* is now present at the clinic.\n" +
                $"The queue is now active. Please be ready.\n\n" +
                $"📍 _DocAppointment System_";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            string msg =
                $"🔔 *Your Turn Now!*\n\n" +
                $"Token *#{tokenNumber}* — please proceed to the consultation room immediately.\n\n" +
                $"📍 _DocAppointment System_";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            string msg =
                $"⏳ *Almost Your Turn!*\n\n" +
                $"Only *{tokensLeft}* patient(s) ahead of you.\n" +
                $"Please be ready and don't leave the premises.\n\n" +
                $"📍 _DocAppointment System_";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            string msg =
                $"🌟 *How was your visit?*\n\n" +
                $"Thank you for consulting Dr. *{doctorName}* today.\n\n" +
                $"Please rate your experience by replying with a number from *1 to 5* (5 being Excellent).\n\n" +
                $"Your feedback helps us improve!\n\n" +
                $"_Ref: {tokenId}_";
            return SendTextMessage(phoneNumber, msg, branchId);
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

        /// Ensure phone number has whatsapp: prefix and starts with + (E.164)
        private static string NormaliseWhatsApp(string number)
        {
            if (string.IsNullOrWhiteSpace(number)) return string.Empty;
            number = number.Trim().Replace(" ", "").Replace("-", "");
            
            if (number.StartsWith("whatsapp:")) return number;
            
            // Auto-handle 10-digit Indian numbers
            if (number.Length == 10 && number.All(char.IsDigit))
            {
                number = "+91" + number;
            }
            else if (!number.StartsWith("+"))
            {
                number = "+" + number;
            }
            
            return "whatsapp:" + number;
        }
    }
}
