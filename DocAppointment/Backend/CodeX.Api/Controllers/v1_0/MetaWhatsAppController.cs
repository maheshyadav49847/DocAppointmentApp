using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CodeX.Api.Controllers.v1_0
{
    [ApiController]
    [Route("api/v1.0/meta/whatsapp")]
    [Authorize]
    public class MetaWhatsAppController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<MetaWhatsAppController> _logger;

        public MetaWhatsAppController(IApplicationDbContext context, ILogger<MetaWhatsAppController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Endpoint for Client Frontend (MetaEmbeddedSignup.tsx) to get AppId and ConfigId
        [HttpGet("config")]
        public async Task<IActionResult> GetClientConfig()
        {
            var appId = await _context.ApplicationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Key == "Meta_AppId");
            var configId = await _context.ApplicationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Key == "Meta_ConfigId");
            
            return Ok(new { 
                appId = appId?.Value ?? "", 
                configId = configId?.Value ?? "" 
            });
        }

        public class SaveCredentialsRequest
        {
            public Guid BranchId { get; set; }
            public string WabaId { get; set; } = string.Empty;
            public string PhoneNumberId { get; set; } = string.Empty;
        }

        [HttpPost("save-credentials")]
        public async Task<IActionResult> SaveCredentials([FromBody] SaveCredentialsRequest request)
        {
            _logger.LogInformation("SaveCredentials called with BranchId: '{BranchId}', PhoneId: '{PhoneId}'", request.BranchId, request.PhoneNumberId);
            
            var branch = await _context.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == request.BranchId);
            if (branch == null)
            {
                _logger.LogWarning("SaveCredentials: Branch not found for ID {BranchId}", request.BranchId);
                return NotFound("Branch not found");
            }

            // Fetch the Global SaaS Meta System User Token from Application Settings
            var systemTokenSetting = await _context.ApplicationSettings.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.Key == "Meta_SystemUserToken");
            var globalSystemToken = systemTokenSetting?.Value;

            if (string.IsNullOrEmpty(globalSystemToken))
            {
                _logger.LogError("Meta_SystemUserToken is not configured in SaaS Manager.");
                return BadRequest("Meta Tech Provider is not fully configured by the platform administrator.");
            }

            branch.WhatsAppProvider = "MetaCloud";
            branch.MetaWabaId = request.WabaId?.Trim();
            branch.MetaPhoneNumberId = request.PhoneNumberId?.Trim();
            branch.MetaSystemUserToken = globalSystemToken;

            await _context.SaveChangesAsync(default);

            return Ok(new { success = true, message = "Meta WhatsApp credentials saved successfully." });
        }
    }
}
