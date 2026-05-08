using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using CodeX.Infrastructure.Persistence;
using CodeX.Application.Common.Interfaces;
using CodeX.Infrastructure.ExternalServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CodeX.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

            services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
            services.AddScoped<IIdentityService, CodeX.Infrastructure.Identity.IdentityService>();

            // ─── Messaging Providers ──────────────────────────────────────────
            var whatsAppProvider = configuration["WhatsApp:Provider"] ?? "Twilio";
            if (whatsAppProvider == "Bridge")
            {
                services.AddHttpClient<IWhatsAppService, BridgeWhatsAppService>();
            }
            else
            {
                services.AddScoped<IWhatsAppService, TwilioWhatsAppService>();
            }

            services.AddScoped<ISmsService, TwilioSmsService>();
            services.AddScoped<IEmailService, ConsoleEmailService>();

            return services;
        }
    }
}
