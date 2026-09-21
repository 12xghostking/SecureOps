using FluentAssertions;
using FluentValidation.TestHelper;
using SecureOps.Application.DTOs;
using SecureOps.Application.Validation;
using SecureOps.Domain.Enums;
using Xunit;

namespace SecureOps.UnitTests.Validation;

public class ValidatorTests
{
    private readonly CreateApplicationRequestValidator _appValidator = new();
    private readonly CreateDeploymentRequestValidator _depValidator = new();
    private readonly TriageFindingRequestValidator _triageValidator = new();

    [Fact]
    public void CreateApplicationRequest_ValidPayload_ShouldNotHaveErrors()
    {
        // Arrange
        var request = new CreateApplicationRequest
        {
            Name = "valid-service-123",
            Description = "A valid microservice description",
            RepositoryUrl = "https://github.com/secureops/valid-service",
            OwnerEmail = "lead@secureops.internal",
            Language = "C#",
            Tier = ApplicationTier.Tier1_MissionCritical
        };

        // Act
        var result = _appValidator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("service with spaces")]
    [InlineData("invalid@name!")]
    public void CreateApplicationRequest_InvalidName_ShouldHaveValidationError(string name)
    {
        // Arrange
        var request = new CreateApplicationRequest
        {
            Name = name,
            RepositoryUrl = "https://github.com/secureops/service",
            OwnerEmail = "lead@secureops.internal",
            Language = "Go"
        };

        // Act
        var result = _appValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData("not-a-valid-url")]
    [InlineData("")]
    public void CreateApplicationRequest_InvalidRepoUrl_ShouldHaveValidationError(string url)
    {
        // Arrange
        var request = new CreateApplicationRequest
        {
            Name = "service-one",
            RepositoryUrl = url,
            OwnerEmail = "lead@secureops.internal",
            Language = "Go"
        };

        // Act
        var result = _appValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.RepositoryUrl);
    }

    [Theory]
    [InlineData("plainaddress")]
    [InlineData("@missingusername.com")]
    public void CreateApplicationRequest_InvalidEmail_ShouldHaveValidationError(string email)
    {
        // Arrange
        var request = new CreateApplicationRequest
        {
            Name = "service-one",
            RepositoryUrl = "https://github.com/secureops/service",
            OwnerEmail = email,
            Language = "Go"
        };

        // Act
        var result = _appValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.OwnerEmail);
    }

    [Theory]
    [InlineData("v1.0.0")]
    [InlineData("2.4.1")]
    [InlineData("v3.0.0-rc.1")]
    [InlineData("1.0.0-beta.2")]
    public void CreateDeploymentRequest_ValidSemVer_ShouldNotHaveErrors(string version)
    {
        // Arrange
        var request = new CreateDeploymentRequest
        {
            ApplicationId = Guid.NewGuid(),
            EnvironmentId = Guid.NewGuid(),
            Version = version,
            CommitSha = "7a9b3c4",
            TriggeredBy = "CI/CD Pipeline"
        };

        // Act
        var result = _depValidator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Version);
    }

    [Theory]
    [InlineData("latest")]
    [InlineData("invalid_version")]
    [InlineData("1.0")]
    public void CreateDeploymentRequest_InvalidSemVer_ShouldHaveValidationError(string version)
    {
        // Arrange
        var request = new CreateDeploymentRequest
        {
            ApplicationId = Guid.NewGuid(),
            EnvironmentId = Guid.NewGuid(),
            Version = version,
            CommitSha = "7a9b3c4"
        };

        // Act
        var result = _depValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Version);
    }

    [Theory]
    [InlineData("abc")] // Too short
    [InlineData("12345678901234567890123456789012345678901")] // 41 chars, too long
    public void CreateDeploymentRequest_InvalidCommitSha_ShouldHaveValidationError(string sha)
    {
        // Arrange
        var request = new CreateDeploymentRequest
        {
            ApplicationId = Guid.NewGuid(),
            EnvironmentId = Guid.NewGuid(),
            Version = "v1.0.0",
            CommitSha = sha
        };

        // Act
        var result = _depValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.CommitSha);
    }

    [Fact]
    public void TriageFindingRequest_ValidPayload_ShouldPass()
    {
        // Arrange
        var request = new TriageFindingRequest
        {
            NewStatus = FindingStatus.Resolved,
            TriagedBy = "security-lead@secureops.internal",
            Notes = "Remediated by updating NuGet package dependency to secure version."
        };

        // Act
        var result = _triageValidator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")] // under 5 characters
    public void TriageFindingRequest_ShortNotes_ShouldFail(string notes)
    {
        // Arrange
        var request = new TriageFindingRequest
        {
            NewStatus = FindingStatus.Resolved,
            TriagedBy = "security-lead@secureops.internal",
            Notes = notes
        };

        // Act
        var result = _triageValidator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Notes);
    }
}
