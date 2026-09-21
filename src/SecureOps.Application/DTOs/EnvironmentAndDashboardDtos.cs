using SecureOps.Domain.Enums;

namespace SecureOps.Application.DTOs;

public class EnvironmentDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public EnvironmentType Type { get; set; }
    public string ClusterName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public bool IsProduction { get; set; }
    public string HealthStatus { get; set; } = "Healthy";
    public int ActiveDeploymentsCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class DashboardMetricsDto
{
    public int TotalApplications { get; set; }
    public int ActiveDeployments { get; set; }
    public int TotalVulnerabilities { get; set; }
    public int CriticalFindings { get; set; }
    public int HighFindings { get; set; }
    public int MediumFindings { get; set; }
    public int LowFindings { get; set; }
    public double PassingPipelinesPercentage { get; set; }
    public string SecurityGateStatus { get; set; } = "Passed"; // Passed, Warning, Blocked
    public List<DeploymentDto> RecentDeployments { get; set; } = new();
    public List<SecurityFindingDto> RecentFindings { get; set; } = new();
    public List<EnvironmentDto> Environments { get; set; } = new();
}
