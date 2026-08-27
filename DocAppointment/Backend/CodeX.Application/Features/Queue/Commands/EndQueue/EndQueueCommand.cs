using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Queue.Commands.EndQueue
{
    [System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
    public enum EndQueueAction
    {
        CancelRemaining,
        TransferRemaining
    }

    public class EndQueueDto
    {
        public EndQueueAction Action { get; set; }
        public Guid? TargetSessionId { get; set; }
    }

    public record EndQueueCommand(Guid QueueId, EndQueueAction Action = EndQueueAction.CancelRemaining, Guid? TargetSessionId = null) : IRequest<bool>;

    public class EndQueueCommandHandler : IRequestHandler<EndQueueCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsAppService;
        private readonly ITelegramService _telegramService;
        private readonly IChatSessionCache _chatSessionCache;

        public EndQueueCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsAppService, IChatSessionCache chatSessionCache, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsAppService = whatsAppService;
            _telegramService = telegramService;
            _chatSessionCache = chatSessionCache;
        }

        public async Task<bool> Handle(EndQueueCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            queue.Status = QueueStatus.Completed;
            queue.ActualEndAt = DateTime.UtcNow;

            // Mark any 'Called' tokens as Completed
            var tokens = await _context.Tokens.Include(t => t.Patient).Where(t => t.QueueId == queue.Id && (t.Status == TokenStatus.Called || t.Status == TokenStatus.Pending || t.Status == TokenStatus.Skipped)).ToListAsync(cancellationToken);
            
            DailyQueue? targetQueue = null;
            if (request.Action == EndQueueAction.TransferRemaining && request.TargetSessionId.HasValue)
            {
                var targetSession = await _context.Sessions.Include(s => s.Doctor).FirstOrDefaultAsync(s => s.Id == request.TargetSessionId.Value, cancellationToken);
                if (targetSession != null)
                {
                    targetQueue = await _context.DailyQueues
                        .FirstOrDefaultAsync(q => q.SessionId == targetSession.Id && q.QueueDate.Date == DateTime.UtcNow.Date, cancellationToken);
                    
                    if (targetQueue == null)
                    {
                        // Initialize it
                        targetQueue = new DailyQueue
                        {
                            Id = Guid.NewGuid(),
                            SessionId = targetSession.Id,
                            DoctorId = targetSession.DoctorId,
                            BranchId = queue.BranchId,
                            QueueDate = DateTime.UtcNow.Date,
                            Status = QueueStatus.Open,
                            CurrentTokenNumber = 0
                        };
                        _context.DailyQueues.Add(targetQueue);
                    }
                }
            }

            int nextTokenNumber = targetQueue != null ? (await _context.Tokens.Where(t => t.QueueId == targetQueue.Id).MaxAsync(t => (int?)t.TokenNumber, cancellationToken) ?? 0) + 1 : 1;

            foreach (var token in tokens)
            {
                if (token.Status == TokenStatus.Called)
                {
                    token.Status = TokenStatus.Completed;
                    token.CompletedAt = DateTime.UtcNow;

                    if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                    {
                        try 
                        { 
                            var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == token.Patient.Phone, cancellationToken);
                            if (chatSession == null)
                            {
                                chatSession = new ChatSession { PhoneNumber = token.Patient.Phone };
                                _context.ChatSessions.Add(chatSession);
                            }
                            chatSession.CurrentState = "AWAITING_RATING_SCORE";
                            chatSession.SelectedSessionId = token.Id; // Reusing field to store TokenId for rating

                            _chatSessionCache.SetSession(chatSession);

                            var language = chatSession.Language ?? "3";
                            var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "FEEDBACK_REQUEST_ALERT", queue.Doctor.Name, $"Token #{token.TokenNumber} ({token.Patient?.Name ?? "Walk-in"}) - {token.Id.ToString().Substring(0,8).ToUpper()}");
                            
                            if (token.Source == CodeX.Domain.Enums.BookingSource.Telegram && !string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                            {
                                await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                            }
                            else if (token.Source == CodeX.Domain.Enums.BookingSource.WhatsApp && !string.IsNullOrWhiteSpace(token.Patient.Phone))
                            {
                                await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                            }
                            else
                            {
                                if (!string.IsNullOrWhiteSpace(token.Patient.Phone))
                                    await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                                else if (!string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                                    await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                            } 
                        }
                        catch { /* Log and ignore */ }
                    }
                }
                else if (token.Status == TokenStatus.Pending || token.Status == TokenStatus.Skipped)
                {
                    if (request.Action == EndQueueAction.TransferRemaining && targetQueue != null)
                    {
                        token.QueueId = targetQueue.Id;
                        token.Status = TokenStatus.Pending;
                        token.TokenNumber = nextTokenNumber++;
                        
                        // Need to fetch target session name if available, for WhatsApp message
                        var sessionName = _context.Sessions.Where(s => s.Id == targetQueue.SessionId).Select(s => s.StartTime.ToString(@"hh\:mm") + " - " + s.EndTime.ToString(@"hh\:mm")).FirstOrDefault() ?? "Next Session";
                        
                        if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                        {
                            try { 
                                var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == token.Patient.Phone, cancellationToken);
                                var language = chatSession?.Language ?? "1";
                                var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "SESSION_TRANSFERRED_ALERT", queue.Doctor.Name, sessionName, token.TokenNumber);
                                
                                if (token.Source == CodeX.Domain.Enums.BookingSource.Telegram && !string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                                {
                                    await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                                }
                                else if (token.Source == CodeX.Domain.Enums.BookingSource.WhatsApp && !string.IsNullOrWhiteSpace(token.Patient.Phone))
                                {
                                    await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                                }
                                else
                                {
                                    if (!string.IsNullOrWhiteSpace(token.Patient.Phone))
                                        await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                                    else if (!string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                                        await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                                }
                            } catch { }
                        }
                    }
                    else
                    {
                        token.Status = TokenStatus.Cancelled;
                        if (token.Patient != null && !string.IsNullOrEmpty(token.Patient.Phone))
                        {
                            try { 
                                var chatSession = await _context.ChatSessions.FirstOrDefaultAsync(s => s.PhoneNumber == token.Patient.Phone, cancellationToken);
                                var language = chatSession?.Language ?? "1";
                                var msg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "SESSION_CANCELLED_ALERT", queue.Doctor.Name);
                                
                                if (token.Source == CodeX.Domain.Enums.BookingSource.Telegram && !string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                                {
                                    await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                                }
                                else if (token.Source == CodeX.Domain.Enums.BookingSource.WhatsApp && !string.IsNullOrWhiteSpace(token.Patient.Phone))
                                {
                                    await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                                }
                                else
                                {
                                    if (!string.IsNullOrWhiteSpace(token.Patient.Phone))
                                        await _whatsAppService.SendTextMessage(token.Patient.Phone, msg, queue.BranchId);
                                    else if (!string.IsNullOrWhiteSpace(token.Patient.TelegramChatId))
                                        await _telegramService.SendTextMessage(token.Patient.TelegramChatId, msg, queue.BranchId);
                                } 
                            } catch { }
                        }
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyQueueEnded(queue.BranchId, queue.Id);

            return true;
        }
    }
}
