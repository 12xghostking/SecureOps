using SecureOps.Domain.Common;
using SecureOps.Domain.Enums;

namespace SecureOps.Domain.Entities;

public class SecurityFindingEntity : BaseEntity
{
    public Guid ApplicationId { get; set; }
    public ApplicationEntity Application { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SeverityLevel Severity { get; set; } = SeverityLevel.Medium;
    public ScanType ScanType { get; set; } = ScanType.SAST;
    public string Tool { get; set; } = string.Empty; // Semgrep, Gitleaks, Trivy, Checkov
    public FindingStatus Status { get; set; } = FindingStatus.Open;

    public string FilePath { get; set; } = string.Empty;
    public int? LineNumber { get; set; }
    public string RuleId { get; set; } = string.Empty;
    public string? CveId { get; set; }
    public bool FixAvailable { get; set; }
    public string? RemediationGuidance { get; set; }

    public DateTimeOffset FirstDetected { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }

    public string? TriagedBy { get; set; }
    public string? TriageNotes { get; set; }
}
