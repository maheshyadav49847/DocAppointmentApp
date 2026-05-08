using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Api.Controllers
{
    /// <summary>
    /// Reads and updates Twilio WhatsApp credentials in appsettings.json at runtime.
    /// In production, use environment variables or a secret store instead.
    /// Reads and updates Twilio WhatsApp credentials in the database.
    /// Restricted to SuperAdmin and OrgAdmin.
    /// </summary>
    [ApiController]
    [Authorize(Roles = "SuperAdmin,OrgAdmin")]
    [Route("api/whatsapp/config")]
    public class WhatsAppConfigController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<WhatsAppConfigController> _logger;
        private readonly IWhatsAppService _whatsApp;

        public WhatsAppConfigController(
            IApplicationDbContext context,
            ILogger<WhatsAppConfigController> logger,
            IWhatsAppService whatsApp)
        {
            _context = context;
            _logger = logger;
            _whatsApp = whatsApp;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var settings = await _context.SystemSettings
                .Where(s => s.Key.StartsWith("Twilio:"))
                .ToDictionaryAsync(s => s.Key, s => s.Value);

            return Ok(new TwilioConfigDto
            {
                AccountSid = settings.GetValueOrDefault("Twilio:AccountSid", ""),
                AuthToken = settings.GetValueOrDefault("Twilio:AuthToken", ""),
                FromNumber = settings.GetValueOrDefault("Twilio:FromNumber", "")
            });
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] TwilioConfigDto dto)
        {
            try
            {
                // Validate before saving
                var isValid = await _whatsApp.TestConnection(dto.AccountSid, dto.AuthToken, dto.FromNumber);
                if (!isValid) return BadRequest(new { message = "Invalid Twilio credentials. Connection test failed." });

                var keys = new[] { "Twilio:AccountSid", "Twilio:AuthToken", "Twilio:FromNumber" };
                var values = new[] { dto.AccountSid, dto.AuthToken, dto.FromNumber };

                for (int i = 0; i < keys.Length; i++)
                {
                    var setting = await _context.SystemSettings.FindAsync(keys[i]);
                    if (setting == null)
                    {
                        setting = new SystemSetting { Key = keys[i], IsSensitive = true };
                        _context.SystemSettings.Add(setting);
                    }
                    setting.Value = values[i];
                    setting.LastModified = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync(default);
                _logger.LogInformation("Twilio config updated in Database.");
                return Ok(new { message = "Twilio credentials saved successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save Twilio config.");
                return StatusCode(500, new { message = "Failed to save configuration. Internal server error." });
            }
        }

        public class TwilioConfigDto
        {
            public string AccountSid { get; set; } = string.Empty;
            public string AuthToken { get; set; } = string.Empty;
            public string FromNumber { get; set; } = string.Empty;
        }
    }
}
