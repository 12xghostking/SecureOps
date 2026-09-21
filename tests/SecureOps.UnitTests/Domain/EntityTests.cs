using FluentAssertions;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;
using Xunit;

namespace SecureOps.UnitTests.Domain;

public class EntityTests
{
    [Fact]
    public void ApplicationEntity_ShouldInitializeWithDefaultValues()
    {
        // Act
        var app = new ApplicationEntity();

        // Assert
        app.Id.Should().NotBeEmpty();
        app.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(2));
        app.IsActive.Should().BeTrue();
        app.Tier.Should().Be(ApplicationTier.Tier2_BusinessCore);
        app.Deployments.Should().NotBeNull();
        app.PipelineRuns.Should().NotBeNull();
        app.SecurityFindings.Should().NotBeNull();
    }

    [Fact]
    public void DeploymentEntity_ShouldInitializeWithPendingStatus()
    {
        // Act
        var deployment = new DeploymentEntity();

        // Assert
        deployment.Id.Should().NotBeEmpty();
        deployment.StartedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(2));
        deployment.Status.Should().Be(DeploymentStatus.Pending);
        deployment.HealthCheckPassed.Should().BeTrue();
    }

    [Fact]
    public void SecurityFindingEntity_ShouldDefaultToOpenStatus()
    {
        // Act
        var finding = new SecurityFindingEntity();

        // Assert
        finding.Id.Should().NotBeEmpty();
        finding.Status.Should().Be(FindingStatus.Open);
        finding.Severity.Should().Be(SeverityLevel.Medium);
        finding.ScanType.Should().Be(ScanType.SAST);
        finding.FirstDetected.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(2));
        finding.ResolvedAt.Should().BeNull();
    }

    [Fact]
    public void EnvironmentEntity_ShouldSetDefaultsCorrectly()
    {
        // Act
        var env = new EnvironmentEntity
        {
            Name = "Production",
            Type = EnvironmentType.Production,
            IsProduction = true,
            ClusterName = "aks-prod-cluster"
        };

        // Assert
        env.Id.Should().NotBeEmpty();
        env.IsProduction.Should().BeTrue();
        env.HealthStatus.Should().Be("Healthy");
        env.Deployments.Should().NotBeNull();
    }
}
