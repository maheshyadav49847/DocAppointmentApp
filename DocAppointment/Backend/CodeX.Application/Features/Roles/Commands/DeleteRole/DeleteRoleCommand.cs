using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Roles.Commands.DeleteRole
{
    public record DeleteRoleCommand(Guid RoleId, Guid OrgId) : IRequest;

    public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand>
    {
        private readonly IApplicationDbContext _context;

        public DeleteRoleCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
        {
            var role = await _context.Roles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == request.RoleId, cancellationToken);

            if (role == null)
                throw new Exception("Role not found");

            if (role.IsSystemDefault)
                throw new Exception("System default roles cannot be deleted");

            if (role.OrganizationId != Guid.Empty && role.OrganizationId != request.OrgId)
                throw new Exception("You are not authorized to delete this role");

            // Verify no staff are using this role
            var staffUsingRole = await _context.Staffs.AnyAsync(s => s.RoleId == request.RoleId, cancellationToken);
            if (staffUsingRole)
                throw new Exception("Cannot delete role because it is currently assigned to one or more staff members");

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
