using CodeX.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace CodeX.Api.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IApplicationDbContext dbContext)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception has occurred while executing the request.");
                
                // CRITICAL: Clear the ChangeTracker to prevent any partial state from being saved by upstream filters/middlewares
                if (dbContext is DbContext efContext)
                {
                    efContext.ChangeTracker.Clear();
                }

                await HandleExceptionAsync(context, ex);
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/problem+json";

            // Determine if it's a known domain/validation error or a system error
            var statusCode = exception switch
            {
                UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
                ArgumentException or InvalidOperationException or CodeX.Application.Common.Exceptions.ValidationException => StatusCodes.Status400BadRequest,
                _ => StatusCodes.Status500InternalServerError // Keep generic exceptions as 500
            };

            // Treat generic exceptions (which we often use for business logic errors in commands like throw new Exception("...")) as 400s if they don't have an inner exception, 
            // but for safety, let's keep them as 400 if they're explicitly thrown Application exceptions. Actually, many commands just throw `Exception("msg")`.
            // Let's make base Exception 400 if it's a known format, otherwise 500. For now, let's just map all exceptions to 400 if it's not a system error? No, let's just make ValidationException 400.
            if (exception.GetType() == typeof(Exception))
            {
                statusCode = StatusCodes.Status400BadRequest;
            }

            context.Response.StatusCode = statusCode;

            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = statusCode == StatusCodes.Status500InternalServerError ? "An unexpected error occurred." : "A validation error occurred.",
                Detail = exception.InnerException?.Message ?? exception.Message,
                Type = "https://tools.ietf.org/html/rfc7231#section-6.6.1"
            };

            if (exception is CodeX.Application.Common.Exceptions.ValidationException validationException)
            {
                problemDetails.Extensions["errors"] = validationException.Errors;
                Console.WriteLine($"[VALIDATION ERROR] {JsonSerializer.Serialize(validationException.Errors)}");
            }

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var json = JsonSerializer.Serialize(problemDetails, options);

            await context.Response.WriteAsync(json);
        }
    }
}
