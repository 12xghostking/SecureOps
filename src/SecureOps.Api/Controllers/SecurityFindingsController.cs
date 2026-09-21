using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;
using SecureOps.Domain.Enums;

namespace SecureOps.Api.Controllers;

[ApiController]
[Route("api/security")]
[Produces("application/json")]
public class SecurityFindingsController : ControllerBase
{
    private readonly ISecurityFindingService _findingService;
    private readonly IValidator<TriageFindingRequest> _triageValidator;

    public SecurityFindingsController(
        ISecurityFindingService findingService,
        IValidator<TriageFindingRequest> triageValidator)
    {
        _findingService = findingService;
        _triageValidator = triageValidator;
    }

    [HttpGet("findings")]
    [ProducesResponseType(typeof(List<SecurityFindingDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] SeverityLevel? severity,
        [FromQuery] FindingStatus? status,
        [FromQuery] ScanType? scanType,
        [FromQuery] Guid? applicationId,
        CancellationToken ct)
    {
        var findings = await _findingService.GetAllAsync(severity, status, scanType, applicationId, ct);
        return Ok(findings);
    }

    [HttpGet("findings/{id:guid}")]
    [ProducesResponseType(typeof(SecurityFindingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var finding = await _findingService.GetByIdAsync(id, ct);
        if (finding == null) return NotFound(new { message = $"Finding {id} not found." });
        return Ok(finding);
    }

    [HttpPost("findings/{id:guid}/triage")]
    [ProducesResponseType(typeof(SecurityFindingDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Triage(Guid id, [FromBody] TriageFindingRequest request, CancellationToken ct)
    {
        var validationResult = await _triageValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var finding = await _findingService.TriageAsync(id, request, ct);
        return Ok(finding);
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(SecuritySummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var summary = await _findingService.GetSummaryAsync(ct);
        return Ok(summary);
    }

    [HttpPost("findings/ingest")]
    [ProducesResponseType(typeof(SecurityFindingDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Ingest([FromBody] IngestFindingRequest request, CancellationToken ct)
    {
        var finding = await _findingService.IngestAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = finding.Id }, finding);
    }

    [HttpPost("findings/ingest-batch")]
    [ProducesResponseType(typeof(List<SecurityFindingDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> IngestBatch([FromBody] List<IngestFindingRequest> requests, CancellationToken ct)
    {
        var findings = await _findingService.IngestBatchAsync(requests, ct);
        return Ok(findings);
    }
}
