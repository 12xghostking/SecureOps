# ==============================================================================
# SecureOps: DevSecOps Pipeline Installer for Target Repositories
# Copies GitHub Actions security workflows, security configs, and gating scripts.
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $false)]
    [string]$TargetPath,

    [Parameter(Mandatory = $false)]
    [switch]$Force
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] DevSecOps Pipeline & Security Config Installer" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve source repository root (SecureOps)
$SourceRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $SourceRoot ".gitleaks.toml"))) {
    $SourceRoot = (Get-Location).Path
}

# 2. Prompt for TargetPath if not provided
if ([string]::IsNullOrWhiteSpace($TargetPath)) {
    Write-Host "`nPlease enter the path to your target project repository:" -ForegroundColor Yellow
    Write-Host "Example: C:\Users\sirki\projects\job-seek" -ForegroundColor DarkGray
    $TargetPath = Read-Host "Project Path"
}

if ([string]::IsNullOrWhiteSpace($TargetPath)) {
    Write-Error "No target path provided. Operation aborted."
    exit 1
}

# Resolve full absolute target path
$TargetPath = [System.IO.Path]::GetFullPath($TargetPath)

if (-not (Test-Path $TargetPath)) {
    Write-Host "`n[WARN] Target path '$TargetPath' does not exist." -ForegroundColor Yellow
    $create = Read-Host "Would you like to create this directory now? (Y/n)"
    if ($create -match "^[Yy]|^$") {
        New-Item -ItemType Directory -Force -Path $TargetPath | Out-Null
        Write-Host "[OK] Created directory: $TargetPath" -ForegroundColor Green
    } else {
        Write-Error "Target directory does not exist. Operation aborted."
        exit 1
    }
}

Write-Host "`nSource: $SourceRoot" -ForegroundColor DarkGray
Write-Host "Target: $TargetPath" -ForegroundColor Green

# 3. List of required pipeline and configuration files to install
$FilesToCopy = @(
    @{
        Source = ".github/workflows/security.yml"
        Dest   = ".github/workflows/security.yml"
        Desc   = "GitHub Actions automated CI/CD security workflow"
    },
    @{
        Source = ".gitleaks.toml"
        Dest   = ".gitleaks.toml"
        Desc   = "Gitleaks secret detection rules & entropy config"
    },
    @{
        Source = "security/semgrep/semgrep-rules.yml"
        Dest   = "security/semgrep/semgrep-rules.yml"
        Desc   = "Semgrep SAST code analysis rules"
    },
    @{
        Source = "security/trivy/trivy.yaml"
        Dest   = "security/trivy/trivy.yaml"
        Desc   = "Trivy filesystem, dependency & CVE scanner config"
    },
    @{
        Source = "security/checkov/.checkov.yml"
        Dest   = "security/checkov/.checkov.yml"
        Desc   = "Checkov Infrastructure-as-Code & compliance config"
    },
    @{
        Source = "security/policies/gate-thresholds.md"
        Dest   = "security/policies/gate-thresholds.md"
        Desc   = "DevSecOps SLA & gate thresholds policy"
    },
    @{
        Source = "scripts/security-gate.ps1"
        Dest   = "scripts/security-gate.ps1"
        Desc   = "Windows PowerShell security gate & ingestion script"
    },
    @{
        Source = "scripts/security-gate.sh"
        Dest   = "scripts/security-gate.sh"
        Desc   = "Linux/macOS/CI Bash security gate & ingestion script"
    }
)

Write-Host "`n--> Copying DevSecOps configuration and workflow assets..." -ForegroundColor Cyan

$copiedCount = 0
foreach ($item in $FilesToCopy) {
    $srcPath = Join-Path $SourceRoot $item.Source
    $dstPath = Join-Path $TargetPath $item.Dest

    if (-not (Test-Path $srcPath)) {
        Write-Host "  [SKIP] Missing source asset: $($item.Source)" -ForegroundColor Yellow
        continue
    }

    $dstDir = Split-Path -Parent $dstPath
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
    }

    Copy-Item -Path $srcPath -Destination $dstPath -Force
    $copiedCount++
    Write-Host "  [OK] Copied: $($item.Dest)" -ForegroundColor Green
    Write-Host "       $($item.Desc)" -ForegroundColor DarkGray
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] Pipeline Installation Completed ($copiedCount files copied)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`nNext steps to activate automated GitHub Actions security scanning:" -ForegroundColor Yellow
Write-Host "  1. Switch to your project directory:" -ForegroundColor White
Write-Host "     cd `"$TargetPath`"" -ForegroundColor Cyan

Write-Host "`n  2. Stage and commit the DevSecOps files:" -ForegroundColor White
Write-Host "     git add .github security scripts .gitleaks.toml" -ForegroundColor Cyan
Write-Host "     git commit -m `"chore: add SecureOps DevSecOps security pipeline and configs`"" -ForegroundColor Cyan

Write-Host "`n  3. Push to your repository (main or master):" -ForegroundColor White
Write-Host "     git push" -ForegroundColor Cyan

Write-Host "`n  4. (Optional) Run the security gate locally right now:" -ForegroundColor White
Write-Host "     powershell -ExecutionPolicy Bypass -File .\scripts\security-gate.ps1 -TargetEnvironment Production" -ForegroundColor Cyan

Write-Host "`nAll workflows are configured to trigger on both [main, master] branches!" -ForegroundColor Green
