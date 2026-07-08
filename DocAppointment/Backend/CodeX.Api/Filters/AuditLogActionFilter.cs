using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CodeX.Api.Filters
{
    public class AuditLogActionFilter : IAsyncActionFilter
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly ICurrentUserService _currentUserService;

        public AuditLogActionFilter(IApplicationDbContext dbContext, ICurrentUserService currentUserService)
        {
            _dbContext = dbContext;
            _currentUserService = currentUserService;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var request = context.HttpContext.Request;

            // Only log mutating actions (POST, PUT, DELETE, PATCH)
            if (request.Method == "GET" || request.Method == "OPTIONS" || request.Method == "HEAD")
            {
                await next();
                return;
            }

            var executedContext = await next();

            var auditLog = new AuditLog
            {
                UserId = _currentUserService.UserId,
                OrganizationId = _currentUserService.OrgId == Guid.Empty ? (Guid?)null : _currentUserService.OrgId,
                Action = context.ActionDescriptor.DisplayName ?? "Unknown",
                Path = request.Path,
                Method = request.Method,
                IpAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown",
                StatusCode = executedContext.HttpContext.Response.StatusCode
            };

            // Optionally, we could log the Request body here, but we'd need to enable buffering early in the pipeline
            // var body = await new StreamReader(request.Body).ReadToEndAsync();
            // auditLog.RequestPayload = body;

            // If the action threw an exception, clear the change tracker to avoid saving partial entity states (like the Organization added before the exception)
            if (executedContext.Exception != null && !executedContext.ExceptionHandled)
            {
                ((Microsoft.EntityFrameworkCore.DbContext)_dbContext).ChangeTracker.Clear();
            }

            _dbContext.AuditLogs.Add(auditLog);
            await _dbContext.SaveChangesAsync(default);
        }
    }
}
