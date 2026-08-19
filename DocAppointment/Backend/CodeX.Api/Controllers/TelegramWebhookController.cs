using CodeX.Application.Common.Helpers;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace CodeX.Api.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/telegram/webhook")]
    public class TelegramWebhookController : ControllerBase
    {
        private readonly ILogger<TelegramWebhookController> _logger;
        private readonly ISender _mediator;
        private readonly ITelegramService _telegramService;
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public TelegramWebhookController(
            ILogger<TelegramWebhookController> logger,
            ISender mediator,
            ITelegramService telegramService,
            IApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _logger = logger;
            _mediator = mediator;
            _telegramService = telegramService;
            _context = context;
            _currentUserService = currentUserService;
        }

        [AllowAnonymous]
        [HttpPost("{branchId}")]
        public async Task<IActionResult> ReceiveUpdate(Guid branchId, [FromBody] JsonElement payloadElement)
        {
            try
            {
                var payloadStr = payloadElement.GetRawText();
                var update = JsonSerializer.Deserialize<TelegramUpdate>(payloadStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (update?.Message == null) return Ok();

                var chatId = update.Message.Chat?.Id.ToString();
                if (string.IsNullOrEmpty(chatId)) return Ok();

                var branch = await _context.Branches
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted);

                if (branch == null) return Ok();

                // Set organization context
                _currentUserService.SetCurrentOrganization(branch.OrganizationId);

                // Handle Contact Share
                if (update.Message.Contact != null)
                {
                    await HandleContactReceived(branchId, branch.OrganizationId, chatId, update.Message.Contact);
                    return Ok();
                }

                // Handle Text Message
                if (!string.IsNullOrWhiteSpace(update.Message.Text))
                {
                    await HandleTextMessage(branchId, chatId, update.Message.Text);
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Telegram Webhook");
                return Ok();
            }
        }

        private async Task HandleContactReceived(Guid branchId, Guid orgId, string chatId, TelegramContact contact)
        {
            var phone = NormalizationHelper.NormalizePhone(contact.PhoneNumber);

            // Find existing patient by phone
            var phoneVars = NormalizationHelper.GetPhoneVariations(phone);
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => !p.IsDeleted && phoneVars.Contains(p.Phone));

            if (patient == null)
            {
                patient = new Patient
                {
                    Phone = phone,
                    Name = contact.FirstName ?? "Unknown",
                    TelegramChatId = chatId,
                    OrganizationId = orgId
                };
                _context.Patients.Add(patient);
            }
            else
            {
                // Update all matching patients to have this Telegram Chat ID (in case of family profiles)
                var patients = await _context.Patients
                    .Where(p => !p.IsDeleted && phoneVars.Contains(p.Phone))
                    .ToListAsync();
                foreach (var p in patients)
                {
                    p.TelegramChatId = chatId;
                }
            }

            await _context.SaveChangesAsync(default);

            // Trigger standard "Hi" to start the bot flow
            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                BranchId = branchId,
                From = phone,
                MessageBody = "Hi",
                Source = CodeX.Domain.Enums.BookingSource.Telegram
            });

            if (!string.IsNullOrWhiteSpace(response))
            {
                await _telegramService.SendTextMessage(chatId, response, branchId);
            }
        }

        private async Task HandleTextMessage(Guid branchId, string chatId, string text)
        {
            if (text.Trim().ToLower() == "/start")
            {
                await RequestContact(branchId, chatId);
                return;
            }

            // Look up patient by Telegram Chat ID
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => !p.IsDeleted && p.TelegramChatId == chatId);

            if (patient == null || string.IsNullOrWhiteSpace(patient.Phone))
            {
                await RequestContact(branchId, chatId);
                return;
            }

            var response = await _mediator.Send(new ProcessIncomingMessageCommand
            {
                BranchId = branchId,
                From = patient.Phone,
                MessageBody = text,
                Source = CodeX.Domain.Enums.BookingSource.Telegram
            });

            if (!string.IsNullOrWhiteSpace(response))
            {
                await _telegramService.SendTextMessage(chatId, response, branchId);
            }
        }

        private async Task RequestContact(Guid branchId, string chatId)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            var token = branch?.TelegramBotToken;
            if (string.IsNullOrWhiteSpace(token)) return;

            var payload = new
            {
                chat_id = chatId,
                text = "Welcome! To book an appointment, please share your phone number with us by tapping the button below.",
                reply_markup = new
                {
                    keyboard = new[]
                    {
                        new[]
                        {
                            new { text = "📱 Share Phone Number", request_contact = true }
                        }
                    },
                    resize_keyboard = true,
                    one_time_keyboard = true
                }
            };

            var url = $"https://api.telegram.org/bot{token}/sendMessage";
            var json = JsonSerializer.Serialize(payload);
            var content = new System.Net.Http.StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var client = new System.Net.Http.HttpClient();
            await client.PostAsync(url, content);
        }
    }

    // Telegram Models
    public class TelegramUpdate
    {
        [JsonPropertyName("update_id")]
        public long UpdateId { get; set; }
        public TelegramMessage? Message { get; set; }
    }

    public class TelegramMessage
    {
        [JsonPropertyName("message_id")]
        public long MessageId { get; set; }
        public TelegramChat? Chat { get; set; }
        public string? Text { get; set; }
        public TelegramContact? Contact { get; set; }
    }

    public class TelegramChat
    {
        public long Id { get; set; }
        public string? Type { get; set; }
    }

    public class TelegramContact
    {
        [JsonPropertyName("phone_number")]
        public string PhoneNumber { get; set; } = string.Empty;
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }
        [JsonPropertyName("user_id")]
        public long? UserId { get; set; }
    }
}
