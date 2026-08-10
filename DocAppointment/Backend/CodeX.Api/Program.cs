using CodeX.Application;
using CodeX.Api.Hubs;
using CodeX.Api.Services;
using CodeX.Application.Common.Interfaces;
using CodeX.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.Memory;
using System.Text;

using Asp.Versioning;
using CodeX.Application.Common.Settings;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/codex-api-log-.txt", rollingInterval: RollingInterval.Day, shared: true));

// Startup Validation (Fail Fast)
var jwtSettingsConfig = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>();
if (string.IsNullOrEmpty(jwtSettingsConfig?.Secret) || jwtSettingsConfig.Secret.Length < 32)
{
    throw new InvalidOperationException("CRITICAL: JWT Secret is not configured or is less than 32 characters.");
}
var allowedOriginsStr = builder.Configuration["AllowedOrigins"];
if (builder.Environment.IsProduction() && (string.IsNullOrEmpty(allowedOriginsStr) || allowedOriginsStr.Contains("*")))
{
    throw new InvalidOperationException("CRITICAL: Wildcard CORS origins (*) are not allowed in Production.");
}

// Bind Configuration
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<RazorpaySettings>(builder.Configuration.GetSection("RazorpaySettings"));
builder.Services.Configure<CodeX.Application.Common.Settings.FileUploadSettings>(builder.Configuration.GetSection("FileUploadSettings"));

// Add services to the container.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IQueueNotificationService, QueueNotificationService>();
builder.Services.AddHostedService<CodeX.Api.BackgroundServices.ChatSessionPersistenceService>();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() 
            ?? throw new InvalidOperationException("JwtSettings is not configured.");
        var secretKey = jwtSettings.Secret;
        if (string.IsNullOrEmpty(secretKey) || secretKey.Length < 32)
            throw new InvalidOperationException("JWT Secret is not configured or is too short.");
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && 
                    (path.StartsWithSegments("/queueHub")))
                {
                    context.Token = accessToken;
                }
                else if (context.Request.Cookies.ContainsKey("jwt_token"))
                {
                    context.Token = context.Request.Cookies["jwt_token"];
                }
                return Task.CompletedTask;
            }
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationPolicyProvider, CodeX.Api.Authorization.PermissionPolicyProvider>();
builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, CodeX.Api.Authorization.PermissionAuthorizationHandler>();
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    var origins = builder.Configuration["AllowedOrigins"] ?? "";
    var allowedOrigins = origins.Split(',', StringSplitOptions.RemoveEmptyEntries)
                               .Select(o => o.Trim())
                               .ToArray();
    
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin => 
              {
                  if (string.IsNullOrEmpty(origin)) return false;
                  // Allow any origin that is in our list
                  return allowedOrigins.Any(o => origin.Equals(o, StringComparison.OrdinalIgnoreCase));
              })
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddHttpClient();
builder.Services.AddControllers(options =>
{
    options.Filters.Add<CodeX.Api.Filters.AuditLogActionFilter>();
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHealthChecks();

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.AddPolicy("GlobalLimit", context =>
    {
        var settings = builder.Configuration.GetSection("RateLimitingSettings").Get<CodeX.Application.Common.Settings.RateLimitingSettings>();
        return System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString(),
            factory: partition => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = settings?.PermitLimit ?? 100,
                QueueLimit = settings?.QueueLimit ?? 2,
                Window = TimeSpan.FromSeconds(settings?.WindowSeconds ?? 60)
            });
    });
});

// Allow up to 15MB multipart uploads (covers 10MB limit with overhead)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 50 * 1024 * 1024; // 50MB
});

// Background Hosted Services
builder.Services.AddHostedService<CodeX.Api.BackgroundServices.FollowUpReminderService>();

// SignalR Service
builder.Services.AddScoped<CodeX.Application.Common.Interfaces.ISignalRNotificationService, CodeX.Api.Services.SignalRNotificationService>();

var app = builder.Build();

// Seed Database Roles and Users
try
{
    await CodeX.Infrastructure.Persistence.ApplicationDbContextInitializer.SeedAsync(app.Services);
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occurred seeding the DB.");
}

app.UseMiddleware<CodeX.Api.Middlewares.ExceptionHandlingMiddleware>();

app.UseCors("DefaultPolicy");
app.UseSwagger();
app.UseSwaggerUI();

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    var origins = builder.Configuration["AllowedOrigins"] ?? "";
    var csp = $"default-src 'self'; frame-ancestors 'none'; connect-src 'self' {origins.Replace(",", " ")};";
    context.Response.Headers.Append("Content-Security-Policy", csp);
    
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    var hstsMaxAge = builder.Configuration.GetValue<int>("HstsSettings:MaxAgeDays", 365) * 86400;
    var includeSubdomains = builder.Configuration.GetValue<bool>("HstsSettings:IncludeSubDomains", true) ? "; includeSubDomains" : "";
    context.Response.Headers.Append("Strict-Transport-Security", $"max-age={hstsMaxAge}{includeSubdomains}");

    // Simple Rate Limiting for Login & Registration
    if (context.Request.Path.StartsWithSegments("/api/auth") || 
        context.Request.Path.StartsWithSegments("/api/organizations/register"))
    {
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var cache = context.RequestServices.GetRequiredService<IMemoryCache>();
        var cacheKey = $"rl_{ip}";

        if (cache.TryGetValue(cacheKey, out int count) && count >= 10)
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsJsonAsync(new { message = "Too many attempts. Please try again in a minute." });
            return;
        }

        cache.Set(cacheKey, count + 1, TimeSpan.FromMinutes(1));
    }

    await next();
});

// app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.UseMiddleware<CodeX.Api.Middlewares.SubscriptionEnforcementMiddleware>();

app.MapHealthChecks("/health");

app.MapControllers().RequireRateLimiting("GlobalLimit");
app.MapHub<QueueHub>("/queueHub");
app.MapHub<CodeX.Api.Hubs.AppHub>("/appHub");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
