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

            // Security Check: Validate doctor is not on leave before broadcasting arrival
            var queueDateStartUtc = DateTime.SpecifyKind(queue.QueueDate.Date, DateTimeKind.Utc);
            var queueDateEndUtc = DateTime.SpecifyKind(queue.QueueDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            var activeLeave = await _context.LeaveRecords
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => !l.IsDeleted &&
                    l.DoctorId == queue.DoctorId &&
                    (l.BranchId == null || l.BranchId == queue.BranchId) &&
                    (l.SessionId == null || l.SessionId == queue.SessionId) &&
                    (l.Status == LeaveStatus.Approved || (l.Status == LeaveStatus.Pending && l.LeaveType == LeaveType.Unplanned)) &&
                    l.StartDate <= queueDateEndUtc &&
                    l.EndDate >= queueDateStartUtc, cancellationToken);

            if (activeLeave != null)
            {
                var docName = queue.Doctor?.Name ?? "Doctor";
                var reason = !string.IsNullOrWhiteSpace(activeLeave.PublicNotice) ? activeLeave.PublicNotice : activeLeave.Reason;
                throw new InvalidOperationException($"Cannot mark arrival: Dr. {docName} is on leave today ({activeLeave.LeaveType} Leave: {reason}).");
            }

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
                    var language = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.GetPatientLanguage(token.Patient, session);
                    string translatedMsg = CodeX.Application.Common.Helpers.WhatsAppTranslationHelper.Get(language, "DOCTOR_ARRIVED_ALERT", queue.Doctor.Name);

                    var channel = CodeX.Application.Common.Helpers.ChannelRoutingHelper.ResolveChannel(token, queue.Branch, token.Patient);
                    if (channel == CodeX.Application.Common.Helpers.CommunicationChannel.Telegram)
                    {
                        await _telegramService.SendTextMessage(token.Patient!.TelegramChatId!, translatedMsg, queue.BranchId);
                    }
                    else if (channel == CodeX.Application.Common.Helpers.CommunicationChannel.WhatsApp)
                    {
                        await _whatsappService.SendTextMessage(token.Patient!.Phone!, translatedMsg, queue.BranchId);
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
