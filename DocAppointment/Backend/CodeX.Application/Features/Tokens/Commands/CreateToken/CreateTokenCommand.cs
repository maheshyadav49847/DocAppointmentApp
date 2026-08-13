using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Tokens.Commands.CreateToken
{
    public record CreateTokenResult(Guid TokenId, int TokenNumber, int EstimatedWaitMinutes);

    public record CreateTokenCommand : IRequest<CreateTokenResult>
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

        public Guid? PatientId { get; init; }
    }

    public class CreateTokenCommandHandler : IRequestHandler<CreateTokenCommand, CreateTokenResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly IWhatsAppService _whatsappService;
        private readonly ISmsService _smsService;
        private readonly IQueueNotificationService _notificationService;
        private readonly Microsoft.Extensions.DependencyInjection.IServiceScopeFactory _serviceScopeFactory;

        public CreateTokenCommandHandler(
            IApplicationDbContext context, 
            IWhatsAppService whatsappService, 
            ISmsService smsService, 
            IQueueNotificationService notificationService,
            Microsoft.Extensions.DependencyInjection.IServiceScopeFactory serviceScopeFactory)
        {
            _context = context;
            _whatsappService = whatsappService;
            _smsService = smsService;
            _notificationService = notificationService;
            _serviceScopeFactory = serviceScopeFactory;
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

        public async Task<CreateTokenResult> Handle(CreateTokenCommand request, CancellationToken cancellationToken)
        {
            // IgnoreQueryFilters: This handler is called from WhatsApp webhook (anonymous context).
            // Global OrgId filter must be bypassed so Branch INNER JOIN does not fail.
            var queue = await _context.DailyQueues
                .IgnoreQueryFilters()
                .Include(q => q.Session)
                .Include(q => q.Branch)
                .FirstOrDefaultAsync(x => !x.IsDeleted && x.Id == request.QueueId, cancellationToken);

            if (queue == null) 
            {
                throw new Exception($"Queue not found. Requested ID: {request.QueueId}");
            }

            if (queue.Branch != null && !queue.Branch.IsActive)
            {
                throw new Exception("This branch is currently offline and not accepting bookings.");
            }

            var tokenCount = await _context.Tokens
                .IgnoreQueryFilters()
                .CountAsync(t => !t.IsDeleted && t.QueueId == queue.Id, cancellationToken);
            
            var maxTokenNumber = await _context.Tokens
                .IgnoreQueryFilters()
                .Where(t => t.QueueId == queue.Id)
                .MaxAsync(t => (int?)t.TokenNumber, cancellationToken) ?? 0;

            if (queue.Session.DefaultCapacity > 0 && tokenCount >= queue.Session.DefaultCapacity)
            {
                throw new Exception($"Queue is full. Maximum capacity of {queue.Session.DefaultCapacity} reached.");
            }

            var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.PatientPhone);

            // 1. Find Patient
            Patient? patient = null;

            if (request.PatientId.HasValue)
            {
                patient = await _context.Patients.FirstOrDefaultAsync(p => p.Id == request.PatientId.Value, cancellationToken);
                if (patient == null)
                {
                    throw new Exception("Selected patient not found in the database.");
                }
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.PatientPhone))
                {
                    patient = await _context.Patients
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync(p => !p.IsDeleted && p.Phone != null && p.Phone == normalizedPhone, cancellationToken);
                }

                if (patient != null)
                {
                    // Existing phone but no ID provided - check name mismatch to avoid hijacking another person's record
                    var similarity = !string.IsNullOrWhiteSpace(patient.Name) && !string.IsNullOrWhiteSpace(request.PatientName) 
                        && (patient.Name.Contains(request.PatientName, StringComparison.OrdinalIgnoreCase) || request.PatientName.Contains(patient.Name, StringComparison.OrdinalIgnoreCase));
                    
                    if (!similarity && !patient.Name.Equals(request.PatientName, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new Exception($"Phone number is already registered to '{patient.Name}'. Please select them from the suggestions or use a different number for {request.PatientName}.");
                    }
                }
                else
                {
                    // Create new patient with proper OrgId so it's visible to the frontend
                    patient = new Patient
                    {
                        Name = request.PatientName,
                        Phone = normalizedPhone,
                        OrganizationId = queue.Branch?.OrganizationId ?? Guid.Empty
                    };
                    _context.Patients.Add(patient);
                }
            }

            // Fix existing patients created with empty OrgId from WhatsApp webhook
            if (patient.OrganizationId == Guid.Empty && queue.Branch != null)
            {
                patient.OrganizationId = queue.Branch.OrganizationId;
            }

            // 2. Duplicate Check (If patient exists)
            if (patient.Id != Guid.Empty)
            {
                var hasActiveToken = await _context.Tokens
                    .IgnoreQueryFilters()
                    .AnyAsync(t => !t.IsDeleted && t.QueueId == request.QueueId && 
                                   t.PatientId == patient.Id && 
                                   (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called), 
                                   cancellationToken);

                if (hasActiveToken)
                {
                    throw new Exception($"Patient '{patient.Name}' already has an active booking in this queue.");
                }
            }

            Token? token = null;
            var saved = false;
            for (var attempt = 0; attempt < 3; attempt++)
            {
                var nextTokenNumber = ((await _context.Tokens
                    .IgnoreQueryFilters()
                    .Where(t => t.QueueId == queue.Id)
                    .MaxAsync(t => (int?)t.TokenNumber, cancellationToken)) ?? 0) + 1;

                token = new Token
                {
                    QueueId = queue.Id,
                    PatientId = patient.Id,
                    TokenNumber = nextTokenNumber,
                    Status = TokenStatus.Pending,
                    Source = request.Source,
                    CreatedAt = DateTime.UtcNow,
                    // Pre-set proper OrgId so token is visible to frontend (AppDbContext only auto-sets if Guid.Empty)
                    OrganizationId = queue.Branch?.OrganizationId ?? patient.OrganizationId
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

            // Calculate predictive wait time (assuming 10 mins per waiting patient ahead of this token)
            var patientsAhead = await _context.Tokens
                
                .Where(t => !t.IsDeleted && t.QueueId == queue.Id && (t.Status == TokenStatus.Pending || t.Status == TokenStatus.Called) && t.TokenNumber < token.TokenNumber)
                .CountAsync(cancellationToken);
            var estimatedWaitMinutes = patientsAhead * 10;
            if (estimatedWaitMinutes == 0) estimatedWaitMinutes = 5; // Minimum buffer

            // 6. Send Notification in Background (Fire and Forget)
            _ = Task.Run(async () =>
            {
                using var scope = _serviceScopeFactory.CreateScope();
                var whatsapp = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();
                var sms = scope.ServiceProvider.GetRequiredService<ISmsService>();
                var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                
                async Task LogMsg(Guid branchId, string phone, string type, string status, string? error = null, Guid? tokenId = null)
                {
                    dbContext.MessageLogs.Add(new CodeX.Domain.Entities.MessageLog { BranchId = branchId, RecipientPhone = phone, MessageType = type, Status = status, ErrorMessage = error, TokenId = tokenId });
                    await dbContext.SaveChangesAsync(default);
                }

                try 
                {
                    if (request.Source != BookingSource.WhatsApp)
                    {
                        await whatsapp.SendWelcomeMessage(patient.Phone, patient.Name, token.TokenNumber, queue.BranchId, estimatedWaitMinutes);
                        await LogMsg(queue.BranchId, patient.Phone, "BookingConfirmation", "Delivered", tokenId: token.Id);
                    }
                }
                catch (System.Exception ex)
                {
                    Console.WriteLine($"[WHATSAPP_ERROR] {ex.Message}. Attempting SMS Fallback...");
                    await LogMsg(queue.BranchId, patient.Phone, "BookingConfirmation", "Failed", error: ex.Message, tokenId: token.Id);

                    try
                    {
                        var smsMsg = $"Namaste {patient.Name}, Aapka Token #{token.TokenNumber} book ho gaya hai. Swasth rahein!";
                        await sms.SendSmsAsync(patient.Phone, smsMsg);
                        await LogMsg(queue.BranchId, patient.Phone, "BookingConfirmation_SMS", "Sent", tokenId: token.Id);
                    }
                    catch (Exception smsEx)
                    {
                        await LogMsg(queue.BranchId, patient.Phone, "BookingConfirmation_SMS", "Failed", error: smsEx.Message, tokenId: token.Id);
                    }
                }
            });

            try 
            {
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
            }
            catch (System.Exception ex)
            {
                Console.WriteLine($"[SIGNALR_ERROR] {ex.Message}");
            }

            return new CreateTokenResult(token.Id, token.TokenNumber, estimatedWaitMinutes);
        }

        private static bool IsUniqueTokenConflict(DbUpdateException ex)
        {
            var message = ex.InnerException?.Message ?? ex.Message;
            return message.Contains("QueueId", StringComparison.OrdinalIgnoreCase) &&
                   message.Contains("TokenNumber", StringComparison.OrdinalIgnoreCase);
        }
    }
}
