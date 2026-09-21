using Microsoft.EntityFrameworkCore;
using SecureOps.Domain.Entities;

namespace SecureOps.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<ApplicationEntity> Applications { get; }
    DbSet<EnvironmentEntity> Environments { get; }
    DbSet<DeploymentEntity> Deployments { get; }
    DbSet<PipelineRunEntity> PipelineRuns { get; }
    DbSet<SecurityFindingEntity> SecurityFindings { get; }
    DbSet<AuditLogEntity> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
