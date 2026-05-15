using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Tokens.Commands.CreateToken
{
    public record CreateTokenCommand : IRequest<Guid>
    {
        [Required]
        public Guid QueueId { get; init; }

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string PatientName { get; init; } = string.Empty;

        [Required]
        [RegularExpression(@"^\+?\d{10,15}$", ErrorMessage = "Invalid phone number format. Use 10-15 digits.")]
        public string PatientPhone { get; init; } = string.Empty;

        [Required]
        public BookingSource Source { get; init; } = BookingSource.WhatsApp;
    }

    public class CreateTokenCommandHandler : IRequestHandler<CreateTokenCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly IWhatsAppService _whatsappService;
        private readonly ISmsService _smsService;
        private readonly IQueueNotificationService _notificationService;

        public CreateTokenCommandHandler(IApplicationDbContext context, IWhatsAppService whatsappService, ISmsService smsService, IQueueNotificationService notificationService)
        {
            _context = context;
            _whatsappService = whatsappService;
            _smsService = smsService;
            _notificationService = notificationService;
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

        public async Task<Guid> Handle(CreateTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(q => q.Session)
                .Include(q => q.Branch)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) 
            {
                throw new Exception($"Queue not found. Requested ID: {request.QueueId}");
            }

            if (queue.Branch != null && !queue.Branch.IsActive)
            {
                throw new Exception("This branch is currently offline and not accepting bookings.");
            }

            var tokenCount = await _context.Tokens.CountAsync(t => t.QueueId == queue.Id, cancellationToken);
            if (queue.Session.DefaultCapacity > 0 && tokenCount >= queue.Session.DefaultCapacity)
            {
                throw new Exception($"Queue is full. Maximum capacity of {queue.Session.DefaultCapacity} reached.");
            }

            var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.PatientPhone);

            // 1. Find Patient
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => p.Phone == normalizedPhone, cancellationToken);

            // 2. Duplicate Check (If patient exists)
            if (patient != null)
            {
                var hasActiveToken = await _context.Tokens
                    .AnyAsync(t => t.QueueId == request.QueueId && 
                                   t.PatientId == patient.Id && 
                                   (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called), 
                                   cancellationToken);

                if (hasActiveToken)
                {
                    throw new Exception("This patient already has an active token in this session.");
                }
            }
            else
            {
                // Create new patient
                patient = new Patient
                {
                    Name = request.PatientName,
                    Phone = normalizedPhone
                };
                _context.Patients.Add(patient);
            }

            Token? token = null;
            var saved = false;
            for (var attempt = 0; attempt < 3; attempt++)
            {
                var nextTokenNumber = ((await _context.Tokens
                    .Where(t => t.QueueId == queue.Id)
                    .MaxAsync(t => (int?)t.TokenNumber, cancellationToken)) ?? 0) + 1;

                token = new Token
                {
                    QueueId = queue.Id,
                    Patient = patient,
                    TokenNumber = nextTokenNumber,
                    Status = TokenStatus.Pending,
                    Source = request.Source,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Tokens.Add(token);

                try
                {
                    await _context.SaveChangesAsync(cancellationToken);
                    saved = true;
                    break;
                }
                catch (DbUpdateException ex) when (IsUniqueTokenConflict(ex) && attempt < 2)
                {
                    _context.Tokens.Remove(token);
                }
            }

            if (!saved || token == null)
            {
                throw new Exception("Failed to allocate a unique token number. Please retry.");
            }

            // 4. Notifications (Fire and forget to keep UI fast)
            _ = Task.Run(async () => 
            {
                try 
                {
                    await _whatsappService.SendWelcomeMessage(patient.Phone, patient.Name, token.TokenNumber, queue.BranchId);
                    await LogMessage(queue.BranchId, patient.Phone, "BookingConfirmation", "Delivered", tokenId: token.Id);
                }
                catch (System.Exception ex)
                {
                    Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}. Attempting SMS Fallback...");
                    await LogMessage(queue.BranchId, patient.Phone, "BookingConfirmation", "Failed", error: ex.Message, tokenId: token.Id);

                    try
                    {
                        var smsMsg = $"Namaste {patient.Name}, Aapka Token #{token.TokenNumber} book ho gaya hai. Dr. {queue.Doctor.Name}. Swasth rahein!";
                        await _smsService.SendSmsAsync(patient.Phone, smsMsg);
                        await LogMessage(queue.BranchId, patient.Phone, "BookingConfirmation_SMS", "Sent", tokenId: token.Id);
                    }
                    catch (Exception smsEx)
                    {
                        await LogMessage(queue.BranchId, patient.Phone, "BookingConfirmation_SMS", "Failed", error: smsEx.Message, tokenId: token.Id);
                    }
                }
            });

            _ = Task.Run(async () => 
            {
                try 
                {
                    await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                }
                catch (System.Exception ex)
                {
                    Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
                }
            });

            return token.Id;
        }

        private static bool IsUniqueTokenConflict(DbUpdateException ex)
        {
            var message = ex.InnerException?.Message ?? ex.Message;
            return message.Contains("QueueId", StringComparison.OrdinalIgnoreCase) &&
                   message.Contains("TokenNumber", StringComparison.OrdinalIgnoreCase);
        }
    }
}
