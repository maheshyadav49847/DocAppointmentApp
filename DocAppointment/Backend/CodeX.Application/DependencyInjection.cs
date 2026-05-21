using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using FluentValidation;
using MediatR;

namespace CodeX.Application
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddApplication(this IServiceCollection services)
        {
            var assembly = Assembly.GetExecutingAssembly();

            services.AddMediatR(cfg => {
                cfg.RegisterServicesFromAssembly(assembly);
                // Add sanitization behavior BEFORE validation
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CodeX.Application.Common.Behaviors.SanitizationBehavior<,>));
                cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(CodeX.Application.Common.Behaviors.ValidationBehavior<,>));
            });
            services.AddAutoMapper(cfg => { }, assembly);
            services.AddValidatorsFromAssembly(assembly);

            return services;
        }
    }
}
