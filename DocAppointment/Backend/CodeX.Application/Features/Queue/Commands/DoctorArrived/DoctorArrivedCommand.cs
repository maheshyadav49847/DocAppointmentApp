using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.DoctorArrived
{
    public record DoctorArrivedCommand(Guid QueueId) : IRequest<bool>;

    public class DoctorArrivedCommandHandler : IRequestHandler<DoctorArrivedCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly IWhatsAppService _whatsappService;
        private readonly ITelegramService _telegramService;

        public DoctorArrivedCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService, ITelegramService telegramService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
            _telegramService = telegramService;
        }

        public async Task<bool> Handle(DoctorArrivedCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
                .Include(x => x.Tokens)
                .ThenInclude(x => x.Patient)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            queue.Status = QueueStatus.Active;
            queue.ActualStartAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            // Notify via SignalR (Background)
            try 
            {
                await _notificationService.NotifyDoctorArrived(queue.BranchId, queue.Id, queue.Doctor.Name);
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
            }

            // Pre-fetch sessions to minimize DB queries in the loop
            var waitingPatients = queue.Tokens.Where(t => t.Status == TokenStatus.Pending && t.Patient != null).ToList();
            var phoneNumbers = waitingPatients.Select(t => t.Patient!.Phone).Distinct().ToList();
            var sessions = await _context.ChatSessions
                .Where(s => phoneNumbers.Contains(s.PhoneNumber) && s.BranchId == queue.BranchId)
                .ToListAsync(cancellationToken);

            foreach (var token in waitingPatients)
            {
                try 
                {
                    var session = sessions.FirstOrDefault(s => s.PhoneNumber == token.Patient!.Phone);
                    var language = session?.Language ?? "3";
                    string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "DOCTOR_ARRIVAL_ALERT", queue.Doctor.Name);

                    if (!string.IsNullOrWhiteSpace(token.Patient!.TelegramChatId))
                    {
                        await _telegramService.SendTextMessage(token.Patient!.TelegramChatId, translatedMsg, queue.BranchId);
                    }
                    else if (!string.IsNullOrWhiteSpace(token.Patient!.Phone))
                    {
                        await _whatsappService.SendTextMessage(token.Patient!.Phone, translatedMsg, queue.BranchId);
                    }
                }
                catch (System.Exception ex)
                {
                    Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}");
                }
            }

            return true;
        }
    }
}
