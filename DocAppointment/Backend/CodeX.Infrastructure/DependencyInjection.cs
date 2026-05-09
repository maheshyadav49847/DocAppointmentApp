using CodeX.Application.Common.Authorization;
using CodeX.Application.Common.Interfaces;
using CodeX.Infrastructure.ExternalServices;
using CodeX.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CodeX.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(
                    configuration.GetConnectionString("DefaultConnection"),
                    b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName)));

            services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
            services.AddScoped<IIdentityService, CodeX.Infrastructure.Identity.IdentityService>();
            services.AddScoped<IEntityAuthorizationService, EntityAuthorizationService>();
            services.AddScoped<TwilioWhatsAppService>();
            services.AddHttpClient<BridgeWhatsAppService>();

            var whatsAppProvider = configuration["WhatsApp:Provider"] ?? "Twilio";
            if (whatsAppProvider == "Bridge")
            {
                services.AddScoped<IWhatsAppService>(provider => provider.GetRequiredService<BridgeWhatsAppService>());
            }
            else
            {
                services.AddScoped<IWhatsAppService>(provider => provider.GetRequiredService<TwilioWhatsAppService>());
            }

            services.AddScoped<ISmsService, TwilioSmsService>();
            services.AddScoped<IEmailService, ConsoleEmailService>();

            return services;
        }
    }
}
