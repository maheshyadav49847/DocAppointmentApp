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
        public string AdminFullName { get; init; } = string.Empty;
        public string AdminEmail { get; init; } = string.Empty;
        public string AdminPassword { get; init; } = string.Empty;
        public string AdminPhoneNumber { get; init; } = string.Empty;
        public string AdminPhoneNumberDialCode { get; init; } = "+91";
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
            var dc = request.AdminPhoneNumberDialCode?.Replace("+", "") ?? "91";
            var normalizedPhone = CodeX.Application.Common.Helpers.NormalizationHelper.NormalizePhone(request.AdminPhoneNumber, dc);

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
                .IgnoreQueryFilters()
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
            string firstName;
            string lastName;

            if (!string.IsNullOrWhiteSpace(request.AdminFullName))
            {
                var nameParts = request.AdminFullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
                firstName = nameParts[0];
                lastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : string.Empty;
            }
            else
            {
                var emailUsername = normalizedEmail.Split('@')[0];
                var dotParts = emailUsername.Split('.', StringSplitOptions.RemoveEmptyEntries);
                if (dotParts.Length > 1)
                {
                    firstName = char.ToUpper(dotParts[0][0]) + dotParts[0].Substring(1);
                    lastName = char.ToUpper(dotParts[1][0]) + dotParts[1].Substring(1);
                }
                else
                {
                    firstName = char.ToUpper(emailUsername[0]) + emailUsername.Substring(1);
                    lastName = string.Empty;
                }
            }

            PasswordValidator.Validate(request.AdminPassword, _configuration);

            // Assign the newly cloned OrgAdmin role instead of the global one
            var orgAdminRole = clonedRoles.ContainsKey("OrgAdmin") ? clonedRoles["OrgAdmin"] : null;

            var admin = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = org.Id,
                Email = normalizedEmail,
                FirstName = firstName,
                LastName = lastName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                RoleId = orgAdminRole?.Id,
                PhoneNumber = normalizedPhone,
                PhoneNumberDialCode = request.AdminPhoneNumberDialCode ?? "+91"
            };

            _context.Staff.Add(admin);

            await _context.SaveChangesAsync(cancellationToken);

            return org.Id;
        }
    }
}
