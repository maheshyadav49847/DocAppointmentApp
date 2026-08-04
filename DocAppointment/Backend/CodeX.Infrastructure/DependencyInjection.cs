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
            services.AddHttpClient<MetaCloudWhatsAppService>();

            services.AddSingleton<IWhatsAppService, WhatsAppServiceResolver>();

            services.AddScoped<ISmsService, TwilioSmsService>();
            services.AddScoped<IEmailService, ConsoleEmailService>();
            services.AddScoped<IPaymentService, CodeX.Infrastructure.Services.RazorpayPaymentService>();
            services.AddScoped<IFileUploadService, CodeX.Infrastructure.Services.FileUploadService>();
            services.AddSingleton<IChatSessionCache, CodeX.Infrastructure.Services.ChatSessionCache>();

            return services;
        }
    }
}
