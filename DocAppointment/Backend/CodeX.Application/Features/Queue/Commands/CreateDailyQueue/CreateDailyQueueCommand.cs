using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Queue.Commands.CreateDailyQueue
{
    public record CreateDailyQueueCommand : IRequest<Guid>
    {
        public Guid DoctorId { get; init; }
        public Guid SessionId { get; init; }
    }

    public class CreateDailyQueueCommandHandler : IRequestHandler<CreateDailyQueueCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateDailyQueueCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateDailyQueueCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions
                .Include(s => s.Doctor)
                .Include(s => s.Branch)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);

            if (session == null)
            {
                throw new CodeX.Application.Common.Exceptions.EntityNotFoundException(nameof(Session), request.SessionId);
            }

            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(session.Branch?.Timezone);
            var tomorrow = today.AddDays(1);

            var existing = await _context.DailyQueues
                .FirstOrDefaultAsync(q =>
                    q.DoctorId == request.DoctorId &&
                    q.SessionId == request.SessionId &&
                    q.QueueDate >= today &&
                    q.QueueDate < tomorrow,
                    cancellationToken);

            if (existing != null)
            {
                if (!_currentUserService.IsInRole("SuperAdmin"))
                {
                    var hasAccess = await _context.Branches
                        .AnyAsync(b => b.Id == existing.BranchId && b.OrganizationId == _currentUserService.OrgId, cancellationToken);
                    if (!hasAccess)
                        throw new CodeX.Application.Common.Exceptions.ForbiddenAccessException(
                            "DailyQueue",
                            "You do not have access to this queue."
                        );
                }
                return existing.Id;
            }

            if (session.Doctor == null)
            {
                throw new CodeX.Application.Common.Exceptions.EntityNotFoundException(nameof(Doctor), request.DoctorId);
            }

            if (session.DoctorId != request.DoctorId)
            {
                throw new CodeX.Application.Common.Exceptions.BusinessRuleViolationException(
                    "The selected session does not belong to this doctor.",
                    "SESSION_DOCTOR_MISMATCH",
                    new { SessionId = request.SessionId, DoctorId = request.DoctorId }
                );
            }

            if (!_currentUserService.IsInRole("SuperAdmin"))
            {
                if (session.Branch == null || session.Branch.OrganizationId != _currentUserService.OrgId)
                {
                    throw new CodeX.Application.Common.Exceptions.ForbiddenAccessException(
                        "Queue",
                        "You can only create queues for your own organization."
                    );
                }
            }

            var queue = new DailyQueue
            {
                Id = Guid.NewGuid(),
                DoctorId = request.DoctorId,
                SessionId = request.SessionId,
                BranchId = session.BranchId,
                QueueDate = today,
                CurrentTokenNumber = 0,
                Status = 0
            };

            _context.DailyQueues.Add(queue);
            await _context.SaveChangesAsync(cancellationToken);

            return queue.Id;
        }
    }
}
