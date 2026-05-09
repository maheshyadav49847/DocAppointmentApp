using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Staff;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;

namespace CodeX.Application.Features.Staff.Commands.CreateStaff
{
    public record CreateStaffCommand : IRequest<Guid>
    {
        public Guid? BranchId { get; init; }
        public Guid OrganizationId { get; init; }
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public string EmployeeId { get; init; } = string.Empty;
        public StaffRole Role { get; init; } = StaffRole.Receptionist;
        public string PhoneNumber { get; init; } = string.Empty;
    }

    public class CreateStaffCommandHandler : IRequestHandler<CreateStaffCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CreateStaffCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<Guid> Handle(CreateStaffCommand request, CancellationToken cancellationToken)
        {
            var organizationId = StaffAccessRules.ResolveOrganizationId(_currentUserService, request.OrganizationId);
            var branchId = StaffAccessRules.ResolveBranchId(_currentUserService, request.BranchId);

            StaffAccessRules.EnsureCanAssignRole(_currentUserService, request.Role);
            StaffAccessRules.EnsureRoleMatchesBranchScope(branchId, request.Role);

            if (branchId.HasValue)
            {
                var branchExists = await _context.Branches
                    .AnyAsync(b => b.Id == branchId.Value && b.OrganizationId == organizationId, cancellationToken);

                if (!branchExists)
                {
                    throw new Exception("Selected branch does not belong to your organization.");
                }
            }

            var email = request.Email.Trim().ToLower();
            var emailExists = await _context.Staffs
                .AnyAsync(s => s.Email.ToLower() == email && !s.IsDeleted, cancellationToken);

            if (emailExists)
                throw new Exception($"The email '{email}' is already registered in the system.");

            var staff = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = organizationId,
                BranchId = branchId,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                EmployeeId = request.EmployeeId.Trim(),
                Role = request.Role,
                PhoneNumber = request.PhoneNumber.Trim()
            };

            _context.Staffs.Add(staff);
            await _context.SaveChangesAsync(cancellationToken);

            return staff.Id;
        }
    }
}
