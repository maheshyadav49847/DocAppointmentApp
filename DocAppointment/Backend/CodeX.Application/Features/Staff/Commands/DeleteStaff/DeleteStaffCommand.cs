using CodeX.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Features.Staff.Commands.DeleteStaff
{
    public record DeleteStaffCommand(Guid Id) : IRequest<Unit>;

    public class DeleteStaffCommandHandler : IRequestHandler<DeleteStaffCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DeleteStaffCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Unit> Handle(DeleteStaffCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new Exception("Staff member not found.");

            StaffAccessRules.EnsureCanManageTarget(_currentUserService, staff);
            staff.IsDeleted = true;
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
