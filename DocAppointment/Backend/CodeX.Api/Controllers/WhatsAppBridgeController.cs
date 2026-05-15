using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Threading.Tasks;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Authorize(Roles = "SuperAdmin,OrgAdmin,Receptionist")]
    [Route("api/whatsapp/bridge")]
    public class WhatsAppBridgeController : ControllerBase
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        private string BridgeUrl => _config["WhatsApp:BridgeBaseUrl"]?.TrimEnd('/') ?? "http://localhost:3101";
        private string? ApiKey => _config["WhatsApp:BridgeApiKey"];

        public WhatsAppBridgeController(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        [HttpGet("status/{branchId}")]
        public async Task<IActionResult> GetStatus(string branchId)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeUrl}/status/{branchId}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch
            {
                return Ok(new { ready = false, error = "Bridge is offline" });
            }
        }

        [HttpPost("restart/{branchId}")]
        public async Task<IActionResult> Restart(string branchId)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeUrl}/restart/{branchId}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                await _httpClient.SendAsync(request);
                return Ok(new { message = "Restart command sent to bridge" });
            }
            catch
            {
                return BadRequest(new { message = "Failed to reach bridge" });
            }
        }

        [HttpPost("logout/{branchId}")]
        public async Task<IActionResult> Logout(string branchId)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, $"{BridgeUrl}/logout/{branchId}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);
                
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch
            {
                return BadRequest(new { message = "Failed to reach bridge" });
            }
        }

        [HttpGet("check-number/{branchId}/{phone}")]
        public async Task<IActionResult> CheckNumber(string branchId, string phone)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, $"{BridgeUrl}/check-number/{branchId}/{phone}");
                if (!string.IsNullOrEmpty(ApiKey)) request.Headers.Add("X-Bridge-Api-Key", ApiKey);

                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                // Fallback: If bridge is offline, we assume number exists but flag the error
                // This prevents blocking the manual booking flow if the bridge is down
                return Ok(new 
                { 
                    ready = false, 
                    exists = true, 
                    isError = true, 
                    message = "Could not reach WhatsApp bridge. Verification skipped." 
                });
            }
        }
    }
}
