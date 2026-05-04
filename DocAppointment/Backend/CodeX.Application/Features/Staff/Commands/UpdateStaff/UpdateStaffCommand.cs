using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Staff.Commands.UpdateStaff
{
    public record UpdateStaffCommand : IRequest<Unit>
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public StaffRole Role { get; init; }
        public string? NewPassword { get; init; } // Optional — only update if provided
    }

    public class UpdateStaffCommandHandler : IRequestHandler<UpdateStaffCommand, Unit>
    {
        private readonly IApplicationDbContext _context;

        public UpdateStaffCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(UpdateStaffCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new Exception("Staff member not found.");

            // Check email uniqueness if changed
            var emailTaken = await _context.Staffs
                .AnyAsync(s => s.Email.ToLower() == request.Email.ToLower() && s.Id != request.Id, cancellationToken);

            if (emailTaken)
                throw new Exception("This email is already used by another staff member.");

            staff.Email = request.Email;
            staff.Role = request.Role;

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
                staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
