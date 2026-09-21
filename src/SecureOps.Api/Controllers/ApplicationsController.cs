using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SecureOps.Application.DTOs;
using SecureOps.Application.Services;

namespace SecureOps.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ApplicationsController : ControllerBase
{
    private readonly IApplicationService _applicationService;
    private readonly IValidator<CreateApplicationRequest> _validator;

    public ApplicationsController(
        IApplicationService applicationService,
        IValidator<CreateApplicationRequest> validator)
    {
        _applicationService = applicationService;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<ApplicationDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var apps = await _applicationService.GetAllAsync(ct);
        return Ok(apps);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApplicationDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var app = await _applicationService.GetByIdAsync(id, ct);
        if (app == null) return NotFound(new { message = $"Application {id} not found." });
        return Ok(app);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApplicationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateApplicationRequest request, CancellationToken ct)
    {
        var validationResult = await _validator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var app = await _applicationService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = app.Id }, app);
    }
}
