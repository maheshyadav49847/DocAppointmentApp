using CodeX.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure.ExternalServices
{
    public class ConsoleEmailService : IEmailService
    {
        private readonly ILogger<ConsoleEmailService> _logger;

        public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
        {
            _logger = logger;
        }

        public Task SendEmailAsync(string to, string subject, string body)
        {
            _logger.LogInformation("--- EMAIL SENT ---");
            _logger.LogInformation("To: {To}", to);
            _logger.LogInformation("Subject: {Subject}", subject);
            _logger.LogInformation("Body: {Body}", body);
            _logger.LogInformation("------------------");

            return Task.CompletedTask;
        }
    }
}
