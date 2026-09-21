using SecureOps.Domain.Enums;

namespace SecureOps.Application.DTOs;

public class DeploymentDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string ApplicationName { get; set; } = string.Empty;
    public Guid EnvironmentId { get; set; }
    public string EnvironmentName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string CommitSha { get; set; } = string.Empty;
    public string TriggeredBy { get; set; } = string.Empty;
    public DeploymentStatus Status { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? RollbackTargetVersion { get; set; }
    public bool HealthCheckPassed { get; set; }
    public string? StatusMessage { get; set; }
}

public class CreateDeploymentRequest
{
    public Guid ApplicationId { get; set; }
    public Guid EnvironmentId { get; set; }
    public string Version { get; set; } = string.Empty;
    public string CommitSha { get; set; } = string.Empty;
    public string TriggeredBy { get; set; } = "DevOps Pipeline";
}

public class RollbackDeploymentRequest
{
    public Guid DeploymentId { get; set; }
    public string TargetVersion { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
}
