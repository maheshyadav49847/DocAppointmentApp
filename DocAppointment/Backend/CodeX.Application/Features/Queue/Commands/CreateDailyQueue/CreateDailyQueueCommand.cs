using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
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

        public CreateDailyQueueCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateDailyQueueCommand request, CancellationToken cancellationToken)
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);
            var existing = await _context.DailyQueues
                .FirstOrDefaultAsync(q => 
                    q.DoctorId == request.DoctorId && 
                    q.SessionId == request.SessionId && 
                    q.QueueDate >= today && q.QueueDate < tomorrow, cancellationToken);

            if (existing != null) return existing.Id;

            // Fetch session to get BranchId
            var session = await _context.Sessions
                .Include(s => s.Doctor)
                .FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);

            if (session == null) throw new Exception("Session not found");
            if (session.Doctor == null) throw new Exception("Doctor not found for this session");

            // Create new queue
            var queue = new DailyQueue
            {
                Id = Guid.NewGuid(),
                DoctorId = request.DoctorId,
                SessionId = request.SessionId,
                BranchId = session.BranchId,
                QueueDate = today,
                CurrentTokenNumber = 0,
                Status = 0 // Pending/Closed
            };

            _context.DailyQueues.Add(queue);
            await _context.SaveChangesAsync(cancellationToken);

            return queue.Id;
        }
    }
}
