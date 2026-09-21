using SecureOps.Domain.Common;
using SecureOps.Domain.Enums;

namespace SecureOps.Domain.Entities;

public class ApplicationEntity : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RepositoryUrl { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public ApplicationTier Tier { get; set; } = ApplicationTier.Tier2_BusinessCore;
    public bool IsActive { get; set; } = true;

    public ICollection<DeploymentEntity> Deployments { get; set; } = new List<DeploymentEntity>();
    public ICollection<PipelineRunEntity> PipelineRuns { get; set; } = new List<PipelineRunEntity>();
    public ICollection<SecurityFindingEntity> SecurityFindings { get; set; } = new List<SecurityFindingEntity>();
}
