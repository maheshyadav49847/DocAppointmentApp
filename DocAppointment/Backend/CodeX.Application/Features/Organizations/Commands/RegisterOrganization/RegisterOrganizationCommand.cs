using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using BCrypt.Net;

namespace CodeX.Application.Features.Organizations.Commands.RegisterOrganization
{
    public record RegisterOrganizationCommand : IRequest<Guid>
    {
        public string OrgName { get; init; } = string.Empty;
        public string OrgSlug { get; init; } = string.Empty;
        public string AdminEmail { get; init; } = string.Empty;
        public string AdminPassword { get; init; } = string.Empty;
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
            // 1. Create Organization
            var org = new Organization
            {
                Name = request.OrgName,
                Slug = request.OrgSlug
            };

            _context.Organizations.Add(org);

            // 2. Create OrgAdmin Staff
            var admin = new CodeX.Domain.Entities.Staff
            {
                OrganizationId = org.Id,
                Email = request.AdminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.AdminPassword),
                Role = StaffRole.OrgAdmin
            };

            _context.Staff.Add(admin);

            await _context.SaveChangesAsync(cancellationToken);

            return org.Id;
        }
    }
}
