using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using SecureOps.Application.DTOs;
using SecureOps.Domain.Enums;
using Xunit;

namespace SecureOps.IntegrationTests;

public class ApiEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions;

    public ApiEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        _jsonOptions.Converters.Add(new JsonStringEnumConverter());
    }

    [Fact]
    public async Task CorrelationId_ShouldBeGeneratedAndEchoedInResponse()
    {
        // 1. Without header -> Server generates one
        var response1 = await _client.GetAsync("/api/applications");
        response1.Headers.Should().ContainKey("X-Correlation-Id");
        var generatedId = response1.Headers.GetValues("X-Correlation-Id").First();
        generatedId.Should().NotBeNullOrWhiteSpace();

        // 2. With header -> Server echoes the client's correlation ID
        var customCorrelationId = "test-correlation-" + Guid.NewGuid();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/applications");
        request.Headers.Add("X-Correlation-Id", customCorrelationId);

        var response2 = await _client.SendAsync(request);
        response2.Headers.Should().ContainKey("X-Correlation-Id");
        response2.Headers.GetValues("X-Correlation-Id").First().Should().Be(customCorrelationId);
    }

    [Fact]
    public async Task Applications_GetAll_ShouldReturnSeededApplications()
    {
        // Act
        var response = await _client.GetAsync("/api/applications");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var apps = await response.Content.ReadFromJsonAsync<List<ApplicationDto>>(_jsonOptions);
        apps.Should().NotBeNull();
        apps!.Count.Should().BeGreaterThanOrEqualTo(4);
        apps.Should().Contain(a => a.Name == "payment-api");
        apps.Should().Contain(a => a.Name == "auth-gateway");
    }

    [Fact]
    public async Task Applications_Create_WithValidData_ShouldReturnCreatedAndPersist()
    {
        // Arrange
        var newApp = new CreateApplicationRequest
        {
            Name = "notification-engine-" + Guid.NewGuid().ToString("N")[..6],
            Description = "Asynchronous customer notification dispatch service",
            RepositoryUrl = "https://github.com/secureops/notification-engine",
            OwnerEmail = "platform-team@secureops.internal",
            Language = "Go",
            Tier = ApplicationTier.Tier2_BusinessCore
        };

        // Act
        var postResponse = await _client.PostAsJsonAsync("/api/applications", newApp);

        // Assert
        postResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await postResponse.Content.ReadFromJsonAsync<ApplicationDto>(_jsonOptions);
        created.Should().NotBeNull();
        created!.Name.Should().Be(newApp.Name);
        created.Language.Should().Be("Go");

        // Verify retrieval via GET by ID
        var getResponse = await _client.GetAsync($"/api/applications/{created.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await getResponse.Content.ReadFromJsonAsync<ApplicationDetailDto>(_jsonOptions);
        fetched.Should().NotBeNull();
        fetched!.Name.Should().Be(newApp.Name);
    }

    [Fact]
    public async Task Applications_Create_WithInvalidData_ShouldReturn400BadRequest()
    {
        // Arrange - empty name violates FluentValidation rule
        var invalidApp = new CreateApplicationRequest
        {
            Name = "",
            Description = "Invalid",
            RepositoryUrl = "invalid-url",
            Language = "",
            Tier = ApplicationTier.Tier3_Internal
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/applications", invalidApp);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Name");
    }

    [Fact]
    public async Task SecurityFindings_GetAll_AndSummary_ShouldReturnValidFindings()
    {
        // Act - Get all findings
        var findingsResponse = await _client.GetAsync("/api/security/findings");
        findingsResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var findings = await findingsResponse.Content.ReadFromJsonAsync<List<SecurityFindingDto>>(_jsonOptions);
        findings.Should().NotBeNull();
        findings!.Count.Should().BeGreaterThan(0);

        // Act - Get Summary
        var summaryResponse = await _client.GetAsync("/api/security/summary");
        summaryResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var summary = await summaryResponse.Content.ReadFromJsonAsync<SecuritySummaryDto>(_jsonOptions);
        summary.Should().NotBeNull();
        summary!.TotalFindings.Should().Be(findings.Count);
        summary.CriticalCount.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task SecurityFindings_Triage_ShouldUpdateStatusAndTriageNotes()
    {
        // Arrange - get an existing open finding
        var findingsResponse = await _client.GetAsync("/api/security/findings?status=Open");
        var findings = await findingsResponse.Content.ReadFromJsonAsync<List<SecurityFindingDto>>(_jsonOptions);
        var targetFinding = findings!.First();

        var triageRequest = new TriageFindingRequest
        {
            NewStatus = FindingStatus.Resolved,
            TriagedBy = "lead-secops-engineer@secureops.internal",
            Notes = "Remediated via library upgrade in branch fix/security-patch."
        };

        // Act
        var triageResponse = await _client.PostAsJsonAsync($"/api/security/findings/{targetFinding.Id}/triage", triageRequest);

        // Assert
        triageResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await triageResponse.Content.ReadFromJsonAsync<SecurityFindingDto>(_jsonOptions);
        updated.Should().NotBeNull();
        updated!.Status.Should().Be(FindingStatus.Resolved);
        updated.TriagedBy.Should().Be(triageRequest.TriagedBy);
        updated.TriageNotes.Should().Be(triageRequest.Notes);
    }

    [Fact]
    public async Task Deployments_SecurityGate_ShouldBlockProductionWhenCriticalFindingPresent()
    {
        // Arrange
        var appsResponse = await _client.GetAsync("/api/applications");
        var apps = await appsResponse.Content.ReadFromJsonAsync<List<ApplicationDto>>(_jsonOptions);
        var paymentApp = apps!.First(a => a.Name == "payment-api");

        var envsResponse = await _client.GetAsync("/api/environments");
        var envs = await envsResponse.Content.ReadFromJsonAsync<List<EnvironmentDto>>(_jsonOptions);
        var prodEnv = envs!.First(e => e.IsProduction);

        var deployRequest = new CreateDeploymentRequest
        {
            ApplicationId = paymentApp.Id,
            EnvironmentId = prodEnv.Id,
            Version = "v3.0.0-release",
            CommitSha = "e3b0c44",
            TriggeredBy = "Automated Production Release Pipeline"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/deployments", deployRequest);

        // Assert - Endpoint returns 201 Created for the deployment record, but status is Failed due to Security Gate
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var deployment = await response.Content.ReadFromJsonAsync<DeploymentDto>(_jsonOptions);
        deployment.Should().NotBeNull();
        deployment!.Status.Should().Be(DeploymentStatus.Failed);
        deployment.HealthCheckPassed.Should().BeFalse();
        deployment.StatusMessage.Should().Contain("Security Gate");
    }

    [Fact]
    public async Task Dashboard_Metrics_ShouldReturnComprehensiveKPIs()
    {
        // Act
        var response = await _client.GetAsync("/api/dashboard/metrics");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var metrics = await response.Content.ReadFromJsonAsync<DashboardMetricsDto>(_jsonOptions);
        metrics.Should().NotBeNull();
        metrics!.TotalApplications.Should().BeGreaterThanOrEqualTo(4);
        metrics.ActiveDeployments.Should().BeGreaterThanOrEqualTo(0);
        metrics.TotalVulnerabilities.Should().BeGreaterThan(0);
        metrics.RecentDeployments.Should().NotBeEmpty();
        metrics.RecentFindings.Should().NotBeEmpty();
    }
}
