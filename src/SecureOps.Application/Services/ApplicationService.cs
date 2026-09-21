using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Application.DTOs;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;

namespace SecureOps.Application.Services;

public class ApplicationService : IApplicationService
{
    private readonly IApplicationDbContext _context;

    public ApplicationService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApplicationDto>> GetAllAsync(CancellationToken ct = default)
    {
        var apps = await _context.Applications
            .AsNoTracking()
            .Include(a => a.Deployments)
            .Include(a => a.SecurityFindings)
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

        return apps.Select(a => new ApplicationDto
        {
            Id = a.Id,
            Name = a.Name,
            Description = a.Description,
            RepositoryUrl = a.RepositoryUrl,
            OwnerEmail = a.OwnerEmail,
            Language = a.Language,
            Tier = a.Tier,
            IsActive = a.IsActive,
            CreatedAt = a.CreatedAt,
            ActiveDeploymentsCount = a.Deployments.Count(d => d.Status == DeploymentStatus.Succeeded),
            OpenVulnerabilitiesCount = a.SecurityFindings.Count(f => f.Status == FindingStatus.Open),
            HealthStatus = a.SecurityFindings.Any(f => f.Status == FindingStatus.Open && (f.Severity == SeverityLevel.Critical || f.Severity == SeverityLevel.High))
                ? "Degraded"
                : "Healthy"
        }).ToList();
    }

    public async Task<ApplicationDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var app = await _context.Applications
            .AsNoTracking()
            .Include(a => a.Deployments).ThenInclude(d => d.Environment)
            .Include(a => a.SecurityFindings)
            .Include(a => a.PipelineRuns)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (app == null) return null;

        return new ApplicationDetailDto
        {
            Id = app.Id,
            Name = app.Name,
            Description = app.Description,
            RepositoryUrl = app.RepositoryUrl,
            OwnerEmail = app.OwnerEmail,
            Language = app.Language,
            Tier = app.Tier,
            IsActive = app.IsActive,
            CreatedAt = app.CreatedAt,
            ActiveDeploymentsCount = app.Deployments.Count(d => d.Status == DeploymentStatus.Succeeded),
            OpenVulnerabilitiesCount = app.SecurityFindings.Count(f => f.Status == FindingStatus.Open),
            HealthStatus = app.SecurityFindings.Any(f => f.Status == FindingStatus.Open && (f.Severity == SeverityLevel.Critical || f.Severity == SeverityLevel.High))
                ? "Degraded"
                : "Healthy",
            RecentDeployments = app.Deployments
                .OrderByDescending(d => d.StartedAt)
                .Take(5)
                .Select(d => new DeploymentDto
                {
                    Id = d.Id,
                    ApplicationId = d.ApplicationId,
                    ApplicationName = app.Name,
                    EnvironmentId = d.EnvironmentId,
                    EnvironmentName = d.Environment?.Name ?? "Unknown",
                    Version = d.Version,
                    CommitSha = d.CommitSha,
                    TriggeredBy = d.TriggeredBy,
                    Status = d.Status,
                    StartedAt = d.StartedAt,
                    CompletedAt = d.CompletedAt,
                    HealthCheckPassed = d.HealthCheckPassed,
                    StatusMessage = d.StatusMessage
                }).ToList(),
            CriticalFindings = app.SecurityFindings
                .Where(f => f.Severity >= SeverityLevel.High && f.Status == FindingStatus.Open)
                .OrderByDescending(f => f.Severity)
                .Select(f => new SecurityFindingDto
                {
                    Id = f.Id,
                    ApplicationId = f.ApplicationId,
                    ApplicationName = app.Name,
                    Title = f.Title,
                    Description = f.Description,
                    Severity = f.Severity,
                    ScanType = f.ScanType,
                    Tool = f.Tool,
                    Status = f.Status,
                    FilePath = f.FilePath,
                    LineNumber = f.LineNumber,
                    RuleId = f.RuleId,
                    CveId = f.CveId,
                    FixAvailable = f.FixAvailable,
                    FirstDetected = f.FirstDetected
                }).ToList(),
            RecentPipelines = app.PipelineRuns
                .OrderByDescending(p => p.StartedAt)
                .Take(5)
                .Select(p => new PipelineRunDto
                {
                    Id = p.Id,
                    ApplicationId = p.ApplicationId,
                    ApplicationName = app.Name,
                    RunNumber = p.RunNumber,
                    Branch = p.Branch,
                    CommitSha = p.CommitSha,
                    CommitMessage = p.CommitMessage,
                    Trigger = p.Trigger,
                    Status = p.Status,
                    StartedAt = p.StartedAt,
                    CompletedAt = p.CompletedAt,
                    DurationSeconds = p.DurationSeconds,
                    Stages = ParseStages(p.StagesJson)
                }).ToList()
        };
    }

    public async Task<ApplicationDto> CreateAsync(CreateApplicationRequest request, CancellationToken ct = default)
    {
        var app = new ApplicationEntity
        {
            Name = request.Name,
            Description = request.Description,
            RepositoryUrl = request.RepositoryUrl,
            OwnerEmail = request.OwnerEmail,
            Language = request.Language,
            Tier = request.Tier,
            IsActive = true
        };

        _context.Applications.Add(app);

        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = "ApplicationCreated",
            EntityName = nameof(ApplicationEntity),
            EntityId = app.Id.ToString(),
            PerformedBy = request.OwnerEmail,
            Details = $"Registered application {app.Name} ({app.Language})"
        });

        await _context.SaveChangesAsync(ct);

        return new ApplicationDto
        {
            Id = app.Id,
            Name = app.Name,
            Description = app.Description,
            RepositoryUrl = app.RepositoryUrl,
            OwnerEmail = app.OwnerEmail,
            Language = app.Language,
            Tier = app.Tier,
            IsActive = app.IsActive,
            CreatedAt = app.CreatedAt,
            ActiveDeploymentsCount = 0,
            OpenVulnerabilitiesCount = 0,
            HealthStatus = "Healthy"
        };
    }

    private static List<PipelineStageDto> ParseStages(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<PipelineStageDto>>(json) ?? new();
        }
        catch
        {
            return new();
        }
    }
}
