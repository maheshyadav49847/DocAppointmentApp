using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Authorize(Roles = "SuperAdmin,OrgAdmin")]
    [Route("api/whatsapp/config")]
    public class WhatsAppConfigController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<WhatsAppConfigController> _logger;
        private readonly TwilioWhatsAppService _twilioWhatsApp;

        public WhatsAppConfigController(
            IApplicationDbContext context,
            ILogger<WhatsAppConfigController> logger,
            TwilioWhatsAppService twilioWhatsApp)
        {
            _context = context;
            _logger = logger;
            _twilioWhatsApp = twilioWhatsApp;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var settings = await LoadTwilioSettings();
            var accountSid = settings.GetValueOrDefault("Twilio:AccountSid", string.Empty);
            var authToken = settings.GetValueOrDefault("Twilio:AuthToken", string.Empty);
            var fromNumber = settings.GetValueOrDefault("Twilio:WhatsAppFromNumber", string.Empty);

            return Ok(new TwilioConfigResponseDto
            {
                AccountSid = accountSid,
                AuthTokenConfigured = !string.IsNullOrWhiteSpace(authToken),
                FromNumber = fromNumber,
                IsConfigured = !string.IsNullOrWhiteSpace(accountSid) &&
                               !string.IsNullOrWhiteSpace(authToken) &&
                               !string.IsNullOrWhiteSpace(fromNumber)
            });
        }

        [HttpPost("test")]
        public async Task<IActionResult> Test([FromBody] TwilioConfigDto dto)
        {
            try
            {
                var (accountSid, authToken, fromNumber) = await ResolvePayload(dto, requireAllFields: true);
                var connected = await _twilioWhatsApp.TestConnection(accountSid, authToken, fromNumber);
                return Ok(new { connected });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message, connected = false });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] TwilioConfigDto dto)
        {
            try
            {
                var (accountSid, authToken, fromNumber) = await ResolvePayload(dto, requireAllFields: true);
                var isValid = await _twilioWhatsApp.TestConnection(accountSid, authToken, fromNumber);
                if (!isValid)
                {
                    return BadRequest(new { message = "Invalid Twilio credentials. Connection test failed." });
                }

                await UpsertSetting("Twilio:AccountSid", accountSid, false);
                await UpsertSetting("Twilio:AuthToken", authToken, true);
                await UpsertSetting("Twilio:WhatsAppFromNumber", fromNumber, false);

                await _context.SaveChangesAsync(default);
                _logger.LogInformation("Twilio config updated in database.");

                return Ok(new
                {
                    message = "Twilio credentials saved successfully.",
                    authTokenConfigured = true,
                    isConfigured = true
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save Twilio config.");
                return StatusCode(500, new { message = "Failed to save configuration. Internal server error." });
            }
        }

        private async Task<(string AccountSid, string AuthToken, string FromNumber)> ResolvePayload(TwilioConfigDto dto, bool requireAllFields)
        {
            var settings = await LoadTwilioSettings();
            var accountSid = dto.AccountSid.Trim();
            var fromNumber = dto.FromNumber.Trim();
            var authToken = string.IsNullOrWhiteSpace(dto.AuthToken)
                ? settings.GetValueOrDefault("Twilio:AuthToken", string.Empty)
                : dto.AuthToken.Trim();

            if (requireAllFields &&
                (string.IsNullOrWhiteSpace(accountSid) ||
                 string.IsNullOrWhiteSpace(authToken) ||
                 string.IsNullOrWhiteSpace(fromNumber)))
            {
                throw new InvalidOperationException("Account SID, Auth Token, and WhatsApp number are required.");
            }

            return (accountSid, authToken, fromNumber);
        }

        private async Task<Dictionary<string, string>> LoadTwilioSettings()
        {
            return await _context.SystemSettings
                .Where(s => s.Key.StartsWith("Twilio:"))
                .ToDictionaryAsync(s => s.Key, s => s.Value);
        }

        private async Task UpsertSetting(string key, string value, bool isSensitive)
        {
            var setting = await _context.SystemSettings.FindAsync(key);
            if (setting == null)
            {
                setting = new SystemSetting
                {
                    Key = key,
                    IsSensitive = isSensitive
                };
                _context.SystemSettings.Add(setting);
            }

            setting.Value = value;
            setting.IsSensitive = isSensitive;
            setting.LastModified = DateTime.UtcNow;
        }

        public sealed class TwilioConfigDto
        {
            public string AccountSid { get; set; } = string.Empty;
            public string AuthToken { get; set; } = string.Empty;
            public string FromNumber { get; set; } = string.Empty;
        }

        public sealed class TwilioConfigResponseDto
        {
            public string AccountSid { get; set; } = string.Empty;
            public bool AuthTokenConfigured { get; set; }
            public string FromNumber { get; set; } = string.Empty;
            public bool IsConfigured { get; set; }
        }
    }
}
