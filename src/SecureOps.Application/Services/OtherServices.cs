using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Application.DTOs;
using SecureOps.Domain.Enums;

namespace SecureOps.Application.Services;

public class PipelineService : IPipelineService
{
    private readonly IApplicationDbContext _context;

    public PipelineService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PipelineRunDto>> GetAllAsync(Guid? applicationId = null, CancellationToken ct = default)
    {
        var query = _context.PipelineRuns
            .AsNoTracking()
            .Include(p => p.Application)
            .AsQueryable();

        if (applicationId.HasValue)
            query = query.Where(p => p.ApplicationId == applicationId.Value);

        var runs = await query
            .OrderByDescending(p => p.StartedAt)
            .ToListAsync(ct);

        return runs.Select(p => new PipelineRunDto
        {
            Id = p.Id,
            ApplicationId = p.ApplicationId,
            ApplicationName = p.Application?.Name ?? "Unknown",
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
        }).ToList();
    }

    public async Task<PipelineRunDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _context.PipelineRuns
            .AsNoTracking()
            .Include(p => p.Application)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (p == null) return null;

        return new PipelineRunDto
        {
            Id = p.Id,
            ApplicationId = p.ApplicationId,
            ApplicationName = p.Application?.Name ?? "Unknown",
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

public class EnvironmentService : IEnvironmentService
{
    private readonly IApplicationDbContext _context;

    public EnvironmentService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<EnvironmentDto>> GetAllAsync(CancellationToken ct = default)
    {
        var envs = await _context.Environments
            .AsNoTracking()
            .Include(e => e.Deployments)
            .OrderBy(e => e.Type)
            .ToListAsync(ct);

        return envs.Select(e => new EnvironmentDto
        {
            Id = e.Id,
            Name = e.Name,
            Type = e.Type,
            ClusterName = e.ClusterName,
            Region = e.Region,
            IsProduction = e.IsProduction,
            HealthStatus = e.HealthStatus,
            ActiveDeploymentsCount = e.Deployments.Count(d => d.Status == DeploymentStatus.Succeeded),
            CreatedAt = e.CreatedAt
        }).ToList();
    }
}

public class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _context;

    public DashboardService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardMetricsDto> GetMetricsAsync(CancellationToken ct = default)
    {
        var totalApps = await _context.Applications.CountAsync(ct);
        var activeDeployments = await _context.Deployments.CountAsync(d => d.Status == DeploymentStatus.Succeeded, ct);
        var findings = await _context.SecurityFindings.AsNoTracking().ToListAsync(ct);
        var pipelines = await _context.PipelineRuns.AsNoTracking().ToListAsync(ct);
        var environments = await _context.Environments.AsNoTracking().Include(e => e.Deployments).ToListAsync(ct);

        var recentDeploymentsList = await _context.Deployments
            .AsNoTracking()
            .Include(d => d.Application)
            .Include(d => d.Environment)
            .OrderByDescending(d => d.StartedAt)
            .Take(5)
            .ToListAsync(ct);

        var recentDeployments = recentDeploymentsList
            .Select(d => new DeploymentDto
            {
                Id = d.Id,
                ApplicationId = d.ApplicationId,
                ApplicationName = d.Application?.Name ?? "App",
                EnvironmentId = d.EnvironmentId,
                EnvironmentName = d.Environment?.Name ?? "Env",
                Version = d.Version,
                CommitSha = d.CommitSha,
                TriggeredBy = d.TriggeredBy,
                Status = d.Status,
                StartedAt = d.StartedAt,
                CompletedAt = d.CompletedAt,
                HealthCheckPassed = d.HealthCheckPassed,
                StatusMessage = d.StatusMessage
            })
            .ToList();

        var recentFindings = findings
            .OrderByDescending(f => f.FirstDetected)
            .Take(5)
            .Select(f => new SecurityFindingDto
            {
                Id = f.Id,
                ApplicationId = f.ApplicationId,
                ApplicationName = f.Application?.Name ?? "App",
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
            })
            .ToList();

        var openCritical = findings.Count(f => f.Severity == SeverityLevel.Critical && f.Status == FindingStatus.Open);
        var openHigh = findings.Count(f => f.Severity == SeverityLevel.High && f.Status == FindingStatus.Open);

        string gateStatus = openCritical > 0
            ? "Blocked"
            : (openHigh > 0 ? "Warning" : "Passed");

        double passingPipelines = pipelines.Count == 0
            ? 100.0
            : Math.Round((double)pipelines.Count(p => p.Status == PipelineStatus.Success) / pipelines.Count * 100, 1);

        return new DashboardMetricsDto
        {
            TotalApplications = totalApps,
            ActiveDeployments = activeDeployments,
            TotalVulnerabilities = findings.Count(f => f.Status == FindingStatus.Open),
            CriticalFindings = openCritical,
            HighFindings = openHigh,
            MediumFindings = findings.Count(f => f.Severity == SeverityLevel.Medium && f.Status == FindingStatus.Open),
            LowFindings = findings.Count(f => f.Severity == SeverityLevel.Low && f.Status == FindingStatus.Open),
            PassingPipelinesPercentage = passingPipelines,
            SecurityGateStatus = gateStatus,
            RecentDeployments = recentDeployments,
            RecentFindings = recentFindings,
            Environments = environments.Select(e => new EnvironmentDto
            {
                Id = e.Id,
                Name = e.Name,
                Type = e.Type,
                ClusterName = e.ClusterName,
                Region = e.Region,
                IsProduction = e.IsProduction,
                HealthStatus = e.HealthStatus,
                ActiveDeploymentsCount = e.Deployments.Count(d => d.Status == DeploymentStatus.Succeeded),
                CreatedAt = e.CreatedAt
            }).ToList()
        };
    }
}
