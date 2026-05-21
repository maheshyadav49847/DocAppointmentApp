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
        private readonly ISmsService _smsService;

        public CallNextTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, ISmsService smsService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _smsService = smsService;
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
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null)
                throw new CodeX.Application.Common.Exceptions.EntityNotFoundException("DailyQueue", request.QueueId);

            var nextToken = queue.Tokens
                .Where(t => t.Status == TokenStatus.Pending)
                .OrderBy(t => t.TokenNumber)
                .FirstOrDefault();

            var currentToken = queue.Tokens.FirstOrDefault(t => t.Status == TokenStatus.Called);
            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Completed;
                currentToken.CompletedAt = DateTime.UtcNow;

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
                        chatSession.SelectedSessionId = currentToken.Id;

                        await _whatsappService.SendFeedbackRequest(currentToken.Patient.Phone, queue.Doctor.Name, currentToken.Id, queue.BranchId);
                    }
                    catch { }
                }
            }

            if (nextToken != null)
            {
                nextToken.Status = TokenStatus.Called;
                nextToken.CalledAt = DateTime.UtcNow;
                queue.CurrentTokenNumber = nextToken.TokenNumber;
                queue.Status = QueueStatus.Active;
            }
            else
            {
                queue.CurrentTokenNumber = 0;
            }

            await _context.SaveChangesAsync(cancellationToken);

            _ = Task.Run(async () =>
            {
                try
                {
                    await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
                }
            });

            _ = Task.Run(async () =>
            {
                try
                {
                    if (nextToken != null && nextToken.Patient != null && !string.IsNullOrEmpty(nextToken.Patient.Phone))
                    {
                        try
                        {
                            await _whatsappService.SendYourTurnAlert(nextToken.Patient.Phone, nextToken.TokenNumber, queue.BranchId);
                            await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert", "Delivered", tokenId: nextToken.Id);
                        }
                        catch (Exception ex)
                        {
                            _ = LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert", "Failed", error: ex.Message, tokenId: nextToken.Id);

                            try
                            {
                                var smsMsg = $"🔔 AAPKA NUMBER AA GAYA HAI! Token #{nextToken.TokenNumber} - Dr. {queue.Doctor.Name}. Kripya turant cabin me aaiye. ✨";
                                await _smsService.SendSmsAsync(nextToken.Patient.Phone, smsMsg);
                                await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert_SMS", "Sent", tokenId: nextToken.Id);
                            }
                            catch (Exception smsEx)
                            {
                                await LogMessage(queue.BranchId, nextToken.Patient.Phone, "YourTurnAlert_SMS", "Failed", error: smsEx.Message, tokenId: nextToken.Id);
                            }
                        }
                    }

                    var upcomingPositions = new[] { 3, 5 };
                    foreach (var pos in upcomingPositions)
                    {
                        var upcomingPatient = queue.Tokens
                            .Where(t => t.Status == TokenStatus.Pending)
                            .OrderBy(t => t.TokenNumber)
                            .Skip(pos - 1)
                            .FirstOrDefault();

                        if (upcomingPatient != null && upcomingPatient.Patient != null && !string.IsNullOrEmpty(upcomingPatient.Patient.Phone))
                        {
                            await _whatsappService.SendUpcomingTurnAlert(upcomingPatient.Patient.Phone, pos, queue.BranchId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}");
                }
            });

            return queue.CurrentTokenNumber;
        }
    }
}
