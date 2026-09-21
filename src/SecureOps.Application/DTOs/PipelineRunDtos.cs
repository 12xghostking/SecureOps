using SecureOps.Domain.Enums;

namespace SecureOps.Application.DTOs;

public class PipelineStageDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Success"; // Success, Failed, Running, Skipped
    public int DurationSeconds { get; set; }
}

public class PipelineRunDto
{
    public Guid Id { get; set; }
    public Guid ApplicationId { get; set; }
    public string ApplicationName { get; set; } = string.Empty;
    public string RunNumber { get; set; } = string.Empty;
    public string Branch { get; set; } = "main";
    public string CommitSha { get; set; } = string.Empty;
    public string CommitMessage { get; set; } = string.Empty;
    public string Trigger { get; set; } = "Push";
    public PipelineStatus Status { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? DurationSeconds { get; set; }
    public List<PipelineStageDto> Stages { get; set; } = new();
}
