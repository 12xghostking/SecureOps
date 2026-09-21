using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using SecureOps.Api.Middleware;
using SecureOps.Application;
using SecureOps.Infrastructure;
using SecureOps.Infrastructure.Data;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Serilog structured logging
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "SecureOps.Api")
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] ({CorrelationId}) {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// 2. Add Services (Application & Infrastructure layers)
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 3. Configure Controllers & JSON serialization
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 4. Configure Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("database", HealthStatus.Unhealthy, new[] { "ready" });

// 5. Configure OpenTelemetry & Prometheus Metrics
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation();
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation()
            .AddPrometheusExporter();
    });

// 6. Configure Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SecureOps DevSecOps Reference Platform API",
        Version = "v1",
        Description = "Production-grade internal developer platform (IDP) and DevSecOps reference implementation."
    });
});

// 7. Configure CORS
var corsOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ??
    new[] { "http://localhost:5173", "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("X-Correlation-Id");
    });
});

var app = builder.Build();

// 8. Auto-migrate / Ensure Database & Seed Data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        if (context.Database.IsRelational())
        {
            logger.LogInformation("Ensuring database is created and up to date...");
            await context.Database.EnsureCreatedAsync();
        }
        await DbSeeder.SeedAsync(context, logger);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Could not initialize or seed primary database. Falling back to temporary in-memory/SQLite.");
    }
}

// 9. Pipeline Middleware
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || true) // Enable Swagger for portfolio demonstration
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SecureOps API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors("AllowFrontend");

// 10. Health check and Metrics endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false, // Simple liveness probe
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync("{\"status\":\"Healthy\",\"service\":\"SecureOps.Api\"}");
    }
});

app.MapHealthChecks("/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.UseOpenTelemetryPrometheusScrapingEndpoint("/metrics");

app.MapControllers();

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }
