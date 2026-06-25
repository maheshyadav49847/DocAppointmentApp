using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Staff;
using CodeX.Domain.Enums;
using Microsoft.Extensions.Configuration;
using CodeX.Application.Common.Security;

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

            var targetRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == request.RoleName && (r.OrganizationId == Guid.Empty || r.OrganizationId == staff.OrganizationId), cancellationToken);

            staff.Email = email;
            staff.FirstName = request.FirstName.Trim();
            staff.LastName = request.LastName.Trim();
            staff.EmployeeId = request.EmployeeId.Trim();
            staff.RoleId = targetRole?.Id;
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
