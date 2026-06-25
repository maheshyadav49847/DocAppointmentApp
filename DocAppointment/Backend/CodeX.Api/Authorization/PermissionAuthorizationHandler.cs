using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CodeX.Api.Authorization
{
    public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public PermissionAuthorizationHandler(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value;
            var orgIdClaim = context.User.FindFirst("orgId")?.Value;

            // If we have role and orgId, we check the DB directly to reflect permission changes instantly
            if (!string.IsNullOrEmpty(roleClaim) && Guid.TryParse(orgIdClaim, out var orgId))
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<CodeX.Application.Common.Interfaces.IApplicationDbContext>();
                
                var hasPermission = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.AnyAsync(
                    System.Linq.Queryable.SelectMany(
                        System.Linq.Queryable.Where(dbContext.Roles, r => r.Name == roleClaim && r.OrganizationId == orgId),
                        r => r.RolePermissions
                    ),
                    rp => rp.Permission == requirement.Permission
                );

                if (hasPermission)
                {
                    context.Succeed(requirement);
                    return;
                }
            }

            // Fallback to JWT permissions claim
            var permissionsClaim = context.User.FindFirst("permissions")?.Value;
            if (!string.IsNullOrEmpty(permissionsClaim))
            {
                var userPermissions = permissionsClaim.Split(',');
                if (userPermissions.Contains(requirement.Permission))
                {
                    context.Succeed(requirement);
                }
            }
        }
    }
}
