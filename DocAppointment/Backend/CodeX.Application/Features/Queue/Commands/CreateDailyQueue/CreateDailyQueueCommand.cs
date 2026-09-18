using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Queue.Commands.EndQueue;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
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
        private readonly IQueueNotificationService _notificationService;
        private readonly IMediator _mediator;

        public CreateDailyQueueCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService, IQueueNotificationService notificationService, IMediator mediator)
        {
            _context = context;
            _currentUserService = currentUserService;
            _notificationService = notificationService;
            _mediator = mediator;
        }

        public async Task<Guid> Handle(CreateDailyQueueCommand request, CancellationToken cancellationToken)
        {
            var session = await _context.Sessions
                .Include(s => s.Doctor)
                .Include(s => s.Branch)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);

            if (session == null)
            {
                throw new Exception("Session not found");
            }

            var today = CodeX.Application.Common.Helpers.TimeHelper.GetBranchLocalToday(session.Branch?.Timezone);
            var tomorrow = today.AddDays(1);
            var todayStartUtc = DateTime.SpecifyKind(today.Date, DateTimeKind.Utc);
            var todayEndUtc = DateTime.SpecifyKind(today.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            // Security Check: Block session creation if doctor is on active leave today
            var activeLeave = await _context.LeaveRecords
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(l => !l.IsDeleted &&
                    l.DoctorId == request.DoctorId &&
                    (l.BranchId == null || l.BranchId == session.BranchId) &&
                    (l.SessionId == null || l.SessionId == request.SessionId) &&
                    (l.Status == LeaveStatus.Approved || (l.Status == LeaveStatus.Pending && l.LeaveType == LeaveType.Unplanned)) &&
                    l.StartDate <= todayEndUtc &&
                    l.EndDate >= todayStartUtc, cancellationToken);

            if (activeLeave != null)
            {
                var docName = session.Doctor?.Name ?? "Doctor";
                var reasonText = !string.IsNullOrWhiteSpace(activeLeave.PublicNotice) ? activeLeave.PublicNotice : activeLeave.Reason;
                throw new InvalidOperationException($"Cannot start session: Dr. {docName} is on leave today ({activeLeave.LeaveType} Leave: {reasonText}).");
            }

            // Auto-end any open queues from previous days to ensure patients get notified
            var oldOpenQueues = await _context.DailyQueues
                .Where(q => q.DoctorId == request.DoctorId && 
                            q.Status == CodeX.Domain.Enums.QueueStatus.Open && 
                            q.QueueDate < today)
                .ToListAsync(cancellationToken);

            foreach (var oldQueue in oldOpenQueues)
            {
                await _mediator.Send(new EndQueueCommand(oldQueue.Id, EndQueueAction.CancelRemaining), cancellationToken);
            }

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
                    if (!hasAccess) throw new Exception("You do not have access to this queue.");
                }

                if (existing.Status == CodeX.Domain.Enums.QueueStatus.Completed || existing.Status == CodeX.Domain.Enums.QueueStatus.Cancelled)
                {
                    existing.Status = CodeX.Domain.Enums.QueueStatus.Open;
                    existing.ActualEndAt = null;
                    await _context.SaveChangesAsync(cancellationToken);
                }

                await _notificationService.NotifyQueueStarted(existing.BranchId, existing.Id);
                return existing.Id;
            }

            if (session.Doctor == null)
            {
                throw new Exception("Doctor not found for this session");
            }

            if (session.DoctorId != request.DoctorId)
            {
                throw new Exception("The selected session does not belong to this doctor.");
            }

            if (!_currentUserService.IsInRole("SuperAdmin"))
            {
                if (session.Branch == null || session.Branch.OrganizationId != _currentUserService.OrgId)
                {
                    throw new Exception("You can only create queues for your own organization.");
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
                Status = CodeX.Domain.Enums.QueueStatus.Open
            };

            _context.DailyQueues.Add(queue);
            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.NotifyQueueStarted(queue.BranchId, queue.Id);
            return queue.Id;
        }
    }
}
