using SecureOps.Application.DTOs;
using SecureOps.Domain.Enums;

namespace SecureOps.Application.Services;

public interface IApplicationService
{
    Task<List<ApplicationDto>> GetAllAsync(CancellationToken ct = default);
    Task<ApplicationDetailDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ApplicationDto> CreateAsync(CreateApplicationRequest request, CancellationToken ct = default);
}

public interface IDeploymentService
{
    Task<List<DeploymentDto>> GetAllAsync(Guid? applicationId = null, Guid? environmentId = null, CancellationToken ct = default);
    Task<DeploymentDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DeploymentDto> CreateAsync(CreateDeploymentRequest request, CancellationToken ct = default);
    Task<DeploymentDto> RollbackAsync(RollbackDeploymentRequest request, CancellationToken ct = default);
}

public interface ISecurityFindingService
{
    Task<List<SecurityFindingDto>> GetAllAsync(SeverityLevel? severity = null, FindingStatus? status = null, ScanType? scanType = null, Guid? applicationId = null, CancellationToken ct = default);
    Task<SecurityFindingDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SecurityFindingDto> TriageAsync(Guid id, TriageFindingRequest request, CancellationToken ct = default);
    Task<SecuritySummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

public interface IPipelineService
{
    Task<List<PipelineRunDto>> GetAllAsync(Guid? applicationId = null, CancellationToken ct = default);
    Task<PipelineRunDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}

public interface IEnvironmentService
{
    Task<List<EnvironmentDto>> GetAllAsync(CancellationToken ct = default);
}

public interface IDashboardService
{
    Task<DashboardMetricsDto> GetMetricsAsync(CancellationToken ct = default);
}
