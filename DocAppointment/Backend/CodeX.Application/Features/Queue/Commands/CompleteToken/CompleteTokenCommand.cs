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

        public CompleteTokenCommandHandler(IApplicationDbContext context, IQueueNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> Handle(CompleteTokenCommand request, CancellationToken cancellationToken)
        {
            var queue = await _context.DailyQueues
                .Include(x => x.Tokens)
                .FirstOrDefaultAsync(x => x.Id == request.QueueId, cancellationToken);

            if (queue == null) return false;

            var currentToken = queue.Tokens
                .FirstOrDefault(t => t.TokenNumber == queue.CurrentTokenNumber && t.Status == TokenStatus.Called);

            if (currentToken != null)
            {
                currentToken.Status = TokenStatus.Completed;
                currentToken.CompletedAt = DateTime.UtcNow;
                queue.CurrentTokenNumber = 0;

                // Auto seed a PatientVisit record
                var visit = new PatientVisit
                {
                    PatientId = currentToken.PatientId,
                    TokenId = currentToken.Id,
                    DoctorId = queue.DoctorId,
                    VisitDate = DateTime.UtcNow,
                    Symptoms = string.Empty,
                    Diagnosis = string.Empty,
                    Advice = string.Empty,
                    InternalNotes = "Seeded from completed token."
                };
                _context.PatientVisits.Add(visit);
                
                await _context.SaveChangesAsync(cancellationToken);
                
                // Notify via SignalR
                await _notificationService.NotifyTokenUpdated(queue.BranchId, queue.Id, queue.CurrentTokenNumber);
                return true;
            }

            return false;
        }
    }
}
