using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SecureOps.Application.Services;

namespace SecureOps.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<IDeploymentService, DeploymentService>();
        services.AddScoped<ISecurityFindingService, SecurityFindingService>();
        services.AddScoped<IPipelineService, PipelineService>();
        services.AddScoped<IEnvironmentService, EnvironmentService>();
        services.AddScoped<IDashboardService, DashboardService>();

        return services;
    }
}
