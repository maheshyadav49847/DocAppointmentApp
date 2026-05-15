using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

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

        public RegisterOrganizationCommandHandler(IApplicationDbContext context)
        {
            _context = context;
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

            // 2. Create OrgAdmin Staff
            var emailParts = normalizedEmail.Split('@')[0].Split('.');
            var firstName = emailParts.Length > 0 ? char.ToUpper(emailParts[0][0]) + emailParts[0].Substring(1) : "Admin";
            var lastName = emailParts.Length > 1 ? char.ToUpper(emailParts[1][0]) + emailParts[1].Substring(1) : "User";

            CodeX.Application.Common.Helpers.PasswordPolicyHelper.EnsurePasswordStrength(request.AdminPassword);

            var admin = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = org.Id,
                Email = normalizedEmail,
                FirstName = firstName,
                LastName = lastName,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                Role = StaffRole.OrgAdmin,
                PhoneNumber = normalizedPhone
            };

            _context.Staff.Add(admin);

            await _context.SaveChangesAsync(cancellationToken);

            return org.Id;
        }
    }
}
