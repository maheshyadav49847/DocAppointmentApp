using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Staff.Commands.DeleteStaff
{
    public record DeleteStaffCommand(Guid Id) : IRequest<Unit>;

    public class DeleteStaffCommandHandler : IRequestHandler<DeleteStaffCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public DeleteStaffCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(DeleteStaffCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new Exception("Staff member not found.");

            _context.Staffs.Remove(staff);
            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
