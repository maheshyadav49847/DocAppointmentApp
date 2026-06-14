using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CodeX.Api.Middlewares
{
    public class SubscriptionEnforcementMiddleware
    {
        private readonly RequestDelegate _next;

        public SubscriptionEnforcementMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUserService, IApplicationDbContext dbContext)
        {
            var path = context.Request.Path.Value?.ToLower();
            
            // Skip paths that don't need active subscriptions
            if (path != null && (
                path.StartsWith("/api/auth") || 
                path.StartsWith("/api/payments") || 
                path.StartsWith("/swagger") ||
                path.StartsWith("/api/whatsappbridge") // webhooks
                ))
            {
                await _next(context);
                return;
            }

            var orgIdStr = context.User.FindFirst("OrganizationId")?.Value;
            if (string.IsNullOrEmpty(orgIdStr))
            {
                await _next(context);
                return;
            }

            var isGuid = Guid.TryParse(orgIdStr, out var orgId);
            if (isGuid)
            {
                var subscription = await dbContext.OrganizationSubscriptions
                    .Where(s => s.OrganizationId == orgId && s.Status == "Active")
                    .FirstOrDefaultAsync();

                if (subscription == null)
                {
                    context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
                    await context.Response.WriteAsJsonAsync(new { Message = "Active subscription required." });
                    return;
                }
            }

            await _next(context);
        }
    }
}
