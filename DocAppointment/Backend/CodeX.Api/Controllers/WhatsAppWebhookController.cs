using Microsoft.AspNetCore.Mvc;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [Route("api/whatsapp/webhook")]
    public class WhatsAppWebhookController : ControllerBase
    {
        private readonly ILogger<WhatsAppWebhookController> _logger;
        private readonly MediatR.ISender _mediator;
        private readonly IWhatsAppService _whatsApp;

        public WhatsAppWebhookController(
            ILogger<WhatsAppWebhookController> logger,
            MediatR.ISender mediator,
            IWhatsAppService whatsApp)
        {
            _logger   = logger;
            _mediator = mediator;
            _whatsApp = whatsApp;
        }

        /// <summary>
        /// Twilio sends incoming WhatsApp messages as form-encoded POST.
        /// Register this URL in Twilio Console → Messaging → Sandbox (or production number) → Webhook.
        /// </summary>
        [HttpPost("twilio")]
        [Consumes("application/x-www-form-urlencoded")]
        public async Task<IActionResult> TwilioWebhook([FromForm] TwilioWebhookPayload payload)
        {
            _logger.LogInformation("Twilio Webhook: From={From}, Body={Body}", payload.From, payload.Body);

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                From        = payload.From ?? string.Empty,
                MessageBody = payload.Body ?? string.Empty
            });

            // Send the bot reply back via Twilio
            if (!string.IsNullOrWhiteSpace(response) && !string.IsNullOrWhiteSpace(payload.From))
            {
                try { await _whatsApp.SendTextMessage(payload.From, response); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to send Twilio reply."); }
            }

            // Twilio also accepts a TwiML <Response><Message> reply — return empty 200 since we use API send
            return Ok();
        }

        /// <summary>
        /// Generic JSON webhook (for testing or custom integrations).
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> GenericWebhook([FromBody] GenericWebhookPayload request)
        {
            _logger.LogInformation("Generic Webhook: From={From}, Body={Body}", request.From, request.Body);

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                From        = request.From,
                MessageBody = request.Body
            });

            if (!string.IsNullOrWhiteSpace(response))
            {
                try { await _whatsApp.SendTextMessage(request.From, response); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to send webhook reply."); }
            }

            return Ok(new { reply = response });
        }

        /// <summary>
        /// Process an incoming message and return the bot reply without attempting provider delivery.
        /// This is used by local WhatsApp bridge services running on the clinic machine.
        /// </summary>
        [HttpPost("process")]
        public async Task<IActionResult> ProcessOnly([FromBody] GenericWebhookPayload request)
        {
            _logger.LogInformation("ProcessOnly Webhook: From={From}, Body={Body}", request.From, request.Body);

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                From = request.From,
                MessageBody = request.Body
            });

            return Ok(new { reply = response });
        }

        /// <summary>
        /// GET verification for Meta / Interakt webhooks.
        /// </summary>
        [HttpGet]
        public IActionResult VerifyWebhook([FromQuery(Name = "hub.challenge")] string challenge)
            => Ok(challenge);

        /// <summary>
        /// Test connectivity to Twilio from the Settings page.
        /// </summary>
        [HttpPost("test")]
        public async Task<IActionResult> TestConnection([FromBody] TestConnectionRequest req)
        {
            var ok = await _whatsApp.TestConnection(req.AccountSid, req.AuthToken, req.FromNumber);
            return Ok(new { connected = ok });
        }

        // ─── Payload models ──────────────────────────────────────────────────
        public class TwilioWebhookPayload
        {
            public string? From    { get; set; }
            public string? Body    { get; set; }
            public string? To      { get; set; }
            public string? NumMedia { get; set; }
        }

        public class GenericWebhookPayload
        {
            public string From { get; set; } = string.Empty;
            public string Body { get; set; } = string.Empty;
        }

        public class TestConnectionRequest
        {
            public string AccountSid { get; set; } = string.Empty;
            public string AuthToken  { get; set; } = string.Empty;
            public string FromNumber { get; set; } = string.Empty;
        }
    }
}
