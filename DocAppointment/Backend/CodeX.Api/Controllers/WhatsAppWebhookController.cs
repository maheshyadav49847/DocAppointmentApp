using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Route("api/whatsapp/webhook")]
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
            _config   = config;
            _logger   = logger;
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

            _logger.LogInformation("Generic Webhook: Session={Session}, From={From}, Body={Body}", request.SessionId, request.From, request.Body);

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                From        = request.From,
                MessageBody = request.Body
            });

            if (!string.IsNullOrWhiteSpace(response) && Guid.TryParse(request.SessionId, out var branchId))
            {
                try { await _whatsApp.SendTextMessage(request.From, response, branchId); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to send webhook reply for session {SessionId}.", request.SessionId); }
            }

            return Ok(new { reply = response });
        }

        public class GenericWebhookPayload
        {
            public string SessionId { get; set; } = string.Empty;
            public string From { get; set; } = string.Empty;
            public string Body { get; set; } = string.Empty;
        }
    }
}
