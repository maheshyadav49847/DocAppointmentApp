using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace CodeX.Infrastructure.ExternalServices
{
    public class TelegramService : ITelegramService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IApplicationDbContext _context;
        private readonly ILogger<TelegramService> _logger;

        public TelegramService(
            IHttpClientFactory httpClientFactory,
            IApplicationDbContext context,
            ILogger<TelegramService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _context = context;
            _logger = logger;
        }

        private async Task<string?> GetBotTokenAsync(Guid branchId)
        {
            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            return branch?.TelegramBotToken;
        }

        private async Task SendMessageInternal(Guid branchId, object payload, string method = "sendMessage")
        {
            var token = await GetBotTokenAsync(branchId);
            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("Telegram Bot Token is not configured for branch {BranchId}", branchId);
                return;
            }

            var url = $"https://api.telegram.org/bot{token}/{method}";
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Telegram API Error: {Error}", error);
            }
        }

        public async Task SendTextMessage(string chatId, string message, Guid branchId)
        {
            var payload = new
            {
                chat_id = chatId,
                text = message,
                parse_mode = "Markdown"
            };
            await SendMessageInternal(branchId, payload);
        }

        public async Task SendWelcomeMessage(string chatId, string patientName, int tokenNumber, Guid branchId, int? estimatedWaitMinutes = null)
        {
            var msg = $"*Booking Confirmed!*\n\nHello {patientName},\nYour token number is *{tokenNumber}*.";
            if (estimatedWaitMinutes.HasValue && estimatedWaitMinutes.Value > 0)
            {
                msg += $"\nEstimated wait time: {estimatedWaitMinutes.Value} mins.";
            }
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendDoctorArrivalAlert(string chatId, string doctorName, Guid branchId)
        {
            var msg = $"Dr. {doctorName} has arrived at the clinic. Consultations have started!";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendYourTurnAlert(string chatId, int tokenNumber, Guid branchId)
        {
            var msg = $"*It is your turn!* (Token #{tokenNumber})\nPlease proceed to the doctor's cabin.";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendUpcomingTurnAlert(string chatId, int tokensLeft, Guid branchId)
        {
            var msg = $"*Get Ready!*\nThere are only {tokensLeft} patients ahead of you.";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendFeedbackRequest(string chatId, string doctorName, Guid tokenId, Guid branchId)
        {
            var msg = $"Hope your consultation with Dr. {doctorName} went well! Please reply to this message with a rating (1-5).";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendSessionCancelledAlert(string chatId, string doctorName, Guid branchId)
        {
            var msg = $"*Session Cancelled*\nWe are sorry to inform you that Dr. {doctorName}'s session has been cancelled.";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendSessionTransferredAlert(string chatId, string doctorName, string newSessionName, int newTokenNumber, Guid branchId)
        {
            var msg = $"*Session Transferred*\nYour appointment with Dr. {doctorName} has been moved to {newSessionName}. Your new token is #{newTokenNumber}.";
            await SendTextMessage(chatId, msg, branchId);
        }

        public async Task SendDocumentMessage(string chatId, string message, string fileName, string base64Data, Guid branchId)
        {
            var token = await GetBotTokenAsync(branchId);
            if (string.IsNullOrWhiteSpace(token)) return;

            try
            {
                var bytes = Convert.FromBase64String(base64Data);
                var url = $"https://api.telegram.org/bot{token}/sendDocument";

                using var content = new MultipartFormDataContent();
                content.Add(new StringContent(chatId), "chat_id");
                if (!string.IsNullOrWhiteSpace(message))
                {
                    content.Add(new StringContent(message), "caption");
                }
                var fileContent = new ByteArrayContent(bytes);
                content.Add(fileContent, "document", fileName);

                var client = _httpClientFactory.CreateClient();
                var response = await client.PostAsync(url, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Telegram API Document Error: {Error}", error);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send document via Telegram.");
            }
        }
    }
}
