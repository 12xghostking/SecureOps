using SecureOps.Domain.Common;
using SecureOps.Domain.Enums;

namespace SecureOps.Domain.Entities;

public class DeploymentEntity : BaseEntity
{
    public Guid ApplicationId { get; set; }
    public ApplicationEntity Application { get; set; } = null!;

    public Guid EnvironmentId { get; set; }
    public EnvironmentEntity Environment { get; set; } = null!;

    public string Version { get; set; } = string.Empty;
    public string CommitSha { get; set; } = string.Empty;
    public string TriggeredBy { get; set; } = string.Empty;
    public DeploymentStatus Status { get; set; } = DeploymentStatus.Pending;

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }

    public string? RollbackTargetVersion { get; set; }
    public bool HealthCheckPassed { get; set; } = true;
    public string? StatusMessage { get; set; }
}
