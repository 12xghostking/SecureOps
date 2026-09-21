using Microsoft.AspNetCore.Mvc;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;

namespace SecureOps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PipelinesController : ControllerBase
{
    private readonly IPipelineService _pipelineService;

    public PipelinesController(IPipelineService pipelineService)
    {
        _pipelineService = pipelineService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<PipelineRunDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? applicationId, CancellationToken ct)
    {
        var runs = await _pipelineService.GetAllAsync(applicationId, ct);
        return Ok(runs);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PipelineRunDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var run = await _pipelineService.GetByIdAsync(id, ct);
        if (run == null) return NotFound(new { message = $"Pipeline run {id} not found." });
        return Ok(run);
    }
}

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class EnvironmentsController : ControllerBase
{
    private readonly IEnvironmentService _environmentService;

    public EnvironmentsController(IEnvironmentService environmentService)
    {
        _environmentService = environmentService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<EnvironmentDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var envs = await _environmentService.GetAllAsync(ct);
        return Ok(envs);
    }
}

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("metrics")]
    [ProducesResponseType(typeof(DashboardMetricsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMetrics(CancellationToken ct)
    {
        var metrics = await _dashboardService.GetMetricsAsync(ct);
        return Ok(metrics);
    }
}
