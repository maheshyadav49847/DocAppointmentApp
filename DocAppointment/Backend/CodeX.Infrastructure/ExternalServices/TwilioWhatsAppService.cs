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
        public Task SendWelcomeMessage(string phoneNumber, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var waitTimeMsg = estimatedWaitMinutes.HasValue 
                ? $"⏱️ *Estimated Wait:* ~{estimatedWaitMinutes.Value} mins\n\n" 
                : "";
                
            var msg = 
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
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendDoctorArrivalAlert(string phoneNumber, string doctorName, Guid branchId)
        {
            string msg =
                $"👨‍⚕️ *DOCTOR CLINIC ME HAIN* 👨‍⚕️\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Namaste 🙏,\n\n" +
                $"Aapko batate hue khushi ho rahi hai ki *Dr. {doctorName}* clinic pahunch chuke hain aur check-up shuru ho gaya hai.\n\n" +
                $"👉 Kripya clinic ke waiting area me tayyar rahein.\n\n" +
                $"✨ _Humari team aapki sahayata ke liye hamesha tatpar hai._";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendYourTurnAlert(string phoneNumber, int tokenNumber, Guid branchId)
        {
            string msg =
                $"🔔 *AAPKA NUMBER AA GAYA HAI!* 🔔\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"👉 *Token #{tokenNumber}*\n\n" +
                $"Kripya turant doctor ke consultation room me check-up ke liye andar aaiye. Doctor aapka intezaar kar rahe hain.\n\n" +
                $"✨ _Swasth rahein, mast rahein!_";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendUpcomingTurnAlert(string phoneNumber, int tokensLeft, Guid branchId)
        {
            string msg =
                $"⏳ *AAPKA NUMBER AANE WALA HAI* ⏳\n" +
                $"━━━━━━━━━━━━━━━━━━━━━\n\n" +
                $"Namaste 🙏,\n\n" +
                $"Aapke aage ab sirf *{tokensLeft} patient(s)* bache hain.\n\n" +
                $"👉 Kripya doctor ke cabin ke paas aakar tayyar rahein. Aapka number agla ho sakta hai!\n\n" +
                $"✨ _Aapke samay aur dhairya ke liye dhanyawad._";
            return SendTextMessage(phoneNumber, msg, branchId);
        }

        public Task SendFeedbackRequest(string phoneNumber, string doctorName, Guid tokenId, Guid branchId)
        {
            var shortRef = $"CX-{tokenId.ToString().Substring(0, 6).ToUpper()}";
            string msg =
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
