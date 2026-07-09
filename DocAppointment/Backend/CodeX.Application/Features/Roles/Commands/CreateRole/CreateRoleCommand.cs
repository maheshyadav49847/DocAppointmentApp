using MediatR;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Roles.Commands.CreateRole
{
    public record CreateRoleCommand(Guid OrgId, string Name, string? Description, string[] Permissions) : IRequest<Guid>;

    public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, Guid>
    {
        private readonly IApplicationDbContext _context;

        public CreateRoleCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
        {
            var role = new Role
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description,
                IsSystemDefault = false,
                OrganizationId = request.OrgId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Roles.Add(role);

            if (request.Permissions != null && request.Permissions.Any())
            {
                foreach (var permission in request.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        Permission = permission
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return role.Id;
        }
    }
}
