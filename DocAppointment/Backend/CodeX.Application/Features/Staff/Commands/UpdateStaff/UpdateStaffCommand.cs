using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CodeX.Application.Features.Staff.Commands.UpdateStaff
{
    public record UpdateStaffCommand : IRequest<Unit>
    {
        public Guid Id { get; init; }
        public string Email { get; init; } = string.Empty;
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public string EmployeeId { get; init; } = string.Empty;
        public string RoleName { get; init; } = "Receptionist";
        public string? NewPassword { get; init; } // Optional — only update if provided
        public string PhoneNumberDialCode { get; init; } = "+91";
        public string PhoneNumber { get; init; } = string.Empty;
    }

    public class UpdateStaffCommandHandler : IRequestHandler<UpdateStaffCommand, Unit>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IConfiguration _configuration;

        public UpdateStaffCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService, IConfiguration configuration)
        {
            _context = context;
            _currentUserService = currentUserService;
            _configuration = configuration;
        }

        public async Task<Unit> Handle(UpdateStaffCommand request, CancellationToken cancellationToken)
        {
            var staff = await _context.Staffs
                .FirstOrDefaultAsync(s => s.Id == request.Id, cancellationToken)
                ?? throw new Exception("Staff member not found.");

            StaffAccessRules.EnsureCanManageTarget(_currentUserService, staff);
            StaffAccessRules.EnsureCanAssignRole(_currentUserService, request.RoleName);
            StaffAccessRules.EnsureRoleMatchesBranchScope(staff.BranchId, request.RoleName);

            var email = request.Email.Trim().ToLower();
            var emailTaken = await _context.Staffs
                .AnyAsync(s => s.Email.ToLower() == email && s.Id != request.Id && !s.IsDeleted, cancellationToken);

            if (emailTaken)
                throw new Exception($"The email '{email}' is already taken by another user in the system.");

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                var phone = request.PhoneNumber.Trim();
                var phoneTaken = await _context.Staffs
                    .AnyAsync(s => s.PhoneNumber == phone && s.Id != request.Id && s.OrganizationId == staff.OrganizationId && !s.IsDeleted, cancellationToken);

                if (phoneTaken)
                    throw new Exception($"The phone number '{phone}' is already registered for another staff member in this organization.");
            }

            if (!string.IsNullOrWhiteSpace(request.EmployeeId))
            {
                var empId = request.EmployeeId.Trim();
                var empIdTaken = await _context.Staffs
                    .AnyAsync(s => s.EmployeeId == empId && s.Id != request.Id && s.OrganizationId == staff.OrganizationId && !s.IsDeleted, cancellationToken);

                if (empIdTaken)
                    throw new Exception($"The Employee ID '{empId}' is already assigned to another staff member in this organization.");
            }

            var targetRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName && (r.OrganizationId == Guid.Empty || r.OrganizationId == staff.OrganizationId), cancellationToken);

            staff.Email = email;
            staff.FirstName = request.FirstName.Trim();
            staff.LastName = request.LastName.Trim();
            staff.EmployeeId = request.EmployeeId.Trim();
            staff.RoleId = targetRole?.Id;
            staff.PhoneNumberDialCode = request.PhoneNumberDialCode ?? "+91";
            staff.PhoneNumber = request.PhoneNumber.Trim();

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                PasswordValidator.Validate(request.NewPassword, _configuration);
                staff.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
