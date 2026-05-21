using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using CodeX.Application.Common.Exceptions;
using AppUnauthorizedException = CodeX.Application.Common.Exceptions.UnauthorizedAccessException;
using AppInvalidOperationException = CodeX.Application.Common.Exceptions.InvalidOperationException;

namespace CodeX.Api.Middleware
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception occurred. TraceId: {TraceId}", context.TraceIdentifier);
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var traceId = context.TraceIdentifier;
            var response = new ErrorResponse { TraceId = traceId };

            switch (exception)
            {
                case ValidationException ex:
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    response.StatusCode = 400;
                    response.Message = ex.Message;
                    response.ErrorCode = "VALIDATION_ERROR";
                    response.ValidationErrors = ex.Errors?.ToDictionary(k => k.Key, v => v.Value) ?? new();
                    break;

                case EntityNotFoundException ex:
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    response.StatusCode = 404;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case AppUnauthorizedException ex:
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    response.StatusCode = 401;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case ForbiddenAccessException ex:
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    response.StatusCode = 403;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case ConflictException ex:
                    context.Response.StatusCode = StatusCodes.Status409Conflict;
                    response.StatusCode = 409;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case BusinessRuleViolationException ex:
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    response.StatusCode = 400;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case AppInvalidOperationException ex:
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    response.StatusCode = 400;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                case ExternalServiceException ex:
                    context.Response.StatusCode = StatusCodes.Status502BadGateway;
                    response.StatusCode = 502;
                    response.Message = ex.Message;
                    response.ErrorCode = ex.ErrorCode;
                    response.Data = ex.ErrorData;
                    break;

                default:
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    response.StatusCode = 500;
                    response.Message = "An unexpected error occurred. Please try again later.";
                    response.ErrorCode = "INTERNAL_SERVER_ERROR";
                    break;
            }

            var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            return context.Response.WriteAsync(jsonResponse);
        }
    }
}
