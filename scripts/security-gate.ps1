<#
.SYNOPSIS
    SecureOps Automated Multi-Layer Security Gate Runner
.DESCRIPTION
    Executes Gitleaks, Semgrep, Trivy, and Checkov.
    Enforces zero-vulnerability policies for Production and DevSecOps pipelines.
.PARAMETER TargetEnvironment
    Target environment: 'Development' or 'Production' (Default: 'Production').
#>
param (
    [ValidateSet("Development", "Production")]
    [string]$TargetEnvironment = "Production"
)

$ErrorActionPreference = "Continue"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] DevSecOps Security Gate - Target: $TargetEnvironment" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$gateFailed = $false
$results = @()

# 1. Gitleaks - Secret Detection
Write-Host "`n--> [1/4] Running Gitleaks Secret Scanner..." -ForegroundColor Yellow
$gitleaksOutput = gitleaks dir --config .gitleaks.toml 2>&1
$gitleaksExit = $LASTEXITCODE

if ($gitleaksExit -eq 0) {
    Write-Host "  [PASS] Gitleaks: No hardcoded secrets detected." -ForegroundColor Green
    $results += [PSCustomObject]@{ Tool = "Gitleaks"; Status = "PASS"; Details = "0 secrets" }
} else {
    Write-Host "  [FAIL] Gitleaks: Hardcoded secrets detected!" -ForegroundColor Red
    $gateFailed = $true
    $results += [PSCustomObject]@{ Tool = "Gitleaks"; Status = "FAIL"; Details = "Secrets detected" }
}

# 2. Semgrep - SAST
Write-Host "`n--> [2/4] Running Semgrep SAST Scanner..." -ForegroundColor Yellow
$semgrepOutput = semgrep scan --config security/semgrep/semgrep-rules.yml src frontend/src 2>&1
$semgrepExit = $LASTEXITCODE

if ($semgrepExit -eq 0) {
    Write-Host "  [PASS] Semgrep: 0 blocking SAST vulnerabilities detected." -ForegroundColor Green
    $results += [PSCustomObject]@{ Tool = "Semgrep"; Status = "PASS"; Details = "0 vulnerabilities" }
} else {
    Write-Host "  [FAIL] Semgrep: SAST violations found!" -ForegroundColor Red
    $gateFailed = $true
    $results += [PSCustomObject]@{ Tool = "Semgrep"; Status = "FAIL"; Details = "SAST violations" }
}

# 3. Trivy - SCA & Misconfiguration
Write-Host "`n--> [3/4] Running Trivy Filesystem & Container Scanner..." -ForegroundColor Yellow
$trivyOutput = trivy fs --config security/trivy/trivy.yaml --severity CRITICAL,HIGH --exit-code 1 . 2>&1
$trivyExit = $LASTEXITCODE

if ($trivyExit -eq 0) {
    Write-Host "  [PASS] Trivy: 0 CRITICAL or HIGH vulnerabilities/misconfigurations." -ForegroundColor Green
    $results += [PSCustomObject]@{ Tool = "Trivy"; Status = "PASS"; Details = "0 High/Critical" }
} else {
    if ($TargetEnvironment -eq "Production") {
        Write-Host "  [FAIL] Trivy: Critical/High vulnerabilities detected in Production release!" -ForegroundColor Red
        $gateFailed = $true
        $results += [PSCustomObject]@{ Tool = "Trivy"; Status = "FAIL"; Details = "High/Critical CVEs" }
    } else {
        Write-Host "  [WARN] Trivy: High/Critical issues found but allowed in Development." -ForegroundColor Yellow
        $results += [PSCustomObject]@{ Tool = "Trivy"; Status = "WARN"; Details = "Non-blocking in Dev" }
    }
}

# 4. Checkov - IaC Security
Write-Host "`n--> [4/4] Running Checkov Infrastructure-as-Code Scanner..." -ForegroundColor Yellow
$checkovOutput = checkov --config-file security/checkov/.checkov.yml -d . 2>&1
$checkovExit = $LASTEXITCODE

if ($checkovExit -eq 0) {
    Write-Host "  [PASS] Checkov: 0 IaC policy violations detected." -ForegroundColor Green
    $results += [PSCustomObject]@{ Tool = "Checkov"; Status = "PASS"; Details = "0 violations" }
} else {
    if ($TargetEnvironment -eq "Production") {
        Write-Host "  [FAIL] Checkov: IaC policy violations detected!" -ForegroundColor Red
        $gateFailed = $true
        $results += [PSCustomObject]@{ Tool = "Checkov"; Status = "FAIL"; Details = "IaC violations" }
    } else {
        Write-Host "  [WARN] Checkov: Policy violations detected in non-prod." -ForegroundColor Yellow
        $results += [PSCustomObject]@{ Tool = "Checkov"; Status = "WARN"; Details = "Non-blocking in Dev" }
    }
}

# Summary Table
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] Security Gate Evaluation Summary" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

if ($gateFailed) {
    Write-Host ">>> SECURITY GATE FAILED: Deployment blocked according to policy. <<<`n" -ForegroundColor Red
    exit 1
} else {
    Write-Host ">>> SECURITY GATE PASSED: All requirements satisfied. Release approved. <<<`n" -ForegroundColor Green
    exit 0
}
