using Microsoft.EntityFrameworkCore;
using SecureOps.Application.Common.Interfaces;
using SecureOps.Application.DTOs;
using SecureOps.Domain.Entities;
using SecureOps.Domain.Enums;

namespace SecureOps.Application.Services;

public class SecurityFindingService : ISecurityFindingService
{
    private readonly IApplicationDbContext _context;

    public SecurityFindingService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SecurityFindingDto>> GetAllAsync(
        SeverityLevel? severity = null,
        FindingStatus? status = null,
        ScanType? scanType = null,
        Guid? applicationId = null,
        CancellationToken ct = default)
    {
        var query = _context.SecurityFindings
            .AsNoTracking()
            .Include(f => f.Application)
            .AsQueryable();

        if (severity.HasValue)
            query = query.Where(f => f.Severity == severity.Value);

        if (status.HasValue)
            query = query.Where(f => f.Status == status.Value);

        if (scanType.HasValue)
            query = query.Where(f => f.ScanType == scanType.Value);

        if (applicationId.HasValue)
            query = query.Where(f => f.ApplicationId == applicationId.Value);

        var findings = await query
            .OrderByDescending(f => f.Severity)
            .ThenByDescending(f => f.FirstDetected)
            .ToListAsync(ct);

        return findings.Select(f => new SecurityFindingDto
        {
            Id = f.Id,
            ApplicationId = f.ApplicationId,
            ApplicationName = f.Application?.Name ?? "Unknown",
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
            RemediationGuidance = f.RemediationGuidance,
            FirstDetected = f.FirstDetected,
            ResolvedAt = f.ResolvedAt,
            TriagedBy = f.TriagedBy,
            TriageNotes = f.TriageNotes
        }).ToList();
    }

    public async Task<SecurityFindingDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var f = await _context.SecurityFindings
            .AsNoTracking()
            .Include(f => f.Application)
            .FirstOrDefaultAsync(f => f.Id == id, ct);

        if (f == null) return null;

        return new SecurityFindingDto
        {
            Id = f.Id,
            ApplicationId = f.ApplicationId,
            ApplicationName = f.Application?.Name ?? "Unknown",
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
            RemediationGuidance = f.RemediationGuidance,
            FirstDetected = f.FirstDetected,
            ResolvedAt = f.ResolvedAt,
            TriagedBy = f.TriagedBy,
            TriageNotes = f.TriageNotes
        };
    }

    public async Task<SecurityFindingDto> TriageAsync(Guid id, TriageFindingRequest request, CancellationToken ct = default)
    {
        var finding = await _context.SecurityFindings
            .Include(f => f.Application)
            .FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new KeyNotFoundException($"Security finding {id} was not found.");

        var oldStatus = finding.Status;
        finding.Status = request.NewStatus;
        finding.TriagedBy = request.TriagedBy;
        finding.TriageNotes = request.Notes;
        if (request.NewStatus == FindingStatus.Resolved)
        {
            finding.ResolvedAt = DateTimeOffset.UtcNow;
        }

        _context.AuditLogs.Add(new AuditLogEntity
        {
            Action = "SecurityFindingTriaged",
            EntityName = nameof(SecurityFindingEntity),
            EntityId = finding.Id.ToString(),
            PerformedBy = request.TriagedBy,
            Details = $"Changed status of finding '{finding.Title}' from {oldStatus} to {request.NewStatus}. Reason: {request.Notes}"
        });

        await _context.SaveChangesAsync(ct);

        return new SecurityFindingDto
        {
            Id = finding.Id,
            ApplicationId = finding.ApplicationId,
            ApplicationName = finding.Application?.Name ?? "Unknown",
            Title = finding.Title,
            Description = finding.Description,
            Severity = finding.Severity,
            ScanType = finding.ScanType,
            Tool = finding.Tool,
            Status = finding.Status,
            FilePath = finding.FilePath,
            LineNumber = finding.LineNumber,
            RuleId = finding.RuleId,
            CveId = finding.CveId,
            FixAvailable = finding.FixAvailable,
            RemediationGuidance = finding.RemediationGuidance,
            FirstDetected = finding.FirstDetected,
            ResolvedAt = finding.ResolvedAt,
            TriagedBy = finding.TriagedBy,
            TriageNotes = finding.TriageNotes
        };
    }

    public async Task<SecuritySummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var findings = await _context.SecurityFindings.AsNoTracking().ToListAsync(ct);

        return new SecuritySummaryDto
        {
            TotalFindings = findings.Count,
            CriticalCount = findings.Count(f => f.Severity == SeverityLevel.Critical),
            HighCount = findings.Count(f => f.Severity == SeverityLevel.High),
            MediumCount = findings.Count(f => f.Severity == SeverityLevel.Medium),
            LowCount = findings.Count(f => f.Severity == SeverityLevel.Low),
            InfoCount = findings.Count(f => f.Severity == SeverityLevel.Info),
            OpenCount = findings.Count(f => f.Status == FindingStatus.Open),
            ResolvedCount = findings.Count(f => f.Status == FindingStatus.Resolved),
            SuppressedCount = findings.Count(f => f.Status == FindingStatus.Suppressed || f.Status == FindingStatus.FalsePositive),
            FindingsByTool = findings.GroupBy(f => f.Tool).ToDictionary(g => g.Key, g => g.Count()),
            FindingsByScanType = findings.GroupBy(f => f.ScanType.ToString()).ToDictionary(g => g.Key, g => g.Count())
        };
    }
}
