using CodeX.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace CodeX.Infrastructure.ExternalServices
{
    public class TwilioSmsService : ISmsService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<TwilioSmsService> _logger;
        private readonly IServiceProvider _serviceProvider;

        private string AccountSid => GetSetting("Twilio:AccountSid", "Twilio:AccountSid");
        private string AuthToken  => GetSetting("Twilio:AuthToken",  "Twilio:AuthToken");
        private string FromNumber => GetSetting("Twilio:SmsFromNumber", "Twilio:SmsFromNumber");

        public TwilioSmsService(IConfiguration config, ILogger<TwilioSmsService> logger, IServiceProvider serviceProvider)
        {
            _config = config;
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        private string GetSetting(string key, string configKey)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var setting = context.SystemSettings.FirstOrDefault(s => s.Key == key);
            return setting?.Value ?? _config[configKey] ?? string.Empty;
        }

        public Task SendSmsAsync(string to, string message)
        {
            _ = Task.Run(async () =>
            {
                if (string.IsNullOrEmpty(AccountSid) || string.IsNullOrEmpty(AuthToken))
                {
                    _logger.LogWarning("SMS: Twilio not configured. Logging OTP to console: {Msg}", message);
                    Console.WriteLine($"[SMS DEBUG] To: {to}, Message: {message}");
                    return;
                }

                try
                {
                    TwilioClient.Init(AccountSid, AuthToken);
                    var toFormatted = NormaliseE164(to);
                    var fromFormatted = NormaliseE164(FromNumber);

                    await MessageResource.CreateAsync(
                        body: message,
                        from: new PhoneNumber(fromFormatted),
                        to: new PhoneNumber(toFormatted)
                    );
                    _logger.LogInformation("SMS sent successfully from {From} to {To}", fromFormatted, toFormatted);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send SMS to {To}", to);
                }
            });
            return Task.CompletedTask;
        }

        private static string NormaliseE164(string number)
        {
            if (string.IsNullOrWhiteSpace(number)) return string.Empty;
            number = number.Trim().Replace(" ", "").Replace("-", "");

            // Auto-handle 10-digit Indian numbers
            if (number.Length == 10 && number.All(char.IsDigit))
            {
                return "+91" + number;
            }

            if (!number.StartsWith("+")) number = "+" + number;
            return number;
        }
    }
}
