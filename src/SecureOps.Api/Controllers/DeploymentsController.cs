using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;

namespace SecureOps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DeploymentsController : ControllerBase
{
    private readonly IDeploymentService _deploymentService;
    private readonly IValidator<CreateDeploymentRequest> _createValidator;

    public DeploymentsController(
        IDeploymentService deploymentService,
        IValidator<CreateDeploymentRequest> createValidator)
    {
        _deploymentService = deploymentService;
        _createValidator = createValidator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<DeploymentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? applicationId,
        [FromQuery] Guid? environmentId,
        CancellationToken ct)
    {
        var deployments = await _deploymentService.GetAllAsync(applicationId, environmentId, ct);
        return Ok(deployments);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DeploymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var deployment = await _deploymentService.GetByIdAsync(id, ct);
        if (deployment == null) return NotFound(new { message = $"Deployment {id} not found." });
        return Ok(deployment);
    }

    [HttpPost]
    [ProducesResponseType(typeof(DeploymentDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateDeploymentRequest request, CancellationToken ct)
    {
        var validationResult = await _createValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var deployment = await _deploymentService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = deployment.Id }, deployment);
    }

    [HttpPost("{id:guid}/rollback")]
    [ProducesResponseType(typeof(DeploymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Rollback(Guid id, [FromBody] RollbackDeploymentRequest request, CancellationToken ct)
    {
        request.DeploymentId = id;
        var deployment = await _deploymentService.RollbackAsync(request, ct);
        return Ok(deployment);
    }
}
