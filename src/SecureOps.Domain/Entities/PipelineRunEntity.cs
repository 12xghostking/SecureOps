using SecureOps.Domain.Common;
using SecureOps.Domain.Enums;

namespace SecureOps.Domain.Entities;

public class PipelineRunEntity : BaseEntity
{
    public Guid ApplicationId { get; set; }
    public ApplicationEntity Application { get; set; } = null!;

    public string Branch { get; set; } = "main";
    public string CommitSha { get; set; } = string.Empty;
    public string CommitMessage { get; set; } = string.Empty;
    public string Trigger { get; set; } = "Push"; // Push, PullRequest, Manual, Schedule
    public PipelineStatus Status { get; set; } = PipelineStatus.Queued;

    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
    public int? DurationSeconds { get; set; }

    public string StagesJson { get; set; } = "[]"; // Serialized stages with status/duration
    public string RunNumber { get; set; } = string.Empty;
}
