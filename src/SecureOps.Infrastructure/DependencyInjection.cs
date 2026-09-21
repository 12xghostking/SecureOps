using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Infrastructure.Data;

namespace SecureOps.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var provider = configuration["DatabaseProvider"] ?? "PostgreSQL";
        var pgConnectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=secureops;Username=postgres;Password=postgres";

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            var logger = sp.GetRequiredService<ILogger<ApplicationDbContext>>();

            if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    logger.LogInformation("Configuring EF Core with PostgreSQL provider.");
                    options.UseNpgsql(pgConnectionString, npgsqlOptions =>
                    {
                        npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
                    });
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to configure PostgreSQL. Falling back to SQLite for local development.");
                    options.UseSqlite("Data Source=secureops.db");
                }
            }
            else if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                logger.LogInformation("Configuring EF Core with SQLite provider.");
                options.UseSqlite(configuration.GetConnectionString("SqliteConnection") ?? "Data Source=secureops.db");
            }
            else
            {
                logger.LogInformation("Configuring EF Core with InMemory provider.");
                options.UseInMemoryDatabase("SecureOpsDb");
            }
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        return services;
    }
}
