using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;
using SecureOps.Infrastructure.Data;
using Xunit;

namespace SecureOps.UnitTests.Services;

public class DeploymentServiceTests
{
    private static ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_WithoutCriticalVulnerabilities_ShouldSucceed()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DeploymentService(context);

        var app = new ApplicationEntity { Name = "order-api", Language = "C#" };
        var env = new EnvironmentEntity { Name = "Production", IsProduction = true };
        context.Applications.Add(app);
        context.Environments.Add(env);
        await context.SaveChangesAsync();

        var request = new CreateDeploymentRequest
        {
            ApplicationId = app.Id,
            EnvironmentId = env.Id,
            Version = "v1.2.0",
            CommitSha = "7a9b3c4",
            TriggeredBy = "DevOps CI/CD"
        };

        // Act
        var result = await service.CreateAsync(request);

        // Assert
        result.Status.Should().Be(DeploymentStatus.Succeeded);
        result.HealthCheckPassed.Should().BeTrue();
        result.Version.Should().Be("v1.2.0");
    }

    [Fact]
    public async Task CreateAsync_WithOpenCriticalVulnerabilityInProduction_ShouldBlockDeployment()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DeploymentService(context);

        var app = new ApplicationEntity { Name = "payment-gateway", Language = "C#" };
        var envProd = new EnvironmentEntity { Name = "Production", IsProduction = true };
        var criticalFinding = new SecurityFindingEntity
        {
            ApplicationId = app.Id,
            Title = "RCE in container runtime",
            Severity = SeverityLevel.Critical,
            Status = FindingStatus.Open,
            Tool = "Trivy",
            RuleId = "CVE-2024-21626"
        };

        context.Applications.Add(app);
        context.Environments.Add(envProd);
        context.SecurityFindings.Add(criticalFinding);
        await context.SaveChangesAsync();

        var request = new CreateDeploymentRequest
        {
            ApplicationId = app.Id,
            EnvironmentId = envProd.Id,
            Version = "v2.0.0",
            CommitSha = "9c2a1b5",
            TriggeredBy = "Automated Gate"
        };

        // Act
        var result = await service.CreateAsync(request);

        // Assert - The Security Gate MUST fail the deployment
        result.Status.Should().Be(DeploymentStatus.Failed);
        result.HealthCheckPassed.Should().BeFalse();
        result.StatusMessage.Should().Contain("Security Gate");
    }

    [Fact]
    public async Task CreateAsync_WithOpenCriticalVulnerabilityInDevelopment_ShouldAllowNonProd()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DeploymentService(context);

        var app = new ApplicationEntity { Name = "payment-gateway", Language = "C#" };
        var envDev = new EnvironmentEntity { Name = "Development", IsProduction = false };
        var criticalFinding = new SecurityFindingEntity
        {
            ApplicationId = app.Id,
            Title = "SQL Injection in dev branch",
            Severity = SeverityLevel.Critical,
            Status = FindingStatus.Open,
            Tool = "Semgrep"
        };

        context.Applications.Add(app);
        context.Environments.Add(envDev);
        context.SecurityFindings.Add(criticalFinding);
        await context.SaveChangesAsync();

        var request = new CreateDeploymentRequest
        {
            ApplicationId = app.Id,
            EnvironmentId = envDev.Id,
            Version = "v2.0.0-beta.1",
            CommitSha = "9c2a1b5",
            TriggeredBy = "Dev Tester"
        };

        // Act
        var result = await service.CreateAsync(request);

        // Assert - Non-prod allowed for developer testing and triage
        result.Status.Should().Be(DeploymentStatus.Succeeded);
        result.HealthCheckPassed.Should().BeTrue();
    }

    [Fact]
    public async Task RollbackAsync_ShouldCreateRollbackRecordWithPreviousTarget()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DeploymentService(context);

        var app = new ApplicationEntity { Name = "analytics-worker", Language = "Python" };
        var env = new EnvironmentEntity { Name = "Production", IsProduction = true };
        var initialDeployment = new DeploymentEntity
        {
            ApplicationId = app.Id,
            EnvironmentId = env.Id,
            Version = "v1.4.0",
            CommitSha = "1a2b3c4",
            Status = DeploymentStatus.Succeeded
        };

        context.Applications.Add(app);
        context.Environments.Add(env);
        context.Deployments.Add(initialDeployment);
        await context.SaveChangesAsync();

        var rollbackRequest = new RollbackDeploymentRequest
        {
            DeploymentId = initialDeployment.Id,
            TargetVersion = "v1.3.9",
            PerformedBy = "OnCall Engineer"
        };

        // Act
        var result = await service.RollbackAsync(rollbackRequest);

        // Assert
        result.Status.Should().Be(DeploymentStatus.RolledBack);
        result.Version.Should().Be("v1.3.9");
        result.RollbackTargetVersion.Should().Be("v1.4.0");
        result.TriggeredBy.Should().Be("OnCall Engineer");
    }
}
