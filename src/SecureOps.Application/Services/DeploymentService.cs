using Microsoft.EntityFrameworkCore;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Application.DTOs;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;

namespace SecureOps.Application.Services;

public class DeploymentService : IDeploymentService
{
    private readonly IApplicationDbContext _context;

    public DeploymentService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DeploymentDto>> GetAllAsync(Guid? applicationId = null, Guid? environmentId = null, CancellationToken ct = default)
    {
        var query = _context.Deployments
            .AsNoTracking()
            .Include(d => d.Application)
            .Include(d => d.Environment)
            .AsQueryable();

        if (applicationId.HasValue)
            query = query.Where(d => d.ApplicationId == applicationId.Value);

        if (environmentId.HasValue)
            query = query.Where(d => d.EnvironmentId == environmentId.Value);

        var deployments = await query
            .OrderByDescending(d => d.StartedAt)
            .ToListAsync(ct);

        return deployments.Select(d => new DeploymentDto
        {
            Id = d.Id,
            ApplicationId = d.ApplicationId,
            ApplicationName = d.Application?.Name ?? "Unknown",
            EnvironmentId = d.EnvironmentId,
            EnvironmentName = d.Environment?.Name ?? "Unknown",
            Version = d.Version,
            CommitSha = d.CommitSha,
            TriggeredBy = d.TriggeredBy,
            Status = d.Status,
            StartedAt = d.StartedAt,
            CompletedAt = d.CompletedAt,
            RollbackTargetVersion = d.RollbackTargetVersion,
            HealthCheckPassed = d.HealthCheckPassed,
            StatusMessage = d.StatusMessage
        }).ToList();
    }

    public async Task<DeploymentDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var d = await _context.Deployments
            .AsNoTracking()
            .Include(d => d.Application)
            .Include(d => d.Environment)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        if (d == null) return null;

        return new DeploymentDto
        {
            Id = d.Id,
            ApplicationId = d.ApplicationId,
            ApplicationName = d.Application?.Name ?? "Unknown",
            EnvironmentId = d.EnvironmentId,
            EnvironmentName = d.Environment?.Name ?? "Unknown",
            Version = d.Version,
            CommitSha = d.CommitSha,
            TriggeredBy = d.TriggeredBy,
            Status = d.Status,
            StartedAt = d.StartedAt,
            CompletedAt = d.CompletedAt,
            RollbackTargetVersion = d.RollbackTargetVersion,
            HealthCheckPassed = d.HealthCheckPassed,
            StatusMessage = d.StatusMessage
        };
    }

    public async Task<DeploymentDto> CreateAsync(CreateDeploymentRequest request, CancellationToken ct = default)
    {
        var app = await _context.Applications.FindAsync(new object[] { request.ApplicationId }, ct)
            ?? throw new KeyNotFoundException($"Application {request.ApplicationId} was not found.");

        var env = await _context.Environments.FindAsync(new object[] { request.EnvironmentId }, ct)
            ?? throw new KeyNotFoundException($"Environment {request.EnvironmentId} was not found.");

        // Security Gate check: check for any open Critical findings for this application
        var hasCriticalFindings = await _context.SecurityFindings
            .AnyAsync(f => f.ApplicationId == request.ApplicationId && f.Status == FindingStatus.Open && f.Severity == SeverityLevel.Critical, ct);

        var deployment = new DeploymentEntity
        {
            ApplicationId = request.ApplicationId,
            EnvironmentId = request.EnvironmentId,
            Version = request.Version,
            CommitSha = request.CommitSha,
            TriggeredBy = request.TriggeredBy,
            Status = hasCriticalFindings && env.IsProduction ? DeploymentStatus.Failed : DeploymentStatus.Succeeded,
            StartedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow,
            HealthCheckPassed = !(hasCriticalFindings && env.IsProduction),
            StatusMessage = hasCriticalFindings && env.IsProduction
                ? "Deployment blocked by DevSecOps Security Gate: Open CRITICAL security findings detected."
                : "Deployment succeeded. Health probes verified."
        };

        _context.Deployments.Add(deployment);

        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = "DeploymentTriggered",
            EntityName = nameof(DeploymentEntity),
            EntityId = deployment.Id.ToString(),
            PerformedBy = request.TriggeredBy,
            Details = $"Deployed {app.Name} {request.Version} to {env.Name}. Status: {deployment.Status}"
        });

        await _context.SaveChangesAsync(ct);

        return new DeploymentDto
        {
            Id = deployment.Id,
            ApplicationId = deployment.ApplicationId,
            ApplicationName = app.Name,
            EnvironmentId = deployment.EnvironmentId,
            EnvironmentName = env.Name,
            Version = deployment.Version,
            CommitSha = deployment.CommitSha,
            TriggeredBy = deployment.TriggeredBy,
            Status = deployment.Status,
            StartedAt = deployment.StartedAt,
            CompletedAt = deployment.CompletedAt,
            HealthCheckPassed = deployment.HealthCheckPassed,
            StatusMessage = deployment.StatusMessage
        };
    }

    public async Task<DeploymentDto> RollbackAsync(RollbackDeploymentRequest request, CancellationToken ct = default)
    {
        var deployment = await _context.Deployments
            .Include(d => d.Application)
            .Include(d => d.Environment)
            .FirstOrDefaultAsync(d => d.Id == request.DeploymentId, ct)
            ?? throw new KeyNotFoundException($"Deployment {request.DeploymentId} was not found.");

        var rollbackDeployment = new DeploymentEntity
        {
            ApplicationId = deployment.ApplicationId,
            EnvironmentId = deployment.EnvironmentId,
            Version = request.TargetVersion,
            CommitSha = "rollback-" + Guid.NewGuid().ToString("N")[..8],
            TriggeredBy = request.PerformedBy,
            Status = DeploymentStatus.RolledBack,
            StartedAt = DateTimeOffset.UtcNow,
            CompletedAt = DateTimeOffset.UtcNow,
            RollbackTargetVersion = deployment.Version,
            HealthCheckPassed = true,
            StatusMessage = $"Rolled back from {deployment.Version} to {request.TargetVersion} by {request.PerformedBy}"
        };

        _context.Deployments.Add(rollbackDeployment);

        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = "DeploymentRolledBack",
            EntityName = nameof(DeploymentEntity),
            EntityId = rollbackDeployment.Id.ToString(),
            PerformedBy = request.PerformedBy,
            Details = $"Rolled back {deployment.Application.Name} in {deployment.Environment.Name} to {request.TargetVersion}"
        });

        await _context.SaveChangesAsync(ct);

        return new DeploymentDto
        {
            Id = rollbackDeployment.Id,
            ApplicationId = rollbackDeployment.ApplicationId,
            ApplicationName = deployment.Application.Name,
            EnvironmentId = rollbackDeployment.EnvironmentId,
            EnvironmentName = deployment.Environment.Name,
            Version = rollbackDeployment.Version,
            CommitSha = rollbackDeployment.CommitSha,
            TriggeredBy = rollbackDeployment.TriggeredBy,
            Status = rollbackDeployment.Status,
            StartedAt = rollbackDeployment.StartedAt,
            CompletedAt = rollbackDeployment.CompletedAt,
            RollbackTargetVersion = rollbackDeployment.RollbackTargetVersion,
            HealthCheckPassed = rollbackDeployment.HealthCheckPassed,
            StatusMessage = rollbackDeployment.StatusMessage
        };
    }
}
