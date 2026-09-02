using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Staff.Commands.UnlockStaff
{
    public record UnlockStaffCommand(Guid Id) : IRequest<bool>;

    public class UnlockStaffCommandHandler : IRequestHandler<UnlockStaffCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public UnlockStaffCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UnlockStaffCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(x => x.Id == request.Id && !x.IsDeleted, cancellationToken);

            if (staff == null)
            {
                throw new Exception("Staff member not found");
            }

            staff.FailedLoginAttempts = 0;
            staff.LockoutEnd = null;

            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
