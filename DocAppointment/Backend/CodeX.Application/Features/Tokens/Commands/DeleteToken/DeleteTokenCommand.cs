using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Tokens.Commands.DeleteToken
{
    public record DeleteTokenCommand(Guid TokenId, bool DeletePatientIfOffline = false) : IRequest<bool>;

    public class DeleteTokenCommandHandler : IRequestHandler<DeleteTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IQueueNotificationService _notificationService;
        private readonly ICurrentUserService _currentUserService;

        public DeleteTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService, ICurrentUserService currentUserService)
        {
            _context = context;
            _notificationService = notificationService;
            _currentUserService = currentUserService;
        }

        public async Task<bool> Handle(DeleteTokenCommand request, CancellationToken cancellationToken)
        {
            var token = await _context.Tokens
                .Include(t => t.Queue)
                .FirstOrDefaultAsync(t => t.Id == request.TokenId, cancellationToken);

            if (token == null) throw new Exception("Token not found");

            token.IsDeleted = true;
            token.Status = TokenStatus.Cancelled;
            
            if (request.DeletePatientIfOffline && token.Source == BookingSource.WalkIn)
            {
                if (_currentUserService.HasPermission(CodeX.Domain.Constants.SystemPermissions.Queue.CancelOfflinePatient))
                {
                    var patient = await _context.Patients
                        .Include(p => p.Tokens)
                        .FirstOrDefaultAsync(p => p.Id == token.PatientId, cancellationToken);

                    if (patient != null && patient.Tokens.Count <= 1)
                    {
                        patient.IsDeleted = true;
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyTokenUpdated(token.Queue.BranchId, token.QueueId, token.Queue.CurrentTokenNumber);

            return true;
        }
    }
}
