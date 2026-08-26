using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Infrastructure.Persistence.Converters;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers.v1_0;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/saas-manager")]
public class SaaSManagerController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _config;

    public SaaSManagerController(IApplicationDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("sync-settings")]
    public async Task<IActionResult> SyncSettings([FromBody] SyncSettingsRequest request)
    {
        // 1. Validate API Key (Security)
        var providedApiKey = Request.Headers["X-SaaS-Manager-Key"].FirstOrDefault();
        var expectedApiKey = _config["SaaSManager:ApiKey"];

        if (string.IsNullOrEmpty(expectedApiKey) || providedApiKey != expectedApiKey)
        {
            return Unauthorized(new { Message = "Invalid or missing SaaS Manager API Key." });
        }

        // 2. Clear old settings (as this table now purely represents this instance)
        var existingSettings = _context.ApplicationSettings.ToList();
        _context.ApplicationSettings.RemoveRange(existingSettings);

        // 3. Prepare Encrypter (Same as ApplicationDbContext)
        var encryptionKey = _config["EncryptionSettings:Key"];
        EncryptedStringConverter? encrypter = null;
        if (!string.IsNullOrEmpty(encryptionKey) && encryptionKey.Length >= 32)
        {
            encrypter = new EncryptedStringConverter(encryptionKey);
        }

        // 4. Save new settings
        foreach (var item in request.Settings)
        {
            var valueToSave = item.Value;

            if (item.IsSensitive && encrypter != null)
            {
                var expression = encrypter.ConvertToProviderExpression.Compile();
                valueToSave = expression(item.Value) ?? string.Empty;
            }

            _context.ApplicationSettings.Add(new ApplicationSetting
            {
                Key = item.Key,
                Value = valueToSave,
                IsSensitive = item.IsSensitive,
                LastModified = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new { Message = "Settings synced successfully." });
    }
}

public class SyncSettingsRequest
{
    public List<SettingItem> Settings { get; set; } = new List<SettingItem>();
}

public class SettingItem
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsSensitive { get; set; }
}
