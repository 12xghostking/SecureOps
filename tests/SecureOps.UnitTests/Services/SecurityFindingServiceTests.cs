using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;
using SecureOps.Infrastructure.Data;
using Xunit;

namespace SecureOps.UnitTests.Services;

public class SecurityFindingServiceTests
{
    private static ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetAllAsync_WithFilters_ShouldReturnFilteredFindings()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        var app1 = new ApplicationEntity { Name = "service-a", Language = "C#" };
        var app2 = new ApplicationEntity { Name = "service-b", Language = "Go" };
        context.Applications.AddRange(app1, app2);

        var finding1 = new SecurityFindingEntity
        {
            ApplicationId = app1.Id,
            Title = "Hardcoded Secret",
            Severity = SeverityLevel.High,
            Status = FindingStatus.Open,
            ScanType = ScanType.Secret,
            Tool = "Gitleaks"
        };
        var finding2 = new SecurityFindingEntity
        {
            ApplicationId = app1.Id,
            Title = "SQL Injection",
            Severity = SeverityLevel.Critical,
            Status = FindingStatus.Open,
            ScanType = ScanType.SAST,
            Tool = "Semgrep"
        };
        var finding3 = new SecurityFindingEntity
        {
            ApplicationId = app2.Id,
            Title = "Outdated dependency",
            Severity = SeverityLevel.Low,
            Status = FindingStatus.Resolved,
            ScanType = ScanType.Container,
            Tool = "Trivy"
        };

        context.SecurityFindings.AddRange(finding1, finding2, finding3);
        await context.SaveChangesAsync();

        // Act - Filter by Severity High
        var highFindings = await service.GetAllAsync(severity: SeverityLevel.High);
        var app1Findings = await service.GetAllAsync(applicationId: app1.Id);
        var openFindings = await service.GetAllAsync(status: FindingStatus.Open);

        // Assert
        highFindings.Should().HaveCount(1);
        highFindings.First().Title.Should().Be("Hardcoded Secret");

        app1Findings.Should().HaveCount(2);
        // Should be ordered by severity descending (Critical first)
        app1Findings.First().Title.Should().Be("SQL Injection");

        openFindings.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByIdAsync_WhenExists_ShouldReturnFindingDto()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        var app = new ApplicationEntity { Name = "auth-service", Language = "TypeScript" };
        context.Applications.Add(app);

        var finding = new SecurityFindingEntity
        {
            ApplicationId = app.Id,
            Title = "Weak JWT Secret",
            Severity = SeverityLevel.Critical,
            Status = FindingStatus.Open,
            ScanType = ScanType.SAST,
            Tool = "Semgrep"
        };
        context.SecurityFindings.Add(finding);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(finding.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Weak JWT Secret");
        result.ApplicationName.Should().Be("auth-service");
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotExists_ShouldReturnNull()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        // Act
        var result = await service.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task TriageAsync_ResolvingFinding_ShouldUpdateStatusAndCreateAuditLog()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        var app = new ApplicationEntity { Name = "billing-service", Language = "Go" };
        context.Applications.Add(app);

        var finding = new SecurityFindingEntity
        {
            ApplicationId = app.Id,
            Title = "Hardcoded API Key",
            Severity = SeverityLevel.Critical,
            Status = FindingStatus.Open,
            ScanType = ScanType.Secret,
            Tool = "Gitleaks"
        };
        context.SecurityFindings.Add(finding);
        await context.SaveChangesAsync();

        var request = new TriageFindingRequest
        {
            NewStatus = FindingStatus.Resolved,
            TriagedBy = "secops-lead@company.internal",
            Notes = "Secret rotated and moved to AWS Secrets Manager."
        };

        // Act
        var result = await service.TriageAsync(finding.Id, request);

        // Assert finding update
        result.Status.Should().Be(FindingStatus.Resolved);
        result.TriagedBy.Should().Be("secops-lead@company.internal");
        result.TriageNotes.Should().Be("Secret rotated and moved to AWS Secrets Manager.");
        result.ResolvedAt.Should().NotBeNull();

        // Assert audit log creation
        var auditLogs = await context.AuditLogs.ToListAsync();
        auditLogs.Should().HaveCount(1);
        var log = auditLogs.First();
        log.Action.Should().Be("SecurityFindingTriaged");
        log.PerformedBy.Should().Be("secops-lead@company.internal");
        log.EntityId.Should().Be(finding.Id.ToString());
        log.Details.Should().Contain("from Open to Resolved");
    }

    [Fact]
    public async Task TriageAsync_WhenFindingNotFound_ShouldThrowKeyNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        var request = new TriageFindingRequest
        {
            NewStatus = FindingStatus.FalsePositive,
            TriagedBy = "analyst@company.internal",
            Notes = "Test dummy"
        };

        // Act & Assert
        var act = () => service.TriageAsync(Guid.NewGuid(), request);
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldCalculateCorrectMetrics()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new SecurityFindingService(context);

        var app = new ApplicationEntity { Name = "test-app", Language = "C#" };
        context.Applications.Add(app);

        context.SecurityFindings.AddRange(
            new SecurityFindingEntity
            {
                ApplicationId = app.Id,
                Title = "Critical Trivy CVE",
                Severity = SeverityLevel.Critical,
                Status = FindingStatus.Open,
                ScanType = ScanType.Container,
                Tool = "Trivy"
            },
            new SecurityFindingEntity
            {
                ApplicationId = app.Id,
                Title = "High Semgrep SAST",
                Severity = SeverityLevel.High,
                Status = FindingStatus.Suppressed,
                ScanType = ScanType.SAST,
                Tool = "Semgrep"
            },
            new SecurityFindingEntity
            {
                ApplicationId = app.Id,
                Title = "Medium Gitleaks Secret",
                Severity = SeverityLevel.Medium,
                Status = FindingStatus.Resolved,
                ScanType = ScanType.Secret,
                Tool = "Gitleaks"
            },
            new SecurityFindingEntity
            {
                ApplicationId = app.Id,
                Title = "Low Checkov IaC",
                Severity = SeverityLevel.Low,
                Status = FindingStatus.FalsePositive,
                ScanType = ScanType.IaC,
                Tool = "Checkov"
            }
        );
        await context.SaveChangesAsync();

        // Act
        var summary = await service.GetSummaryAsync();

        // Assert
        summary.TotalFindings.Should().Be(4);
        summary.CriticalCount.Should().Be(1);
        summary.HighCount.Should().Be(1);
        summary.MediumCount.Should().Be(1);
        summary.LowCount.Should().Be(1);
        summary.OpenCount.Should().Be(1);
        summary.ResolvedCount.Should().Be(1);
        summary.SuppressedCount.Should().Be(2); // Suppressed + FalsePositive
        summary.FindingsByTool["Trivy"].Should().Be(1);
        summary.FindingsByTool["Semgrep"].Should().Be(1);
        summary.FindingsByScanType["Container"].Should().Be(1);
    }
}
