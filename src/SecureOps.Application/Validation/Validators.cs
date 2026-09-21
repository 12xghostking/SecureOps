using FluentValidation;
using SecureOps.Application.DTOs;

namespace SecureOps.Application.Validation;

public class CreateApplicationRequestValidator : AbstractValidator<CreateApplicationRequest>
{
    public CreateApplicationRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Application name is required.")
            .MaximumLength(100).WithMessage("Application name cannot exceed 100 characters.")
            .Matches("^[a-zA-Z0-9-_]+$").WithMessage("Application name may only contain alphanumeric characters, hyphens, and underscores.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

        RuleFor(x => x.RepositoryUrl)
            .NotEmpty().WithMessage("Repository URL is required.")
            .Must(uri => Uri.TryCreate(uri, UriKind.Absolute, out _))
            .WithMessage("Repository URL must be a valid absolute URL.");

        RuleFor(x => x.OwnerEmail)
            .NotEmpty().WithMessage("Owner email is required.")
            .EmailAddress().WithMessage("A valid owner email address is required.");

        RuleFor(x => x.Language)
            .NotEmpty().WithMessage("Language/framework is required.");
    }
}

public class CreateDeploymentRequestValidator : AbstractValidator<CreateDeploymentRequest>
{
    public CreateDeploymentRequestValidator()
    {
        RuleFor(x => x.ApplicationId)
            .NotEmpty().WithMessage("Application ID is required.");

        RuleFor(x => x.EnvironmentId)
            .NotEmpty().WithMessage("Environment ID is required.");

        RuleFor(x => x.Version)
            .NotEmpty().WithMessage("Deployment version is required.")
            .Matches(@"^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$")
            .WithMessage("Version must follow Semantic Versioning (e.g., v1.0.0 or 1.2.3-beta.1).");

        RuleFor(x => x.CommitSha)
            .NotEmpty().WithMessage("Commit SHA is required.")
            .Length(7, 40).WithMessage("Commit SHA must be between 7 and 40 characters.");
    }
}

public class TriageFindingRequestValidator : AbstractValidator<TriageFindingRequest>
{
    public TriageFindingRequestValidator()
    {
        RuleFor(x => x.TriagedBy)
            .NotEmpty().WithMessage("TriagedBy username or email is required.");

        RuleFor(x => x.Notes)
            .NotEmpty().WithMessage("Triage justification or remediation notes are required.")
            .MinimumLength(5).WithMessage("Triage notes must be at least 5 characters.");
    }
}
