using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Staff.Commands.ToggleStaffStatus
{
    public record ToggleStaffStatusCommand(Guid Id) : IRequest<bool>;

    public class ToggleStaffStatusCommandHandler : IRequestHandler<ToggleStaffStatusCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public ToggleStaffStatusCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(ToggleStaffStatusCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

            if (staff == null)
            {
                throw new Exception("Staff member not found");
            }

            // Toggle active status
            staff.IsActive = !staff.IsActive;

            // If we are unlocking/activating, also reset failed login attempts
            if (staff.IsActive)
            {
                staff.FailedLoginAttempts = 0;
                staff.LockoutEnd = null;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return staff.IsActive;
        }
    }
}
