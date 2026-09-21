using Microsoft.EntityFrameworkCore;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Domain.Entities;

namespace SecureOps.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<ApplicationEntity> Applications => Set<ApplicationEntity>();
    public DbSet<EnvironmentEntity> Environments => Set<EnvironmentEntity>();
    public DbSet<DeploymentEntity> Deployments => Set<DeploymentEntity>();
    public DbSet<PipelineRunEntity> PipelineRuns => Set<PipelineRunEntity>();
    public DbSet<SecurityFindingEntity> SecurityFindings => Set<SecurityFindingEntity>();
    public DbSet<AuditLogEntity> AuditLogs => Set<AuditLogEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ApplicationEntity
        modelBuilder.Entity<ApplicationEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.RepositoryUrl).IsRequired().HasMaxLength(300);
            entity.Property(e => e.OwnerEmail).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Language).HasMaxLength(50);
            entity.Property(e => e.Tier).HasConversion<string>().HasMaxLength(50);
        });

        // EnvironmentEntity
        modelBuilder.Entity<EnvironmentEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.ClusterName).HasMaxLength(100);
            entity.Property(e => e.Region).HasMaxLength(50);
        });

        // DeploymentEntity
        modelBuilder.Entity<DeploymentEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Version).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CommitSha).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.TriggeredBy).HasMaxLength(150);

            entity.HasOne(d => d.Application)
                .WithMany(a => a.Deployments)
                .HasForeignKey(d => d.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Environment)
                .WithMany(e => e.Deployments)
                .HasForeignKey(d => d.EnvironmentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(d => d.StartedAt);
        });

        // PipelineRunEntity
        modelBuilder.Entity<PipelineRunEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RunNumber).HasMaxLength(50);
            entity.Property(e => e.Branch).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CommitSha).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Trigger).HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);

            entity.HasOne(p => p.Application)
                .WithMany(a => a.PipelineRuns)
                .HasForeignKey(p => p.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(p => p.StartedAt);
        });

        // SecurityFindingEntity
        modelBuilder.Entity<SecurityFindingEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(250);
            entity.Property(e => e.Severity).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.ScanType).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.Tool).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(50);
            entity.Property(e => e.RuleId).HasMaxLength(100);
            entity.Property(e => e.CveId).HasMaxLength(50);

            entity.HasOne(s => s.Application)
                .WithMany(a => a.SecurityFindings)
                .HasForeignKey(s => s.ApplicationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => s.Severity);
            entity.HasIndex(s => s.Status);
            entity.HasIndex(s => s.Tool);
        });

        // AuditLogEntity
        modelBuilder.Entity<AuditLogEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PerformedBy).HasMaxLength(150);
            entity.HasIndex(e => e.Timestamp);
        });

        if (Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        {
            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                var properties = entityType.ClrType.GetProperties()
                    .Where(p => p.PropertyType == typeof(DateTimeOffset) || p.PropertyType == typeof(DateTimeOffset?));
                foreach (var property in properties)
                {
                    modelBuilder.Entity(entityType.Name).Property(property.Name)
                        .HasConversion(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.DateTimeOffsetToStringConverter());
                }
            }
        }
    }
}
