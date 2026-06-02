using CodeX.Application;
using CodeX.Api.Hubs;
using CodeX.Api.Services;
using CodeX.Application.Common.Interfaces;
using CodeX.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.Memory;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IQueueNotificationService, QueueNotificationService>();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var secretKey = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret is not configured.");
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
            ValidateIssuer = false, // Relaxed for deployment stability
            ValidateAudience = false, // Relaxed for deployment stability
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero
        };
    });
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
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Allow up to 15MB multipart uploads (covers 10MB limit with overhead)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 15 * 1024 * 1024; // 15MB
});

// Background Hosted Services
builder.Services.AddHostedService<CodeX.Api.BackgroundServices.FollowUpReminderService>();

var app = builder.Build();

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

app.MapControllers();
app.MapHub<QueueHub>("/queueHub");


app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
