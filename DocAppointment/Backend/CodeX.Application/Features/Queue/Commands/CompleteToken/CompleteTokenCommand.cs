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

        public CompleteTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
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
                        .IgnoreQueryFilters()
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

                    string msg = $"🌟 *Aapka Appointment Pura Hua!* 🌟\n\n" +
                                 $"Dr. {queue.Doctor?.Name} ke sath aapka anubhav kaisa raha?\n\n" +
                                 $"Kripya 1 se 5 ke beech ek rating dekar humein batayein:\n" +
                                 $"5 = Behtareen (Excellent) 🤩\n" +
                                 $"4 = Bahut Achha (Very Good) 😊\n" +
                                 $"3 = Theek (Average) 😐\n" +
                                 $"2 = Kharab (Poor) 😞\n" +
                                 $"1 = Bahut Kharab (Terrible) 😠\n\n" +
                                 $"👉 *Sirf number likhkar bhejein (Jaise: 5)*";

                    try {
                        await _whatsappService.SendTextMessage(currentToken.Patient.Phone, msg, queue.BranchId);
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
