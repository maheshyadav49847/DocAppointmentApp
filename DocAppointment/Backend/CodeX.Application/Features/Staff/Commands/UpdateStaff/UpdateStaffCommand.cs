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
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public string EmployeeId { get; init; } = string.Empty;
        public StaffRole Role { get; init; }
        public string? NewPassword { get; init; } // Optional — only update if provided
        public string PhoneNumber { get; init; } = string.Empty;
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

            // Global check: Ensure email uniqueness across the entire application if changed
            var email = request.Email.Trim().ToLower();
            var emailTaken = await _context.Staffs
                .AnyAsync(s => s.Email.ToLower() == email && s.Id != request.Id && !s.IsDeleted, cancellationToken);

            if (emailTaken)
                throw new Exception($"The email '{email}' is already taken by another user in the system.");

            staff.Email = request.Email;
            staff.FirstName = request.FirstName;
            staff.LastName = request.LastName;
            staff.EmployeeId = request.EmployeeId;
            staff.Role = request.Role;
            staff.PhoneNumber = request.PhoneNumber;

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
                staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
