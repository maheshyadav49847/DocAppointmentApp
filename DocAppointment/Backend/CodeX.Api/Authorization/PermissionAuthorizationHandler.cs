using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace CodeX.Api.Authorization
{
    public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PermissionAuthorizationHandler> _logger;

        public PermissionAuthorizationHandler(IServiceScopeFactory scopeFactory, ILogger<PermissionAuthorizationHandler> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value;
            var orgIdClaim = context.User.FindFirst("orgId")?.Value;

            var requiredPermissions = requirement.Permission.Split(',').Select(p => p.Trim()).ToList();

            _logger.LogInformation("Checking permissions. Required: {Required}. Role: {Role}, OrgId: {OrgId}", string.Join(", ", requiredPermissions), roleClaim, orgIdClaim);

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
                    rp => requiredPermissions.Contains(rp.Permission)
                );

                _logger.LogInformation("DB check for Role {Role} in Org {OrgId}: {HasPermission}", roleClaim, orgId, hasPermission);

                if (hasPermission)
                {
                    context.Succeed(requirement);
                    return;
                }
            }

            // Fallback to JWT permissions claim
            var permissionsClaim = context.User.FindFirst("permissions")?.Value;
            _logger.LogInformation("JWT permissions claim: {Claim}", permissionsClaim);
            if (!string.IsNullOrEmpty(permissionsClaim))
            {
                var userPermissions = permissionsClaim.Split(',');
                var intersect = userPermissions.Intersect(requiredPermissions).ToList();
                _logger.LogInformation("Intersecting permissions: {Intersect}", string.Join(", ", intersect));
                if (intersect.Any())
                {
                    context.Succeed(requirement);
                }
            }

        }
    }
}
