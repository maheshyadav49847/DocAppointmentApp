using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using CodeX.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/whatsapp/webhook")]
    public class WhatsAppWebhookController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<WhatsAppWebhookController> _logger;
        private readonly MediatR.ISender _mediator;
        private readonly BridgeWhatsAppService _whatsApp;
        private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;

        public WhatsAppWebhookController(
            IConfiguration config,
            ILogger<WhatsAppWebhookController> logger,
            MediatR.ISender mediator,
            BridgeWhatsAppService whatsApp,
            Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
        {
            _config = config;
            _logger = logger;
            _mediator = mediator;
            _whatsApp = whatsApp;
            _cache = cache;
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> GenericWebhook([FromBody] GenericWebhookPayload request)
        {
            var apiKey = Request.Headers["X-Bridge-Api-Key"].ToString();
            var expectedKey = _config["WhatsApp:BridgeApiKey"];

            if (!string.IsNullOrEmpty(expectedKey) && apiKey != expectedKey)
            {
                return Unauthorized(new { message = "Invalid API Key" });
            }

            if (!request.SessionId.HasValue || request.SessionId == Guid.Empty)
            {
                return BadRequest(new { message = "A valid branch ID is required." });
            }

            _logger.LogInformation("Generic Webhook received for SessionId={SessionId}", request.SessionId);

            // Rate Limiting (max 10 messages per minute per phone number)
            var cacheKey = $"wa_rate_{request.From}";
            var currentCount = _cache.GetOrCreate(cacheKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return 0;
            });

            if (currentCount >= 10)
            {
                _logger.LogWarning("Rate limit exceeded for {Phone}", request.From);
                return Ok(); // Silently drop to save Twilio costs
            }

            _cache.Set(cacheKey, currentCount + 1, TimeSpan.FromMinutes(1));

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                BranchId = request.SessionId.Value,
                From = request.From,
                MessageBody = request.Body
            });

            if (!string.IsNullOrWhiteSpace(response))
            {
                try
                {
                    await _whatsApp.SendTextMessage(request.From, response, request.SessionId.Value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send webhook reply for branch {SessionId}.", request.SessionId);
                }
            }

            return Ok(new { reply = response });
        }

        public class GenericWebhookPayload
        {
            public Guid? SessionId { get; set; }
            public string From { get; set; } = string.Empty;
            public string Body { get; set; } = string.Empty;
        }
    }
}
