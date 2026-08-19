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
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) return false;

            var currentToken = queue.Tokens
                .FirstOrDefault(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called);

            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Completed;
                currentToken.CompletedAt = DateTime.UtcNow;
                queue.CurrentTokenNumber = 0;

                if (currentToken.Patient != null && !string.IsNullOrWhiteSpace(currentToken.Patient.Phone))
                {
                    var phoneVars = CodeX.Application.Common.Helpers.NormalizationHelper.GetPhoneVariations(currentToken.Patient.Phone).ToList();
                    var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(currentToken.Patient.Phone);
                    phoneVars.Add(normalizedPhone);

                    var session = await _context.ChatSessions
                        
                        .FirstOrDefaultAsync(s => phoneVars.Contains(s.PhoneNumber) && s.BranchId == queue.BranchId, cancellationToken);
                    if (session == null)
                    {
                        session = new ChatSession
                        {
                            PhoneNumber = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(currentToken.Patient.Phone),
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

                    // IMPORTANT: Update the memory cache as well, otherwise webhook will read old state
                    _chatSessionCache.SetSession(session);

                    var languagePreference = session.Language ?? "1";

                    string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(languagePreference, "FEEDBACK_REQUEST_ALERT", queue.Doctor?.Name, $"Token #{currentToken.TokenNumber} ({currentToken.Patient?.Name ?? "Walk-in"}) - {currentToken.Id.ToString().Substring(0,8).ToUpper()}");

                    try {
                        if (!string.IsNullOrWhiteSpace(currentToken.Patient.TelegramChatId))
                        {
                            await _telegramService.SendTextMessage(currentToken.Patient.TelegramChatId, translatedMsg, queue.BranchId);
                        }
                        else
                        {
                            await _whatsappService.SendTextMessage(currentToken.Patient.Phone, translatedMsg, queue.BranchId);
                        }
                    } catch { }
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
