using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Roles.Queries.GetRoles
{
    public record RoleDto(Guid Id, string Name, string? Description, bool IsSystemDefault, string[] Permissions);

    public record GetRolesQuery(Guid OrgId) : IRequest<List<RoleDto>>;

    public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, List<RoleDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetRolesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<RoleDto>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
        {
            var roles = await _context.Roles
                
                .Where(r => !r.IsDeleted && r.OrganizationId == request.OrgId)
                .Select(r => new RoleDto(
                    r.Id,
                    r.Name,
                    r.Description,
                    r.IsSystemDefault,
                    _context.RolePermissions.Where(rp => rp.RoleId == r.Id).Select(rp => rp.Permission).ToArray()
                ))
                .ToListAsync(cancellationToken);

            return roles;
        }
    }
}
