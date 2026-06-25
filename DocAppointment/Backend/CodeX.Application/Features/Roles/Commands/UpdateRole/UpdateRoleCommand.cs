using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;

namespace CodeX.Application.Features.Roles.Commands.UpdateRole
{
    public record UpdateRoleCommand(Guid RoleId, Guid OrgId, string[] Permissions) : IRequest;

    public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotificationService _notificationService;

        public UpdateRoleCommandHandler(IApplicationDbContext context, ISignalRNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task Handle(UpdateRoleCommand request, CancellationToken cancellationToken)
        {
            var role = await _context.Roles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == request.RoleId, cancellationToken);

            if (role == null)
                throw new Exception("Role not found");

            // Prevent modifying global system roles
            if (role.OrganizationId == Guid.Empty)
                throw new Exception("You cannot modify global system roles directly.");

            // Prevent modifying other orgs' custom roles
            if (role.OrganizationId != request.OrgId)
                throw new Exception("You are not authorized to modify this role");

            // Prevent OrgAdmin self-lockout
            if (role.Name == "OrgAdmin" && request.Permissions != null && !request.Permissions.Contains(CodeX.Domain.Constants.SystemPermissions.Settings.ManageRoles))
                throw new Exception("OrgAdmin role must retain Manage Roles permission to prevent system lockout.");


            // Remove existing permissions
            var existingPerms = await _context.RolePermissions.Where(rp => rp.RoleId == request.RoleId).ToListAsync(cancellationToken);
            _context.RolePermissions.RemoveRange(existingPerms);

            // Add new permissions
            if (request.Permissions != null)
            {
                foreach (var perm in request.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleId = role.Id,
                        Permission = perm
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _notificationService.SendRolePermissionsUpdatedAsync(request.OrgId, role.Name, cancellationToken);
        }
    }
}
