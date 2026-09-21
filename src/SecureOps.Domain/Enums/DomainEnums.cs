namespace SecureOps.Domain.Enums;

public enum DeploymentStatus
{
    Pending,
    InProgress,
    Succeeded,
    Failed,
    RolledBack
}

public enum SeverityLevel
{
    Info,
    Low,
    Medium,
    High,
    Critical
}

public enum FindingStatus
{
    Open,
    InProgress,
    Resolved,
    FalsePositive,
    Suppressed
}

public enum PipelineStatus
{
    Queued,
    Running,
    Success,
    Failed,
    Cancelled
}

public enum ScanType
{
    SAST,
    Secret,
    Container,
    IaC
}

public enum ApplicationTier
{
    Tier1_MissionCritical,
    Tier2_BusinessCore,
    Tier3_Internal
}

public enum EnvironmentType
{
    Development,
    Staging,
    Production
}
