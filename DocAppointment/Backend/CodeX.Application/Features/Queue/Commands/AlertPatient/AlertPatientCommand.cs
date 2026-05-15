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
        private readonly ISmsService _smsService;

        public AlertPatientCommandHandler(IApplicationDbContext context, IWhatsAppService whatsappService, ISmsService smsService)
        {
            _context = context;
            _whatsappService = whatsappService;
            _smsService = smsService;
        }

        private async Task LogMessage(Guid branchId, string phone, string type, string status, string? error = null, Guid? tokenId = null)
        {
            var log = new CodeX.Domain.Entities.MessageLog
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

        public async Task<bool> Handle(AlertPatientCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Doctor)
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

            try 
            {
                await _whatsappService.SendYourTurnAlert(currentToken.Patient.Phone, currentToken.TokenNumber, queue.BranchId);
                await LogMessage(queue.BranchId, currentToken.Patient.Phone, "AlertPatient", "Delivered", tokenId: currentToken.Id);
                return true;
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}");
                await LogMessage(queue.BranchId, currentToken.Patient.Phone, "AlertPatient", "Failed", error: ex.Message, tokenId: currentToken.Id);

                // SMS Fallback
                try
                {
                    var smsMsg = $"🔔 AAPKA NUMBER AA GAYA HAI! Token #{currentToken.TokenNumber} - Dr. {queue.Doctor.Name}. Kripya turant cabin me aaiye. ✨";
                    await _smsService.SendSmsAsync(currentToken.Patient.Phone, smsMsg);
                    await LogMessage(queue.BranchId, currentToken.Patient.Phone, "AlertPatient_SMS", "Sent", tokenId: currentToken.Id);
                    return true;
                }
                catch (Exception smsEx)
                {
                    await LogMessage(queue.BranchId, currentToken.Patient.Phone, "AlertPatient_SMS", "Failed", error: smsEx.Message, tokenId: currentToken.Id);
                    throw new Exception($"Failed to send alert via WhatsApp and SMS. WhatsApp Error: {ex.Message}. SMS Error: {smsEx.Message}");
                }
            }
        }
    }
}
