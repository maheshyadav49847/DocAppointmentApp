using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Queue.Commands.CompleteToken
{
    public record CompleteTokenCommand(Guid QueueId) : IRequest<bool>;

    public class CompleteTokenCommandHandler : IRequestHandler<CompleteTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsappService;
        private readonly ITelegramService _telegramService;
        private readonly IChatSessionCache _chatSessionCache;

        public CompleteTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, IChatSessionCache chatSessionCache, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _telegramService = telegramService;
            _chatSessionCache = chatSessionCache;
        }

        public async Task<bool> Handle(CompleteTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Tokens).ThenInclude(t => t.Patient)
                .Include(x => x.Doctor)
                .Include(x => x.Branch)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) return false;

            // Find the current token:
            // 1. By CurrentTokenNumber and Called status
            // 2. Or any token in this queue with status Called (auto-recovery)
            var currentToken = queue.Tokens
                .FirstOrDefault(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called)
                ?? queue.Tokens
                .Where(t => t.Status == TokenStatus.Called)
                .OrderByDescending(t => t.CalledAt ?? t.CreatedAt)
                .FirstOrDefault();

            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Completed;
                currentToken.CompletedAt = DateTime.UtcNow;
                queue.CurrentTokenNumber = 0;

                var branch = queue.Branch ?? await _context.Branches.IgnoreQueryFilters().FirstOrDefaultAsync(b => b.Id == queue.BranchId, cancellationToken);

                if (currentToken.Patient != null)
                {
                    ChatSession? session = null;
                    if (!string.IsNullOrWhiteSpace(currentToken.Patient.Phone))
                    {
                        var phoneVars = CodeX.Application.Common.Helpers.NormalizationHelper.GetPhoneVariations(currentToken.Patient.Phone).ToList();
                        var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(currentToken.Patient.Phone);
                        phoneVars.Add(normalizedPhone);

                        session = await _context.ChatSessions
                            .FirstOrDefaultAsync(s => phoneVars.Contains(s.PhoneNumber) && s.BranchId == queue.BranchId, cancellationToken);
                        if (session == null)
                        {
                            session = new ChatSession
                            {
                                PhoneNumber = normalizedPhone,
                                BranchId = queue.BranchId,
                            };
                            _context.ChatSessions.Add(session);
                        }
                        else
                        {
                            session.IsDeleted = false;
                        }

                        session.CurrentState = "AWAITING_RATING_SCORE";
                        session.SelectedSessionId = currentToken.Id;
                        _chatSessionCache.SetSession(session);
                    }

                    var languagePreference = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.GetPatientLanguage(currentToken.Patient, session);
                    string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(
                        languagePreference, 
                        "FEEDBACK_REQUEST_ALERT", 
                        queue.Doctor?.Name ?? "Doctor", 
                        $"Token #{currentToken.TokenNumber} ({currentToken.Patient?.Name ?? "Walk-in"}) - {currentToken.Id.ToString().Substring(0,8).ToUpper()}");

                    try 
                    {
                        var channel = CodeX.Application.Common.Helpers.ChannelRoutingHelper.ResolveChannel(currentToken, branch, currentToken.Patient);
                        Console.WriteLine($"[RATING_DEBUG] CompleteToken: Token #{currentToken.TokenNumber}, ResolvedChannel: {channel}, HasBranch: {branch != null}, TelegramChatId: {currentToken.Patient?.TelegramChatId}, Phone: {currentToken.Patient?.Phone}");

                        if (channel == CodeX.Application.Common.Helpers.CommunicationChannel.Telegram && !string.IsNullOrWhiteSpace(currentToken.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(currentToken.Patient.TelegramChatId, translatedMsg, queue.BranchId);
                            _context.MessageLogs.Add(new MessageLog
                            {
                                BranchId = queue.BranchId,
                                RecipientPhone = currentToken.Patient.Phone ?? currentToken.Patient.TelegramChatId,
                                MessageType = "RatingRequest_Telegram",
                                Status = "Delivered",
                                TokenId = currentToken.Id
                            });
                        }
                        else if (channel == CodeX.Application.Common.Helpers.CommunicationChannel.WhatsApp && !string.IsNullOrWhiteSpace(currentToken.Patient.Phone))
                        {
                            await _whatsappService.SendTextMessage(currentToken.Patient.Phone, translatedMsg, queue.BranchId);
                            _context.MessageLogs.Add(new MessageLog
                            {
                                BranchId = queue.BranchId,
                                RecipientPhone = currentToken.Patient.Phone,
                                MessageType = "RatingRequest_WhatsApp",
                                Status = "Delivered",
                                TokenId = currentToken.Id
                            });
                        }
                        else
                        {
                            Console.WriteLine($"[RATING_DEBUG] Skipped sending rating request. Channel={channel}, TelegramChatId={currentToken.Patient.TelegramChatId}, Phone={currentToken.Patient.Phone}");
                        }
                    } 
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[RATING_ERROR] Failed to send feedback request: {ex.Message}");
                        _context.MessageLogs.Add(new MessageLog
                        {
                            BranchId = queue.BranchId,
                            RecipientPhone = currentToken.Patient?.Phone ?? currentToken.Patient?.TelegramChatId ?? "N/A",
                            MessageType = "RatingRequest",
                            Status = "Failed",
                            ErrorMessage = ex.Message,
                            TokenId = currentToken.Id
                        });
                    }
                }
                
                await _context.SaveChangesAsync(cancellationToken);
                
                // Notify via SignalR
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                return true;
            }

            return false;
        }
    }
}
