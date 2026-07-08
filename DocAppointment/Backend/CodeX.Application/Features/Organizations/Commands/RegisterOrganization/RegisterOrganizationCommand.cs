using CodeX.Application.Common.Interfaces;
using CodeX.Application.Common.Security;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CodeX.Application.Features.Organizations.Commands.RegisterOrganization
{
    public record RegisterOrganizationCommand : IRequest<Guid>
    {
        public string OrgName { get; init; } = string.Empty;
        public string OrgSlug { get; init; } = string.Empty;
        public string AdminEmail { get; init; } = string.Empty;
        public string AdminPassword { get; init; } = string.Empty;
        public string AdminPhoneNumber { get; init; } = string.Empty;
    }

    public class RegisterOrganizationCommandHandler : IRequestHandler<RegisterOrganizationCommand, Guid>
    {
        private readonly IApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public RegisterOrganizationCommandHandler(IApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<Guid> Handle(RegisterOrganizationCommand request, CancellationToken cancellationToken)
        {
            var normalizedEmail = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizeEmail(request.AdminEmail);
            var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.AdminPhoneNumber);

            // 0. Uniqueness Checks
            var emailExists = await _context.Staff.AnyAsync(s => s.Email == normalizedEmail, cancellationToken);
            if (emailExists) throw new Exception("Admin email is already registered.");

            var slugExists = await _context.Organizations.AnyAsync(o => o.Slug == request.OrgSlug, cancellationToken);
            if (slugExists) throw new Exception("Organization slug is already in use.");
            // 1. Create Organization
            var org = new Organization
            {
                Name = request.OrgName,
                Slug = request.OrgSlug
            };

            _context.Organizations.Add(org);

            // Clone system roles for the new organization
            var systemRoles = await _context.Roles
                .Include(r => r.RolePermissions)
                .Where(r => r.OrganizationId == Guid.Empty && r.Name != "SuperAdmin")
                .ToListAsync(cancellationToken);

            var clonedRoles = new Dictionary<string, Role>();

            foreach (var sysRole in systemRoles)
            {
                var clonedRole = new Role
                {
                    Name = sysRole.Name,
                    Description = sysRole.Description,
                    IsSystemDefault = true,
                    OrganizationId = org.Id,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                foreach (var perm in sysRole.RolePermissions)
                {
                    clonedRole.RolePermissions.Add(new RolePermission
                    {
                        Permission = perm.Permission
                    });
                }

                _context.Roles.Add(clonedRole);
                clonedRoles[clonedRole.Name] = clonedRole;
            }

            // 2. Create OrgAdmin Staff
            var emailParts = normalizedEmail.Split('@')[0].Split('.');
            var firstName = emailParts.Length > 0 ? char.ToUpper(emailParts[0][0]) + emailParts[0].Substring(1) : "Admin";
            var lastName = emailParts.Length > 1 ? char.ToUpper(emailParts[1][0]) + emailParts[1].Substring(1) : "User";

            PasswordValidator.Validate(request.AdminPassword, _configuration);

            // Assign the newly cloned OrgAdmin role instead of the global one
            var orgAdminRole = clonedRoles.ContainsKey("OrgAdmin") ? clonedRoles["OrgAdmin"] : null;

            // 3. Create Doctor Profile for the Admin (Solo Doctor Workflow)
            var doctor = new CodeX.Domain.Entities.Doctor
            {
                OrganizationId = org.Id,
                Name = $"Dr. {firstName} {lastName}",
                Specialization = "General Practitioner",
                ConsultationFee = 500,
                IsActive = true
            };

            _context.Doctors.Add(doctor);

            var admin = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = org.Id,
                Email = normalizedEmail,
                FirstName = firstName,
                LastName = lastName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                RoleId = orgAdminRole?.Id,
                PhoneNumber = normalizedPhone,
                Doctor = doctor // Link the staff to the newly created doctor profile
            };

            _context.Staff.Add(admin);

            await _context.SaveChangesAsync(cancellationToken);

            return org.Id;
        }
    }
}
