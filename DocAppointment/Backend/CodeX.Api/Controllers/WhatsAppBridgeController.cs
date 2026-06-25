using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Threading.Tasks;
using System;

using CodeX.Api.Authorization;
using CodeX.Domain.Constants;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Authorize]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/whatsapp/bridge")]
    public class WhatsAppBridgeController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ICurrentUserService _currentUserService;
        private readonly CodeX.Application.Common.Interfaces.IApplicationDbContext _context;

        private string BridgeUrl => _config["WhatsApp:BridgeBaseUrl"]?.TrimEnd('/') ?? "http://localhost:3101";
        private string? ApiKey => _config["WhatsApp:BridgeApiKey"];

        public WhatsAppBridgeController(HttpClient httpClient, IConfiguration config, ICurrentUserService currentUserService, CodeX.Application.Common.Interfaces.IApplicationDbContext context)
        {
            _httpClient = httpClient;
            _config = config;
            _currentUserService = currentUserService;
            _context = context;
        }

        private async Task EnsureBranchAccess(string branchId)
        {
            if (Guid.TryParse(branchId, out var parsedBranchId))
            {
                var branch = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(_context.Branches, b => b.Id == parsedBranchId);
                if (branch == null) throw new Exception("Branch not found");
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureOrgOwnership(_currentUserService, branch.OrganizationId);
                CodeX.Application.Common.Authorization.ResourceAuthorization.EnsureBranchOwnership(_currentUserService, parsedBranchId);
            }
            else
            {
                throw new Exception("Invalid branch ID");
            }
        }

        [HttpGet("status/{branchId}")]
        [HasPermission(SystemPermissions.Settings.ManageWhatsapp)]
        public async Task<IActionResult> GetStatus(string branchId)
        {
            try
            {
                await EnsureBranchAccess(branchId);
                var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeUrl}/status/{branchId}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                return Ok(new { ready = false, error = ex.Message });
            }
        }

        [HttpPost("restart/{branchId}")]
        [HasPermission(SystemPermissions.Settings.ManageWhatsapp)]
        public async Task<IActionResult> Restart(string branchId)
        {
            try
            {
                await EnsureBranchAccess(branchId);
                var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeUrl}/restart/{branchId}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                await _httpClient.SendAsync(request);
                return Ok(new { message = "Restart command sent to bridge" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.ToString() });
            }
        }

        [HttpPost("send/{branchId}")]
        public async Task<IActionResult> Send(string branchId, [FromBody] SendMessageRequest body)
        {
            try
            {
                await EnsureBranchAccess(branchId);
                var payload = new
                {
                    branchId = branchId,
                    to = body.To,
                    message = body.Message ?? body.Text,
                    fileBase64 = body.FileBase64,
                    fileName = body.FileName
                };
                
                var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeUrl}/send-message")
                {
                    Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json")
                };
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);

                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(System.Text.Json.JsonSerializer.Deserialize<object>(content));
                }

                return BadRequest(new { error = "Failed to send message", details = content });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.ToString() });
            }
        }

        [HttpGet("check-number/{branchId}/{phone}")]
        [HasPermission(SystemPermissions.Settings.ManageWhatsapp)]
        public async Task<IActionResult> CheckNumber(string branchId, string phone)
        {
            try
            {
                await EnsureBranchAccess(branchId);
                var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeUrl}/check-number/{branchId}/{phone}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                
                if (response.IsSuccessStatusCode)
                {
                    return Content(content, "application/json");
                }
                
                return StatusCode((int)response.StatusCode, content);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.ToString() });
            }
        }
    }

    public class SendMessageRequest
    {
        public string To { get; set; } = string.Empty;
        public string? Text { get; set; }
        public string? Message { get; set; }
        public string? FileBase64 { get; set; }
        public string? FileName { get; set; }
    }
}
