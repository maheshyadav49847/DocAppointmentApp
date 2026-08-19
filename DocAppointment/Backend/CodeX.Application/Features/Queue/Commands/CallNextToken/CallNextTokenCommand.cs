using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Queue.Commands.CallNextToken
{
    public record CallNextTokenCommand(Guid QueueId) : IRequest<int>;

    public class CallNextTokenCommandHandler : IRequestHandler<CallNextTokenCommand, int>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsappService;
        private readonly ITelegramService _telegramService;
        private readonly ISmsService _smsService;
        private readonly IChatSessionCache _chatSessionCache;

        public CallNextTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, ISmsService smsService, IChatSessionCache chatSessionCache, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _telegramService = telegramService;
            _smsService = smsService;
            _chatSessionCache = chatSessionCache;
        }

        private async Task LogMessage(Guid branchId, string phone, string type, string status, string? error = null, Guid? tokenId = null)
        {
            var log = new MessageLog
            {
                BranchId = branchId,
                RecipientPhone = phone,
                MessageType = type,
                Status = status,
                ErrorMessage = error,
                TokenId = tokenId
            };
            _context.MessageLogs.Add(log);
            await _context.SaveChangesAsync(default);
        }

        public async Task<int> Handle(CallNextTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .Include(x => x.Tokens)
                .ThenInclude(x => x.Patient)
                .Include(x => x.Branch)
                .ThenInclude(b => b.Organization)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            // Find the next Pending token, prioritizing IsPriority
            var nextToken = queue.Tokens
                .Where(t => t.Status == TokenStatus.Pending)
                .OrderByDescending(t => t.IsPriority)
                .ThenBy(t => t.TokenNumber)
                .FirstOrDefault();

            // Mark the previous 'Called' token as Completed
            var currentToken = queue.Tokens.FirstOrDefault(t => t.Status == TokenStatus.Called);
            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Completed;
                currentToken.CompletedAt = DateTime.UtcNow;

                // Send Feedback Request to the patient who just finished
                if (currentToken.Patient != null && !string.IsNullOrEmpty(currentToken.Patient.Phone))
                {
                    try
                    {
                        var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == currentToken.Patient.Phone, cancellationToken);
                        if (chatSession == null)
                        {
                            chatSession = new ChatSession { PhoneNumber = currentToken.Patient.Phone };
                            _context.ChatSessions.Add(chatSession);
                        }
                        chatSession.CurrentState = "AWAITING_RATING_SCORE";
                        chatSession.SelectedSessionId = currentToken.Id; // Reusing field to store TokenId for rating

                        _chatSessionCache.SetSession(chatSession);

                        if (!string.IsNullOrWhiteSpace(currentToken.Patient.TelegramChatId))
                        {
                            var language = chatSession.Language ?? "3";
                            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "FEEDBACK_REQUEST_ALERT", queue.Doctor.Name, $"Token #{currentToken.TokenNumber} ({currentToken.Patient?.Name ?? "Walk-in"}) - {currentToken.Id.ToString().Substring(0,8).ToUpper()}");
                            await _telegramService.SendTextMessage(currentToken.Patient.TelegramChatId, msg, queue.BranchId);
                        }
                        else if (!string.IsNullOrWhiteSpace(currentToken.Patient.Phone))
                        {
                            var language = chatSession.Language ?? "3";
                            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "FEEDBACK_REQUEST_ALERT", queue.Doctor.Name, $"Token #{currentToken.TokenNumber} ({currentToken.Patient?.Name ?? "Walk-in"}) - {currentToken.Id.ToString().Substring(0,8).ToUpper()}");
                            await _whatsappService.SendTextMessage(currentToken.Patient.Phone, msg, queue.BranchId);
                        }
                    }
                    catch { /* Log and ignore */ }
                }
            }

            if (nextToken != null)
            {
                // Update Next Token Status
                nextToken.Status = TokenStatus.Called;
                nextToken.CalledAt = DateTime.UtcNow;

                // Update Queue Current Token
                queue.CurrentTokenNumber = nextToken.TokenNumber;
                queue.Status = QueueStatus.Active;
            }
            else
            {
                // No more tokens, just clear the current one
                queue.CurrentTokenNumber = 0;
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Notify via SignalR (Background)
            try
            {
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
            }

            // Notify via WhatsApp (Background)
            try
            {
                if (nextToken != null && nextToken.Patient != null && !string.IsNullOrEmpty(nextToken.Patient.Phone))
                {
                    try
                    {
                        var session = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == nextToken.Patient.Phone, cancellationToken);
                        var language = session?.Language ?? "3";
                        var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "YOUR_TURN_ALERT", nextToken.TokenNumber);

                        if (!string.IsNullOrWhiteSpace(nextToken.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(nextToken.Patient.TelegramChatId, msg, queue.BranchId);
                        }
                        else if (!string.IsNullOrWhiteSpace(nextToken.Patient.Phone))
                        {
                            await _whatsappService.SendTextMessage(nextToken.Patient.Phone, msg, queue.BranchId);
                        }
                        await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert", "Delivered", tokenId: nextToken.Id);
                    }
                    catch (Exception ex)
                    {
                        _ = LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert", "Failed", error: ex.Message, tokenId: nextToken.Id);
                        
                        try
                        {
                            var chatSessionAlert = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == nextToken.Patient.Phone, cancellationToken);
                            var lang = chatSessionAlert?.Language ?? "1";
                            var smsMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(lang, "YOUR_TURN_ALERT", nextToken.TokenNumber);
                            await _smsService.SendSmsAsync(nextToken.Patient.Phone, smsMsg);
                            await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert_SMS", "Sent", tokenId: nextToken.Id);
                        }
                        catch (Exception smsEx)
                        {
                            await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert_SMS", "Failed", error: smsEx.Message, tokenId: nextToken.Id);
                        }
                    }
                }

                // Automated Upcoming Alerts
                var upcomingPositions = new[] { 3, 5 };
                if (queue.Branch?.Organization?.SettingsJson != null)
                {
                    try
                    {
                        var settings = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(queue.Branch.Organization.SettingsJson);
                        if (settings.TryGetProperty("WhatsAppAlertPositions", out var positionsProp) && positionsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                        {
                            upcomingPositions = positionsProp.EnumerateArray().Select(x => x.GetInt32()).ToArray();
                        }
                    }
                    catch { }
                }

                foreach (var pos in upcomingPositions)
                {
                    var upcomingPatient = queue.Tokens
                        .Where(t => t.Status == TokenStatus.Pending)
                        .OrderByDescending(t => t.IsPriority)
                        .ThenBy(t => t.TokenNumber)
                        .Skip(pos - 1)
                        .FirstOrDefault();

                    if (upcomingPatient != null && upcomingPatient.Patient != null && !string.IsNullOrEmpty(upcomingPatient.Patient.Phone))
                    {
                        var session = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == upcomingPatient.Patient.Phone, cancellationToken);
                        var language = session?.Language ?? "3";
                        var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "UPCOMING_TURN_ALERT", pos);

                        if (!string.IsNullOrWhiteSpace(upcomingPatient.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(upcomingPatient.Patient.TelegramChatId, msg, queue.BranchId);
                        }
                        else if (!string.IsNullOrWhiteSpace(upcomingPatient.Patient.Phone))
                        {
                            await _whatsappService.SendTextMessage(upcomingPatient.Patient.Phone, msg, queue.BranchId);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}");
            }

            return queue.CurrentTokenNumber;
        }
    }
}
