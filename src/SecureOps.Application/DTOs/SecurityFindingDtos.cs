using SecureOps.Domain.Enums;

namespace SecureOps.Application.DTOs;

public class SecurityFindingDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string ApplicationName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public SeverityLevel Severity { get; set; }
    public ScanType ScanType { get; set; }
    public string Tool { get; set; } = string.Empty;
    public FindingStatus Status { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public int? LineNumber { get; set; }
    public string RuleId { get; set; } = string.Empty;
    public string? CveId { get; set; }
    public bool FixAvailable { get; set; }
    public string? RemediationGuidance { get; set; }
    public DateTimeOffset FirstDetected { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public string? TriagedBy { get; set; }
    public string? TriageNotes { get; set; }
}

public class TriageFindingRequest
{
    public FindingStatus NewStatus { get; set; }
    public string TriagedBy { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}

public class SecuritySummaryDto
{
    public int TotalFindings { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
    public int InfoCount { get; set; }
    public int OpenCount { get; set; }
    public int ResolvedCount { get; set; }
    public int SuppressedCount { get; set; }
    public Dictionary<string, int> FindingsByTool { get; set; } = new();
    public Dictionary<string, int> FindingsByScanType { get; set; } = new();
}
