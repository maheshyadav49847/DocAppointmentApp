using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    /// <summary>
    /// Reads and updates Twilio WhatsApp credentials in appsettings.json at runtime.
    /// In production, use environment variables or a secret store instead.
    /// </summary>
    [ApiController]
    [Authorize(Roles = "SuperAdmin,OrgAdmin,BranchAdmin")]
    [Route("api/whatsapp/config")]
    public class WhatsAppConfigController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<WhatsAppConfigController> _logger;

        public WhatsAppConfigController(IConfiguration config, IWebHostEnvironment env, ILogger<WhatsAppConfigController> logger)
        {
            _config = config;
            _env = env;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new
            {
                provider = _config["WhatsApp:Provider"] ?? "Twilio",
                accountSidConfigured = !string.IsNullOrEmpty(_config["Twilio:AccountSid"]),
                authTokenConfigured = !string.IsNullOrEmpty(_config["Twilio:AuthToken"]),
                fromNumber = _config["Twilio:FromNumber"] ?? string.Empty,
                isConfigured = !string.IsNullOrEmpty(_config["Twilio:AccountSid"])
            });
        }

        [HttpPost]
        public IActionResult Save([FromBody] TwilioConfigDto dto)
        {
            if (!_env.IsDevelopment())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Runtime config updates are disabled outside development. Use environment variables or a secret store."
                });
            }

            try
            {
                var appSettingsPath = Path.Combine(_env.ContentRootPath, "appsettings.json");
                var json = System.IO.File.ReadAllText(appSettingsPath);
                var obj = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.Nodes.JsonObject>(json)!;

                if (!obj.ContainsKey("Twilio"))
                {
                    obj["Twilio"] = new System.Text.Json.Nodes.JsonObject();
                }

                obj["Twilio"]!["AccountSid"] = dto.AccountSid;
                obj["Twilio"]!["AuthToken"] = dto.AuthToken;
                obj["Twilio"]!["FromNumber"] = dto.FromNumber;

                var options = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
                System.IO.File.WriteAllText(appSettingsPath, obj.ToJsonString(options));

                _logger.LogInformation("Twilio config updated via API.");
                return Ok(new { message = "Twilio credentials saved. Restart the server to apply." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save Twilio config.");
                return StatusCode(500, new { message = "Failed to save config: " + ex.Message });
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
