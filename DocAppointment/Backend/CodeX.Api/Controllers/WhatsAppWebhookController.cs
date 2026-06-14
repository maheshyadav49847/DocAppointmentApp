using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        private readonly IWhatsAppService _whatsApp;

        public WhatsAppWebhookController(
            IConfiguration config,
            ILogger<WhatsAppWebhookController> logger,
            MediatR.ISender mediator,
            IWhatsAppService whatsApp)
        {
            _config = config;
            _logger = logger;
            _mediator = mediator;
            _whatsApp = whatsApp;
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
