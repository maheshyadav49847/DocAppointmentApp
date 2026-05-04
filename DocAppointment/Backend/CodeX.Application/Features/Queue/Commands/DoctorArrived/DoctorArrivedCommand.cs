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

        public DoctorArrivedCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, IWhatsAppService whatsappService)
        {
            _context = context;
            _notificationService = notificationService;
            _whatsappService = whatsappService;
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

            // Notify via SignalR
            await _notificationService.NotifyDoctorArrived(queue.BranchId, queue.Id, queue.Doctor.Name);

            // Notify all waiting patients via WhatsApp
            var waitingPatients = queue.Tokens.Where(t => t.Status == TokenStatus.Pending && t.Patient != null);
            foreach (var token in waitingPatients)
            {
                await _whatsappService.SendDoctorArrivalAlert(token.Patient!.Phone, queue.Doctor.Name);
            }

            return true;
        }
    }
}
