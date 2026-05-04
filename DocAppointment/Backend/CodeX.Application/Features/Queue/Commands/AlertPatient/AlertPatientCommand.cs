using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Queue.Commands.AlertPatient
{
    public record AlertPatientCommand(Guid QueueId) : IRequest<bool>;

    public class AlertPatientCommandHandler : IRequestHandler<AlertPatientCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IWhatsAppService _whatsappService;

        public AlertPatientCommandHandler(IApplicationDbContext context, IWhatsAppService whatsappService)
        {
            _context = context;
            _whatsappService = whatsappService;
        }

        public async Task<bool> Handle(AlertPatientCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Tokens)
                .ThenInclude(x => x.Patient)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) throw new Exception("Queue not found");

            var currentToken = queue.Tokens
                .FirstOrDefault(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called);

            if (currentToken == null) 
                throw new Exception("No active patient is currently being called. Please call a patient first.");

            if (currentToken.Patient == null || string.IsNullOrEmpty(currentToken.Patient.Phone))
                throw new Exception("Patient contact information (phone) is missing.");

            await _whatsappService.SendYourTurnAlert(currentToken.Patient.Phone, currentToken.TokenNumber);
            return true;
        }
    }
}
