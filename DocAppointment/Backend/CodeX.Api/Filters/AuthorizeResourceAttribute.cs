using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Common;
using CodeX.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;

namespace CodeX.Api.Filters
{
    /// <summary>
    /// Validates that the requested resource belongs to the current user's Organization.
    /// Assumes the route contains an 'id' parameter that corresponds to the entity's primary key.
    /// </summary>
    public class AuthorizeResourceAttribute : TypeFilterAttribute
    {
        public AuthorizeResourceAttribute(Type entityType, string routeKey = "id") 
            : base(typeof(AuthorizeResourceFilter))
        {
            Arguments = new object[] { entityType, routeKey };
        }
    }

    public class AuthorizeResourceFilter : IAsyncActionFilter
    {
        private readonly Type _entityType;
        private readonly string _routeKey;

        public AuthorizeResourceFilter(Type entityType, string routeKey)
        {
            _entityType = entityType;
            _routeKey = routeKey;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // If route parameter is not present, we can't authorize the specific resource. Let it pass or fail naturally.
            if (!context.RouteData.Values.TryGetValue(_routeKey, out var idValue) || idValue == null)
            {
                await next();
                return;
            }

            if (!Guid.TryParse(idValue.ToString(), out var resourceId))
            {
                context.Result = new BadRequestObjectResult(new { Message = "Invalid resource ID format." });
                return;
            }

            var dbContext = context.HttpContext.RequestServices.GetRequiredService<ApplicationDbContext>();
            var currentUserService = context.HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();

            // Only validate if the entity implements IMustHaveTenant
            if (typeof(IMustHaveTenant).IsAssignableFrom(_entityType))
            {
                var entity = await dbContext.FindAsync(_entityType, resourceId);

                if (entity == null)
                {
                    // If it doesn't exist or doesn't belong to the Org (due to Global Query Filters), return 404.
                    context.Result = new NotFoundResult();
                    return;
                }

                // Explicit check in case Global Query Filters were bypassed
                var tenantEntity = (IMustHaveTenant)entity;
                if (tenantEntity.OrganizationId != currentUserService.OrgId)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }

            await next();
        }
    }
}
