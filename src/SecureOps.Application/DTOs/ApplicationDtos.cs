using SecureOps.Domain.Enums;

namespace SecureOps.Application.DTOs;

public class ApplicationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RepositoryUrl { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public ApplicationTier Tier { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int ActiveDeploymentsCount { get; set; }
    public int OpenVulnerabilitiesCount { get; set; }
    public string HealthStatus { get; set; } = "Healthy";
}

public class CreateApplicationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RepositoryUrl { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Language { get; set; } = "C#";
    public ApplicationTier Tier { get; set; } = ApplicationTier.Tier2_BusinessCore;
}

public class ApplicationDetailDto : ApplicationDto
{
    public List<DeploymentDto> RecentDeployments { get; set; } = new();
    public List<SecurityFindingDto> CriticalFindings { get; set; } = new();
    public List<PipelineRunDto> RecentPipelines { get; set; } = new();
}
