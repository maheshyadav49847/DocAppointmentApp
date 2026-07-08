using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using CodeX.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/meta/webhook")]
    public class MetaWhatsAppWebhookController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<MetaWhatsAppWebhookController> _logger;
        private readonly MediatR.ISender _mediator;
        private readonly MetaCloudWhatsAppService _whatsApp;
        private readonly IMemoryCache _cache;
        private readonly IApplicationDbContext _context;

        public MetaWhatsAppWebhookController(
            IConfiguration config,
            ILogger<MetaWhatsAppWebhookController> logger,
            MediatR.ISender mediator,
            MetaCloudWhatsAppService whatsApp,
            IMemoryCache cache,
            IApplicationDbContext context)
        {
            _config = config;
            _logger = logger;
            _mediator = mediator;
            _whatsApp = whatsApp;
            _cache = cache;
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? token,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            var verifyToken = _config["WhatsApp:MetaWebhookVerifyToken"] ?? "myqcare_meta_webhook_secret";

            if (mode == "subscribe" && token == verifyToken)
            {
                _logger.LogInformation("Meta Webhook verified successfully.");
                return Ok(challenge); // Meta strictly expects just the challenge string
            }

            _logger.LogWarning("Meta Webhook verification failed. Received Token: {Token}", token);
            return Forbid();
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> ReceiveMessage([FromBody] JsonElement payloadElement)
        {
            try
            {
                var payloadStr = payloadElement.GetRawText();
                _logger.LogInformation("Meta Webhook Payload received: {Payload}", payloadStr);

                var payload = JsonSerializer.Deserialize<MetaWebhookPayload>(payloadStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (payload == null || payload.Object != "whatsapp_business_account" || payload.Entry == null)
                {
                    return Ok(); // Return 200 OK so Meta doesn't retry
                }

                foreach (var entry in payload.Entry)
                {
                    foreach (var change in entry.Changes)
                    {
                        if (change.Value == null) continue;

                        var phoneNumberId = change.Value.Metadata?.PhoneNumberId;
                        if (string.IsNullOrEmpty(phoneNumberId)) continue;

                        // Check if it's a message
                        if (change.Value.Messages != null && change.Value.Messages.Any())
                        {
                            foreach (var message in change.Value.Messages)
                            {
                                // Only process text messages for Chatbot
                                if (message.Type == "text" && message.Text != null)
                                {
                                    await ProcessIncomingMessage(phoneNumberId, message.From, message.Text.Body);
                                }
                            }
                        }
                    }
                }

                return Ok(); // Always return 200 OK to Meta
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Meta Webhook");
                return Ok(); // Return 200 OK even on error to prevent Meta from retrying and spamming
            }
        }

        private async Task ProcessIncomingMessage(string phoneNumberId, string fromPhone, string body)
        {
            // Find which branch this MetaPhoneNumberId belongs to
            var branch = await _context.Branches
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.MetaPhoneNumberId == phoneNumberId && !b.IsDeleted);

            if (branch == null)
            {
                _logger.LogWarning("Received message for unknown MetaPhoneNumberId: {PhoneNumberId}", phoneNumberId);
                return;
            }

            // Rate Limiting (max 10 messages per minute per phone number)
            var cacheKey = $"wa_rate_{fromPhone}";
            var currentCount = _cache.GetOrCreate(cacheKey, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return 0;
            });

            if (currentCount >= 10)
            {
                _logger.LogWarning("Rate limit exceeded for {Phone}", fromPhone);
                return;
            }

            _cache.Set(cacheKey, currentCount + 1, TimeSpan.FromMinutes(1));

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                BranchId = branch.Id,
                From = fromPhone,
                MessageBody = body
            });

            if (!string.IsNullOrWhiteSpace(response))
            {
                try
                {
                    await _whatsApp.SendTextMessage(fromPhone, response, branch.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send webhook reply for branch {BranchId}.", branch.Id);
                }
            }
        }
    }

    public class MetaWebhookPayload
    {
        [JsonPropertyName("object")]
        public string Object { get; set; } = string.Empty;
        public List<MetaWebhookEntry> Entry { get; set; } = new();
    }

    public class MetaWebhookEntry
    {
        public string Id { get; set; } = string.Empty;
        public List<MetaWebhookChange> Changes { get; set; } = new();
    }

    public class MetaWebhookChange
    {
        public MetaWebhookValue Value { get; set; } = new();
        public string Field { get; set; } = string.Empty;
    }

    public class MetaWebhookValue
    {
        [JsonPropertyName("messaging_product")]
        public string MessagingProduct { get; set; } = string.Empty;
        public MetaWebhookMetadata? Metadata { get; set; }
        public List<MetaWebhookContact>? Contacts { get; set; }
        public List<MetaWebhookMessage>? Messages { get; set; }
        public List<MetaWebhookStatus>? Statuses { get; set; }
    }

    public class MetaWebhookMetadata
    {
        [JsonPropertyName("display_phone_number")]
        public string DisplayPhoneNumber { get; set; } = string.Empty;
        [JsonPropertyName("phone_number_id")]
        public string PhoneNumberId { get; set; } = string.Empty;
    }

    public class MetaWebhookContact
    {
        public MetaWebhookProfile Profile { get; set; } = new();
        [JsonPropertyName("wa_id")]
        public string WaId { get; set; } = string.Empty;
    }

    public class MetaWebhookProfile
    {
        public string Name { get; set; } = string.Empty;
    }

    public class MetaWebhookMessage
    {
        public string From { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public MetaWebhookText? Text { get; set; }
    }

    public class MetaWebhookText
    {
        public string Body { get; set; } = string.Empty;
    }

    public class MetaWebhookStatus
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
        [JsonPropertyName("recipient_id")]
        public string RecipientId { get; set; } = string.Empty;
    }
}
