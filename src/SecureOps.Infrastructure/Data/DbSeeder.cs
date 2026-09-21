using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;

namespace SecureOps.Infrastructure.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context, ILogger logger)
    {
        if (await context.Applications.AnyAsync())
        {
            logger.LogInformation("Database already contains seed data. Skipping seeding.");
            return;
        }

        logger.LogInformation("Seeding initial DevSecOps reference data...");

        // 1. Seed Environments
        var envDev = new EnvironmentEntity
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Development",
            Type = EnvironmentType.Development,
            ClusterName = "k8s-dev-cluster-eastus",
            Region = "eastus",
            IsProduction = false,
            HealthStatus = "Healthy"
        };

        var envStaging = new EnvironmentEntity
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Staging",
            Type = EnvironmentType.Staging,
            ClusterName = "k8s-stg-cluster-eastus",
            Region = "eastus",
            IsProduction = false,
            HealthStatus = "Healthy"
        };

        var envProd = new EnvironmentEntity
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Name = "Production",
            Type = EnvironmentType.Production,
            ClusterName = "aks-prod-secure-eastus",
            Region = "eastus",
            IsProduction = true,
            HealthStatus = "Healthy"
        };

        await context.Environments.AddRangeAsync(envDev, envStaging, envProd);

        // 2. Seed Applications
        var appAuth = new ApplicationEntity
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Name = "auth-gateway",
            Description = "OIDC Workload Identity & OAuth2 token validation gateway",
            RepositoryUrl = "https://github.com/organization/auth-gateway",
            OwnerEmail = "sec-team@secureops.internal",
            Language = "C# / ASP.NET Core",
            Tier = ApplicationTier.Tier1_MissionCritical,
            IsActive = true
        };

        var appPayment = new ApplicationEntity
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            Name = "payment-api",
            Description = "PCI-DSS compliant payment processing and vault microservice",
            RepositoryUrl = "https://github.com/organization/payment-api",
            OwnerEmail = "payments-eng@secureops.internal",
            Language = "C# / .NET 8",
            Tier = ApplicationTier.Tier1_MissionCritical,
            IsActive = true
        };

        var appOrder = new ApplicationEntity
        {
            Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            Name = "order-processing-service",
            Description = "Asynchronous distributed order fulfillment and saga orchestration",
            RepositoryUrl = "https://github.com/organization/order-processor",
            OwnerEmail = "orders-eng@secureops.internal",
            Language = "TypeScript / Node.js",
            Tier = ApplicationTier.Tier2_BusinessCore,
            IsActive = true
        };

        var appAnalytics = new ApplicationEntity
        {
            Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            Name = "analytics-worker",
            Description = "Telemetry ingestion, event streaming, and daily report generator",
            RepositoryUrl = "https://github.com/organization/analytics-worker",
            OwnerEmail = "data-team@secureops.internal",
            Language = "Python 3.12",
            Tier = ApplicationTier.Tier3_Internal,
            IsActive = true
        };

        await context.Applications.AddRangeAsync(appAuth, appPayment, appOrder, appAnalytics);

        // 3. Seed Deployments
        var now = DateTimeOffset.UtcNow;
        var deployments = new List<DeploymentEntity>
        {
            new()
            {
                ApplicationId = appAuth.Id,
                EnvironmentId = envProd.Id,
                Version = "v2.4.1",
                CommitSha = "7a9b3c4",
                TriggeredBy = "GitHub Actions (OIDC)",
                Status = DeploymentStatus.Succeeded,
                StartedAt = now.AddHours(-3),
                CompletedAt = now.AddHours(-2).AddMinutes(-50),
                HealthCheckPassed = true,
                StatusMessage = "All 4 pods healthy. Zero CVEs detected."
            },
            new()
            {
                ApplicationId = appPayment.Id,
                EnvironmentId = envStaging.Id,
                Version = "v1.8.0",
                CommitSha = "4f8e2d1",
                TriggeredBy = "devops-engineer@secureops.internal",
                Status = DeploymentStatus.Succeeded,
                StartedAt = now.AddHours(-6),
                CompletedAt = now.AddHours(-5).AddMinutes(-52),
                HealthCheckPassed = true,
                StatusMessage = "Staging smoke tests verified."
            },
            new()
            {
                ApplicationId = appOrder.Id,
                EnvironmentId = envDev.Id,
                Version = "v3.1.2-beta.4",
                CommitSha = "9c2a1b5",
                TriggeredBy = "developer@secureops.internal",
                Status = DeploymentStatus.InProgress,
                StartedAt = now.AddMinutes(-12),
                HealthCheckPassed = true,
                StatusMessage = "Rolling update in progress (2/3 pods ready)."
            },
            new()
            {
                ApplicationId = appPayment.Id,
                EnvironmentId = envProd.Id,
                Version = "v1.8.0-rc.1",
                CommitSha = "b3c8f1e",
                TriggeredBy = "automated-promotion",
                Status = DeploymentStatus.Failed,
                StartedAt = now.AddHours(-18),
                CompletedAt = now.AddHours(-17).AddMinutes(-55),
                HealthCheckPassed = false,
                StatusMessage = "Blocked by Security Gate: High severity CVE in container dependencies."
            },
            new()
            {
                ApplicationId = appAnalytics.Id,
                EnvironmentId = envProd.Id,
                Version = "v1.1.0",
                CommitSha = "1a2b3c4",
                TriggeredBy = "cd-workflow",
                Status = DeploymentStatus.RolledBack,
                StartedAt = now.AddDays(-1),
                CompletedAt = now.AddDays(-1).AddMinutes(15),
                RollbackTargetVersion = "v1.0.9",
                HealthCheckPassed = true,
                StatusMessage = "Automated rollback triggered due to memory leak threshold trigger."
            }
        };

        await context.Deployments.AddRangeAsync(deployments);

        // 4. Seed Pipelines
        var stagesStandard = JsonSerializer.Serialize(new List<object>
        {
            new { Name = "Build & Unit Test", Status = "Success", DurationSeconds = 42 },
            new { Name = "Gitleaks Secret Scan", Status = "Success", DurationSeconds = 12 },
            new { Name = "Semgrep SAST", Status = "Success", DurationSeconds = 28 },
            new { Name = "Trivy Container Scan", Status = "Success", DurationSeconds = 35 },
            new { Name = "Checkov IaC Scan", Status = "Success", DurationSeconds = 18 },
            new { Name = "Deploy to K8s", Status = "Success", DurationSeconds = 45 }
        });

        var stagesFailed = JsonSerializer.Serialize(new List<object>
        {
            new { Name = "Build & Unit Test", Status = "Success", DurationSeconds = 38 },
            new { Name = "Gitleaks Secret Scan", Status = "Success", DurationSeconds = 11 },
            new { Name = "Semgrep SAST", Status = "Failed", DurationSeconds = 25 },
            new { Name = "Trivy Container Scan", Status = "Skipped", DurationSeconds = 0 },
            new { Name = "Checkov IaC Scan", Status = "Skipped", DurationSeconds = 0 },
            new { Name = "Deploy to K8s", Status = "Skipped", DurationSeconds = 0 }
        });

        var stagesRunning = JsonSerializer.Serialize(new List<object>
        {
            new { Name = "Build & Unit Test", Status = "Success", DurationSeconds = 40 },
            new { Name = "Gitleaks Secret Scan", Status = "Success", DurationSeconds = 14 },
            new { Name = "Semgrep SAST", Status = "Running", DurationSeconds = 15 },
            new { Name = "Trivy Container Scan", Status = "Pending", DurationSeconds = 0 },
            new { Name = "Checkov IaC Scan", Status = "Pending", DurationSeconds = 0 },
            new { Name = "Deploy to K8s", Status = "Pending", DurationSeconds = 0 }
        });

        var pipelines = new List<PipelineRunEntity>
        {
            new()
            {
                ApplicationId = appAuth.Id,
                RunNumber = "#1042",
                Branch = "main",
                CommitSha = "7a9b3c4",
                CommitMessage = "feat: add OIDC token cache with Redis",
                Trigger = "Push",
                Status = PipelineStatus.Success,
                StartedAt = now.AddHours(-3),
                CompletedAt = now.AddHours(-3).AddMinutes(3),
                DurationSeconds = 180,
                StagesJson = stagesStandard
            },
            new()
            {
                ApplicationId = appPayment.Id,
                RunNumber = "#512",
                Branch = "feat/stripe-v3-upgrade",
                CommitSha = "b3c8f1e",
                CommitMessage = "refactor: upgrade stripe client sdk to v3",
                Trigger = "PullRequest",
                Status = PipelineStatus.Failed,
                StartedAt = now.AddHours(-5),
                CompletedAt = now.AddHours(-5).AddMinutes(2),
                DurationSeconds = 74,
                StagesJson = stagesFailed
            },
            new()
            {
                ApplicationId = appOrder.Id,
                RunNumber = "#891",
                Branch = "fix/order-timeout",
                CommitSha = "9c2a1b5",
                CommitMessage = "fix: increase saga orchestration retry backoff",
                Trigger = "Push",
                Status = PipelineStatus.Running,
                StartedAt = now.AddMinutes(-2),
                StagesJson = stagesRunning
            },
            new()
            {
                ApplicationId = appAnalytics.Id,
                RunNumber = "#234",
                Branch = "main",
                CommitSha = "1a2b3c4",
                CommitMessage = "chore: daily dependency security scan",
                Trigger = "Schedule",
                Status = PipelineStatus.Success,
                StartedAt = now.AddHours(-12),
                CompletedAt = now.AddHours(-12).AddMinutes(4),
                DurationSeconds = 210,
                StagesJson = stagesStandard
            }
        };

        await context.PipelineRuns.AddRangeAsync(pipelines);

        // 5. Seed Security Findings across Gitleaks, Semgrep, Trivy, and Checkov
        var findings = new List<SecurityFindingEntity>
        {
            new()
            {
                ApplicationId = appPayment.Id,
                Title = "Potential Hardcoded AWS Secret Key Pattern",
                Description = "Gitleaks detected an entropy pattern matching AWS Secret Access Key in configuration files.",
                Severity = SeverityLevel.Critical,
                ScanType = ScanType.Secret,
                Tool = "Gitleaks",
                Status = FindingStatus.Open,
                FilePath = "config/appsettings.json",
                LineNumber = 24,
                RuleId = "aws-secret-access-key",
                FixAvailable = true,
                RemediationGuidance = "Remove literal credentials and reference environment variable or Azure Key Vault secret URI.",
                FirstDetected = now.AddDays(-2)
            },
            new()
            {
                ApplicationId = appAuth.Id,
                Title = "SQL Injection Risk via String Concatenation",
                Description = "Semgrep rule csharp.lang.security.sql-injection detected raw SQL string concatenation in repository query.",
                Severity = SeverityLevel.High,
                ScanType = ScanType.SAST,
                Tool = "Semgrep",
                Status = FindingStatus.Open,
                FilePath = "src/Repositories/UserRepository.cs",
                LineNumber = 114,
                RuleId = "csharp.lang.security.sql-injection",
                FixAvailable = true,
                RemediationGuidance = "Use parameterized SQL queries with EF Core's FromSqlInterpolated or Dapper parameters.",
                FirstDetected = now.AddDays(-4)
            },
            new()
            {
                ApplicationId = appPayment.Id,
                Title = "Critical Vulnerability in Container Runtime (runc escape)",
                Description = "Trivy identified CVE-2024-21626 in base image runc package allowing container breakout.",
                Severity = SeverityLevel.Critical,
                ScanType = ScanType.Container,
                Tool = "Trivy",
                Status = FindingStatus.Open,
                FilePath = "Dockerfile",
                LineNumber = 1,
                RuleId = "CVE-2024-21626",
                CveId = "CVE-2024-21626",
                FixAvailable = true,
                RemediationGuidance = "Upgrade base image to mcr.microsoft.com/dotnet/aspnet:8.0-alpine3.20 or later.",
                FirstDetected = now.AddDays(-1)
            },
            new()
            {
                ApplicationId = appOrder.Id,
                Title = "Kubernetes Pod Container Running as Root",
                Description = "Checkov policy CKV_K8S_21: SecurityContext must specify runAsNonRoot: true to prevent container privilege escalation.",
                Severity = SeverityLevel.High,
                ScanType = ScanType.IaC,
                Tool = "Checkov",
                Status = FindingStatus.Open,
                FilePath = "infrastructure/kubernetes/base/deployment.yaml",
                LineNumber = 38,
                RuleId = "CKV_K8S_21",
                FixAvailable = true,
                RemediationGuidance = "Set securityContext.runAsNonRoot = true and runAsUser = 10001.",
                FirstDetected = now.AddDays(-3)
            },
            new()
            {
                ApplicationId = appOrder.Id,
                Title = "Missing CPU and Memory Resource Limits",
                Description = "Checkov policy CKV_K8S_11: Containers should have CPU and memory requests and limits defined.",
                Severity = SeverityLevel.Medium,
                ScanType = ScanType.IaC,
                Tool = "Checkov",
                Status = FindingStatus.Open,
                FilePath = "infrastructure/kubernetes/base/deployment.yaml",
                LineNumber = 42,
                RuleId = "CKV_K8S_11",
                FixAvailable = true,
                RemediationGuidance = "Define resources.limits.cpu and resources.limits.memory in container spec.",
                FirstDetected = now.AddDays(-5)
            },
            new()
            {
                ApplicationId = appAuth.Id,
                Title = "Insecure JWT Signing Algorithm (None / Weak Key)",
                Description = "Semgrep detected JWT validation allowing algorithm none or HMAC key length under 256 bits.",
                Severity = SeverityLevel.High,
                ScanType = ScanType.SAST,
                Tool = "Semgrep",
                Status = FindingStatus.Resolved,
                FilePath = "src/Middleware/JwtAuthenticationMiddleware.cs",
                LineNumber = 56,
                RuleId = "csharp.security.jwt.weak-validation",
                FixAvailable = true,
                RemediationGuidance = "Enforce ValidateIssuerSigningKey = true and RequireSignedTokens = true.",
                FirstDetected = now.AddDays(-10),
                ResolvedAt = now.AddDays(-1),
                TriagedBy = "sec-team@secureops.internal",
                TriageNotes = "Fixed in commit 7a9b3c4 by enforcing RSA256 signature verification."
            },
            new()
            {
                ApplicationId = appAnalytics.Id,
                Title = "High Severity OpenSSL Buffer Over-read",
                Description = "Trivy identified CVE-2024-0727 in OpenSSL package.",
                Severity = SeverityLevel.Medium,
                ScanType = ScanType.Container,
                Tool = "Trivy",
                Status = FindingStatus.Suppressed,
                FilePath = "Dockerfile",
                LineNumber = 1,
                RuleId = "CVE-2024-0727",
                CveId = "CVE-2024-0727",
                FixAvailable = false,
                RemediationGuidance = "Awaiting upstream vendor patch. Attack vector requires PKCS12 parsing not used in this service.",
                FirstDetected = now.AddDays(-7),
                TriagedBy = "devsecops-lead@secureops.internal",
                TriageNotes = "Suppressed: PKCS12 parsing not exposed to untrusted user input in this batch worker."
            }
        };

        await context.SecurityFindings.AddRangeAsync(findings);

        // 6. Seed Audit Logs
        var auditLogs = new List<AuditLogEntity>
        {
            new()
            {
                Action = "PlatformInitialized",
                EntityName = "System",
                EntityId = "system-root",
                PerformedBy = "DevSecOps Engine",
                Details = "Initialized SecureOps reference platform with zero-trust defaults.",
                Timestamp = now.AddDays(-14)
            },
            new()
            {
                Action = "PolicyGateEnforced",
                EntityName = "Deployment",
                EntityId = deployments[3].Id.ToString(),
                PerformedBy = "DevSecOps Gate",
                Details = "Enforced hard gate: Blocked production deployment of payment-api due to CVE-2024-21626.",
                Timestamp = now.AddHours(-18)
            }
        };

        await context.AuditLogs.AddRangeAsync(auditLogs);

        await context.SaveChangesAsync();
        logger.LogInformation("Seeding completed successfully: 4 apps, 3 envs, 5 deployments, 4 pipelines, 7 findings, 2 audit logs.");
    }
}
