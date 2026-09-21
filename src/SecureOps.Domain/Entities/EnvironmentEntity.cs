using SecureOps.Domain.Common;
using SecureOps.Domain.Enums;

namespace SecureOps.Domain.Entities;

public class EnvironmentEntity : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public EnvironmentType Type { get; set; } = EnvironmentType.Development;
    public string ClusterName { get; set; } = string.Empty;
    public string Region { get; set; } = "eastus";
    public bool IsProduction { get; set; }
    public string HealthStatus { get; set; } = "Healthy";

    public ICollection<DeploymentEntity> Deployments { get; set; } = new List<DeploymentEntity>();
}
