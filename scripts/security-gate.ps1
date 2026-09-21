<#
.SYNOPSIS
    SecureOps Automated Multi-Layer Security Gate & Ingestion Runner
.DESCRIPTION
    Executes Gitleaks, Semgrep, Trivy, and Checkov against any project codebase.
    Parses findings across Secret, SAST, SCA, and IaC layers and automatically
    ingests them into the SecureOps Portal (http://localhost:3000) for real-time
    dashboard visibility and policy enforcement.
.PARAMETER ProjectPath
    Path to the project to scan (Default: current directory).
.PARAMETER TargetEnvironment
    Target environment: 'Development' or 'Production' (Default: 'Production').
.PARAMETER ApiUrl
    URL of the SecureOps API backend (Default: 'http://localhost:5000').
.PARAMETER ApplicationName
    Name of the application in SecureOps (Default: directory name of ProjectPath).
.PARAMETER UploadToPortal
    Switch to upload findings to the SecureOps portal (auto-enabled if API is online).
#>
param (
    [string]$ProjectPath = ".",
    [ValidateSet("Development", "Production")]
    [string]$TargetEnvironment = "Production",
    [string]$ApiUrl = "http://localhost:5000",
    [string]$ApplicationName = "",
    [switch]$UploadToPortal,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Continue"

# 1. Resolve Project and Paths
$resolvedProject = (Resolve-Path $ProjectPath).Path
if (-not $ApplicationName) {
    $ApplicationName = Split-Path -Leaf $resolvedProject
}

# Locate SecureOps root for default security configurations
$secureOpsRootCandidates = @(
    (Join-Path $PSScriptRoot ".."),
    "C:\Users\sirki\projects\SecureOps",
    $env:SECUREOPS_ROOT
)
$secureOpsRoot = $null
foreach ($cand in $secureOpsRootCandidates) {
    if ($cand -and (Test-Path (Join-Path $cand "security\semgrep\semgrep-rules.yml"))) {
        $secureOpsRoot = (Resolve-Path $cand).Path
        break
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] DevSecOps Security Gate & Portal Ingestion" -ForegroundColor Cyan
Write-Host "  Project:     $resolvedProject ($ApplicationName)" -ForegroundColor Cyan
Write-Host "  Environment: $TargetEnvironment" -ForegroundColor Cyan
Write-Host "  API Backend: $ApiUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 2. Check SecureOps API Connection & Application Registration
$apiOnline = $false
$targetAppId = $null
$findingsToIngest = [System.Collections.Generic.List[PSCustomObject]]::new()

try {
    $healthResp = Invoke-RestMethod -Uri "$ApiUrl/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    $apiOnline = $true
    Write-Host "[INFO] Connected to SecureOps API at $ApiUrl" -ForegroundColor Green
} catch {
    Write-Host "[WARN] SecureOps API offline at $ApiUrl. Findings will only be displayed in terminal." -ForegroundColor Yellow
}

if ($apiOnline) {
    try {
        $apps = Invoke-RestMethod -Uri "$ApiUrl/api/applications" -Method Get -TimeoutSec 5 -ErrorAction Stop
        $app = $apps | Where-Object { $_.name -ieq $ApplicationName }
        
        if ($null -eq $app) {
            Write-Host "`n[ONBOARDING] Application '$ApplicationName' is not registered in SecureOps." -ForegroundColor Yellow
            
            # Detect default metadata
            $defRepo = "https://github.com/local/$ApplicationName"
            $defEmail = "devsecops@company.internal"
            $defLang = "Multi-language"
            $defDesc = "Onboarded application via DevSecOps Security Gate"
            $defTier = "Tier2_BusinessCore"

            # Check Git metadata
            try {
                $gitUrl = git -C $resolvedProject config --get remote.origin.url 2>$null
                if ($gitUrl -and $gitUrl.Trim() -match "^https?://") {
                    $defRepo = $gitUrl.Trim()
                } elseif ($gitUrl -and $gitUrl.Trim() -match "^git@github\.com:(.+)\.git$") {
                    $defRepo = "https://github.com/" + $Matches[1]
                }
                
                $gitMail = git -C $resolvedProject config --get user.email 2>$null
                if ($gitMail -and $gitMail.Contains("@")) {
                    $defEmail = $gitMail.Trim()
                }
            } catch {}

            # Detect language/stack
            if (Test-Path (Join-Path $resolvedProject "package.json")) {
                $defLang = "TypeScript / Node.js"
            } elseif ((Get-ChildItem -Path $resolvedProject -Filter "*.csproj" -Recurse -Depth 2 -ErrorAction SilentlyContinue).Count -gt 0) {
                $defLang = "C# / .NET 8"
            } elseif (Test-Path (Join-Path $resolvedProject "requirements.txt")) {
                $defLang = "Python 3.12"
            } elseif (Test-Path (Join-Path $resolvedProject "go.mod")) {
                $defLang = "Go"
            }

            $finalName = $ApplicationName
            $finalDesc = $defDesc
            $finalRepo = $defRepo
            $finalEmail = $defEmail
            $finalLang = $defLang
            $finalTier = $defTier

            # Interactive prompts if user is in an interactive terminal
            $isInteractive = (-not $NonInteractive) -and ($env:CI -ne "true") -and [Environment]::UserInteractive

            if ($isInteractive) {
                Write-Host "Please enter or confirm service details for the SecureOps Portal (Press [Enter] to accept defaults):`n" -ForegroundColor Cyan
                
                $inName = Read-Host "  Service Name [$ApplicationName]"
                if ($inName -and $inName.Trim()) { $finalName = $inName.Trim() }

                $inDesc = Read-Host "  Description [$defDesc]"
                if ($inDesc -and $inDesc.Trim()) { $finalDesc = $inDesc.Trim() }

                $inRepo = Read-Host "  Repository URL [$defRepo]"
                if ($inRepo -and $inRepo.Trim()) { $finalRepo = $inRepo.Trim() }

                $inEmail = Read-Host "  Owner Email [$defEmail]"
                if ($inEmail -and $inEmail.Trim()) { $finalEmail = $inEmail.Trim() }

                $inLang = Read-Host "  Language / Tech Stack [$defLang]"
                if ($inLang -and $inLang.Trim()) { $finalLang = $inLang.Trim() }

                Write-Host "  Select Application Tier:" -ForegroundColor Cyan
                Write-Host "    [1] Tier 1: Mission Critical (Zero tolerance, 24h SLA)"
                Write-Host "    [2] Tier 2: Business Core (Standard Production Gate - Default)"
                Write-Host "    [3] Tier 3: Internal Utility (Non-blocking DevSecOps)"
                $inTier = Read-Host "  Select Tier [2]"
                switch ($inTier.Trim()) {
                    "1" { $finalTier = "Tier1_MissionCritical" }
                    "3" { $finalTier = "Tier3_Internal" }
                    Default { $finalTier = "Tier2_BusinessCore" }
                }
                Write-Host ""
            }

            $newAppPayload = @{
                name = $finalName
                description = $finalDesc
                repositoryUrl = $finalRepo
                ownerEmail = $finalEmail
                language = $finalLang
                tier = $finalTier
            } | ConvertTo-Json
            
            $newAppBytes = [System.Text.Encoding]::UTF8.GetBytes($newAppPayload)
            $app = Invoke-RestMethod -Uri "$ApiUrl/api/applications" -Method Post -Body $newAppBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 10
            Write-Host "[INFO] Successfully registered application '$finalName' with ID $($app.id)" -ForegroundColor Green
            $ApplicationName = $finalName
        }
        $targetAppId = $app.id
    } catch {
        $errMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errMsg = $reader.ReadToEnd()
            } catch {}
        }
        Write-Host "[WARN] Could not retrieve or register application in API: $errMsg" -ForegroundColor Yellow
    }
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("secureops_" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$gateFailed = $false
$summaryResults = @()

# ---------------------------------------------------------
# 1. Gitleaks - Secret Detection
# ---------------------------------------------------------
Write-Host "`n--> [1/4] Running Gitleaks Secret Scanner..." -ForegroundColor Yellow
$gitleaksJson = Join-Path $tempDir "gitleaks.json"
$gitleaksConfig = $null

if (Test-Path (Join-Path $resolvedProject ".gitleaks.toml")) {
    $gitleaksConfig = Join-Path $resolvedProject ".gitleaks.toml"
} elseif ($secureOpsRoot -and (Test-Path (Join-Path $secureOpsRoot ".gitleaks.toml"))) {
    $gitleaksConfig = Join-Path $secureOpsRoot ".gitleaks.toml"
}

$gitleaksArgs = @("dir", "$resolvedProject", "-f", "json", "-r", "$gitleaksJson")
if ($gitleaksConfig) {
    $gitleaksArgs += @("-c", "$gitleaksConfig")
}

$hasDocker = (Get-Command "docker" -ErrorAction SilentlyContinue) -ne $null
$gitleaksExit = 0

if (Get-Command "gitleaks" -ErrorAction SilentlyContinue) {
    $gitleaksProc = Start-Process -FilePath "gitleaks" -ArgumentList $gitleaksArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "gitleaks_err.log")
    $gitleaksExit = $gitleaksProc.ExitCode
} elseif ($hasDocker) {
    Write-Host "  [INFO] 'gitleaks' CLI not found. Running via Docker container (zricethezav/gitleaks)..." -ForegroundColor DarkGray
    $dockerArgs = @("run", "--rm", "-v", "${resolvedProject}:/scan", "-v", "${tempDir}:/out", "zricethezav/gitleaks:latest", "dir", "/scan", "-f", "json", "-r", "/out/gitleaks.json")
    if ($gitleaksConfig) {
        $dockerArgs += @("-c", "/scan/.gitleaks.toml")
    }
    $gitleaksProc = Start-Process -FilePath "docker" -ArgumentList $dockerArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "gitleaks_err.log")
    $gitleaksExit = $gitleaksProc.ExitCode
} else {
    Write-Host "  [WARN] Neither Gitleaks CLI nor Docker found on system. Skipping secret scan." -ForegroundColor Yellow
}

$gitleaksCount = 0
if (Test-Path $gitleaksJson) {
    try {
        $rawGitleaks = Get-Content -Raw -Encoding UTF8 -Path $gitleaksJson
        if ($rawGitleaks -and $rawGitleaks.Trim().Length -gt 2) {
            $parsedLeaks = $rawGitleaks | ConvertFrom-Json
            if ($parsedLeaks) {
                $gitleaksCount = @($parsedLeaks).Count
                foreach ($leak in @($parsedLeaks)) {
                    $relFile = $leak.File.Replace("$resolvedProject\", "").Replace("$resolvedProject/", "")
                    $findingsToIngest.Add([PSCustomObject]@{
                        applicationId = $targetAppId
                        title = "Exposed Secret: $($leak.RuleID)"
                        description = "$($leak.Description) found in $relFile at line $($leak.StartLine)"
                        severity = 4 # Critical
                        scanType = 1 # Secret
                        tool = "Gitleaks"
                        filePath = $relFile
                        lineNumber = [int]$leak.StartLine
                        ruleId = [string]$leak.RuleID
                        fixAvailable = $false
                        remediationGuidance = "Immediately rotate and revoke the exposed credential. Store secrets securely using environment variables or a Secret Manager."
                    })
                }
            }
        }
    } catch {
        Write-Host "  [WARN] Failed to parse Gitleaks JSON: $_" -ForegroundColor Yellow
    }
}

if ($gitleaksCount -eq 0 -and $gitleaksExit -eq 0) {
    Write-Host "  [PASS] Gitleaks: No hardcoded secrets detected." -ForegroundColor Green
    $summaryResults += [PSCustomObject]@{ Tool = "Gitleaks"; Status = "PASS"; Details = "0 secrets" }
} else {
    Write-Host "  [FAIL] Gitleaks: $gitleaksCount hardcoded secrets detected!" -ForegroundColor Red
    $gateFailed = $true
    $summaryResults += [PSCustomObject]@{ Tool = "Gitleaks"; Status = "FAIL"; Details = "$gitleaksCount secrets found" }
}

# ---------------------------------------------------------
# 2. Semgrep - SAST
# ---------------------------------------------------------
Write-Host "`n--> [2/4] Running Semgrep SAST Scanner..." -ForegroundColor Yellow
$semgrepJson = Join-Path $tempDir "semgrep.json"
$semgrepConfig = "auto"

if (Test-Path (Join-Path $resolvedProject "security\semgrep\semgrep-rules.yml")) {
    $semgrepConfig = (Join-Path $resolvedProject "security\semgrep\semgrep-rules.yml")
} elseif ($secureOpsRoot -and (Test-Path (Join-Path $secureOpsRoot "security\semgrep\semgrep-rules.yml"))) {
    $semgrepConfig = (Join-Path $secureOpsRoot "security\semgrep\semgrep-rules.yml")
}

# Check targets
$scanTargets = @()
foreach ($dirName in @("src", "backend", "frontend/src", "api")) {
    $cand = Join-Path $resolvedProject $dirName
    if (Test-Path $cand) {
        $scanTargets += $cand
    }
}
if ($scanTargets.Count -eq 0) {
    $scanTargets = @($resolvedProject)
}

$semgrepArgs = @("scan", "--config", "$semgrepConfig", "--json", "-o", "$semgrepJson") + $scanTargets
if (Get-Command "semgrep" -ErrorAction SilentlyContinue) {
    $semgrepProc = Start-Process -FilePath "semgrep" -ArgumentList $semgrepArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "semgrep_err.log")
} elseif ($hasDocker) {
    Write-Host "  [INFO] 'semgrep' CLI not found. Running via Docker container (returntocorp/semgrep)..." -ForegroundColor DarkGray
    $dockerArgs = @("run", "--rm", "-v", "${resolvedProject}:/src", "-v", "${tempDir}:/out", "returntocorp/semgrep", "semgrep", "scan", "--config", "auto", "--json", "-o", "/out/semgrep.json", "/src")
    $semgrepProc = Start-Process -FilePath "docker" -ArgumentList $dockerArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "semgrep_err.log")
} else {
    Write-Host "  [WARN] Neither Semgrep CLI nor Docker found on system. Skipping SAST scan." -ForegroundColor Yellow
}

$semgrepCount = 0
if (Test-Path $semgrepJson) {
    try {
        $rawSemgrep = Get-Content -Raw -Encoding UTF8 -Path $semgrepJson
        if ($rawSemgrep) {
            $parsedSemgrep = $rawSemgrep | ConvertFrom-Json
            if ($parsedSemgrep.results) {
                $semgrepCount = @($parsedSemgrep.results).Count
                foreach ($res in @($parsedSemgrep.results)) {
                    $relFile = $res.path.Replace("$resolvedProject\", "").Replace("$resolvedProject/", "")
                    $sev = 2
                    if ($res.extra.severity -eq "ERROR") { $sev = 3 }
                    elseif ($res.extra.severity -eq "WARNING") { $sev = 2 }
                    elseif ($res.extra.severity -eq "INFO") { $sev = 1 }

                    $findingsToIngest.Add([PSCustomObject]@{
                        applicationId = $targetAppId
                        title = "SAST: $($res.check_id)"
                        description = [string]$res.extra.message
                        severity = $sev
                        scanType = 0 # SAST
                        tool = "Semgrep"
                        filePath = $relFile
                        lineNumber = [int]$res.start.line
                        ruleId = [string]$res.check_id
                        fixAvailable = $false
                        remediationGuidance = "Refactor code to avoid this vulnerability pattern according to OWASP secure coding guidelines."
                    })
                }
            }
        }
    } catch {
        Write-Host "  [WARN] Failed to parse Semgrep JSON: $_" -ForegroundColor Yellow
    }
}

if ($semgrepCount -eq 0) {
    Write-Host "  [PASS] Semgrep: 0 blocking SAST vulnerabilities detected." -ForegroundColor Green
    $summaryResults += [PSCustomObject]@{ Tool = "Semgrep"; Status = "PASS"; Details = "0 vulnerabilities" }
} else {
    Write-Host "  [FAIL] Semgrep: $semgrepCount SAST violations found!" -ForegroundColor Red
    $gateFailed = $true
    $summaryResults += [PSCustomObject]@{ Tool = "Semgrep"; Status = "FAIL"; Details = "$semgrepCount violations" }
}

# ---------------------------------------------------------
# 3. Trivy - SCA & Dependency Scanner
# ---------------------------------------------------------
Write-Host "`n--> [3/4] Running Trivy Filesystem & Container Scanner..." -ForegroundColor Yellow
$trivyJson = Join-Path $tempDir "trivy.json"
$trivyConfig = $null

if (Test-Path (Join-Path $resolvedProject "security\trivy\trivy.yaml")) {
    $trivyConfig = Join-Path $resolvedProject "security\trivy\trivy.yaml"
} elseif ($secureOpsRoot -and (Test-Path (Join-Path $secureOpsRoot "security\trivy\trivy.yaml"))) {
    $trivyConfig = Join-Path $secureOpsRoot "security\trivy\trivy.yaml"
}

$trivyArgs = @("fs", "--severity", "CRITICAL,HIGH", "--format", "json", "-o", "$trivyJson")
if ($trivyConfig) {
    $trivyArgs += @("--config", "$trivyConfig")
}
$trivyArgs += "$resolvedProject"

if (Get-Command "trivy" -ErrorAction SilentlyContinue) {
    $trivyProc = Start-Process -FilePath "trivy" -ArgumentList $trivyArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "trivy_err.log")
} elseif ($hasDocker) {
    Write-Host "  [INFO] 'trivy' CLI not found. Running via Docker container (aquasec/trivy)..." -ForegroundColor DarkGray
    $dockerArgs = @("run", "--rm", "-v", "${resolvedProject}:/app", "-v", "${tempDir}:/out", "aquasec/trivy:latest", "fs", "--severity", "CRITICAL,HIGH", "--format", "json", "-o", "/out/trivy.json", "/app")
    $trivyProc = Start-Process -FilePath "docker" -ArgumentList $dockerArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "trivy_err.log")
} else {
    Write-Host "  [WARN] Neither Trivy CLI nor Docker found on system. Skipping vulnerability scan." -ForegroundColor Yellow
}

$trivyCount = 0
if (Test-Path $trivyJson) {
    try {
        $rawTrivy = Get-Content -Raw -Encoding UTF8 -Path $trivyJson
        if ($rawTrivy) {
            $parsedTrivy = $rawTrivy | ConvertFrom-Json
            if ($parsedTrivy.Results) {
                foreach ($res in @($parsedTrivy.Results)) {
                    if ($res.Vulnerabilities) {
                        foreach ($vuln in @($res.Vulnerabilities)) {
                            $trivyCount++
                            $sev = 2
                            if ($vuln.Severity -eq "CRITICAL") { $sev = 4 }
                            elseif ($vuln.Severity -eq "HIGH") { $sev = 3 }
                            elseif ($vuln.Severity -eq "MEDIUM") { $sev = 2 }
                            elseif ($vuln.Severity -eq "LOW") { $sev = 1 }

                            $relFile = $res.Target.Replace("$resolvedProject\", "").Replace("$resolvedProject/", "")
                            $fixText = if ($vuln.FixedVersion) { "Upgrade $($vuln.PkgName) to version $($vuln.FixedVersion)" } else { "Apply patch or update package." }

                            $findingsToIngest.Add([PSCustomObject]@{
                                applicationId = $targetAppId
                                title = "$($vuln.PkgName): $($vuln.VulnerabilityID)"
                                description = if ($vuln.Title) { "$($vuln.Title). $($vuln.Description)" } else { [string]$vuln.Description }
                                severity = $sev
                                scanType = 2 # Container / SCA
                                tool = "Trivy"
                                filePath = $relFile
                                ruleId = [string]$vuln.VulnerabilityID
                                cveId = [string]$vuln.VulnerabilityID
                                fixAvailable = [bool]($vuln.FixedVersion -ne $null -and $vuln.FixedVersion -ne "")
                                remediationGuidance = $fixText
                            })
                        }
                    }
                }
            }
        }
    } catch {
        Write-Host "  [WARN] Failed to parse Trivy JSON: $_" -ForegroundColor Yellow
    }
}

if ($trivyCount -eq 0) {
    Write-Host "  [PASS] Trivy: 0 CRITICAL or HIGH vulnerabilities detected." -ForegroundColor Green
    $summaryResults += [PSCustomObject]@{ Tool = "Trivy"; Status = "PASS"; Details = "0 High/Critical" }
} else {
    if ($TargetEnvironment -eq "Production") {
        Write-Host "  [FAIL] Trivy: $trivyCount Critical/High vulnerabilities detected in Production release!" -ForegroundColor Red
        $gateFailed = $true
        $summaryResults += [PSCustomObject]@{ Tool = "Trivy"; Status = "FAIL"; Details = "$trivyCount High/Critical CVEs" }
    } else {
        Write-Host "  [WARN] Trivy: $trivyCount High/Critical issues found but allowed in Development." -ForegroundColor Yellow
        $summaryResults += [PSCustomObject]@{ Tool = "Trivy"; Status = "WARN"; Details = "$trivyCount non-blocking in Dev" }
    }
}

# ---------------------------------------------------------
# 4. Checkov - Infrastructure-as-Code (IaC) Scanner
# ---------------------------------------------------------
Write-Host "`n--> [4/4] Running Checkov Infrastructure-as-Code Scanner..." -ForegroundColor Yellow
$checkovOutDir = Join-Path $tempDir "checkov_out"
New-Item -ItemType Directory -Path $checkovOutDir -Force | Out-Null

$checkovConfig = $null
if (Test-Path (Join-Path $resolvedProject "security\checkov\.checkov.yml")) {
    $checkovConfig = Join-Path $resolvedProject "security\checkov\.checkov.yml"
} elseif ($secureOpsRoot -and (Test-Path (Join-Path $secureOpsRoot "security\checkov\.checkov.yml"))) {
    $checkovConfig = Join-Path $secureOpsRoot "security\checkov\.checkov.yml"
}

$checkovArgs = @("-d", "$resolvedProject", "--output", "json", "--output-file-path", "$checkovOutDir", "--soft-fail")
if ($checkovConfig) {
    $checkovArgs += @("--config-file", "$checkovConfig")
}

if (Get-Command "checkov" -ErrorAction SilentlyContinue) {
    $checkovProc = Start-Process -FilePath "checkov" -ArgumentList $checkovArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "checkov_err.log")
} elseif ($hasDocker) {
    Write-Host "  [INFO] 'checkov' CLI not found. Running via Docker container (bridgecrew/checkov)..." -ForegroundColor DarkGray
    $dockerArgs = @("run", "--rm", "-v", "${resolvedProject}:/tf", "-v", "${checkovOutDir}:/out", "bridgecrew/checkov:latest", "-d", "/tf", "--output", "json", "--output-file-path", "/out", "--soft-fail")
    $checkovProc = Start-Process -FilePath "docker" -ArgumentList $dockerArgs -NoNewWindow -PassThru -Wait -RedirectStandardError (Join-Path $tempDir "checkov_err.log")
} else {
    Write-Host "  [WARN] Neither Checkov CLI nor Docker found on system. Skipping IaC scan." -ForegroundColor Yellow
}

$checkovCount = 0
$checkovJson = Join-Path $checkovOutDir "results_json.json"
if (Test-Path $checkovJson) {
    try {
        $rawCheckov = Get-Content -Raw -Encoding UTF8 -Path $checkovJson
        if ($rawCheckov) {
            $parsedCheckov = $rawCheckov | ConvertFrom-Json
            $failedChecks = @()
            if ($parsedCheckov -is [System.Array]) {
                foreach ($run in $parsedCheckov) {
                    if ($run.results -and $run.results.failed_checks) {
                        $failedChecks += @($run.results.failed_checks)
                    }
                }
            } elseif ($parsedCheckov.results -and $parsedCheckov.results.failed_checks) {
                $failedChecks = @($parsedCheckov.results.failed_checks)
            }
            
            $checkovCount = $failedChecks.Count
            foreach ($chk in $failedChecks) {
                $relFile = $chk.file_path.Replace("$resolvedProject\", "").Replace("$resolvedProject/", "")
                $lineNum = if ($chk.file_line_range) { [int]$chk.file_line_range[0] } else { $null }

                $findingsToIngest.Add([PSCustomObject]@{
                    applicationId = $targetAppId
                    title = "IaC: $($chk.check_id) - $($chk.check_name)"
                    description = [string]$chk.guideline
                    severity = 3 # High
                    scanType = 3 # IaC
                    tool = "Checkov"
                    filePath = $relFile
                    lineNumber = $lineNum
                    ruleId = [string]$chk.check_id
                    fixAvailable = $false
                    remediationGuidance = if ($chk.guideline) { [string]$chk.guideline } else { "Follow CIS cloud benchmarks and harden configuration." }
                })
            }
        }
    } catch {
        Write-Host "  [WARN] Failed to parse Checkov JSON: $_" -ForegroundColor Yellow
    }
}

if ($checkovCount -eq 0) {
    Write-Host "  [PASS] Checkov: 0 IaC policy violations detected." -ForegroundColor Green
    $summaryResults += [PSCustomObject]@{ Tool = "Checkov"; Status = "PASS"; Details = "0 violations" }
} else {
    if ($TargetEnvironment -eq "Production") {
        Write-Host "  [FAIL] Checkov: $checkovCount IaC policy violations detected!" -ForegroundColor Red
        $gateFailed = $true
        $summaryResults += [PSCustomObject]@{ Tool = "Checkov"; Status = "FAIL"; Details = "$checkovCount IaC violations" }
    } else {
        Write-Host "  [WARN] Checkov: $checkovCount policy violations detected in non-prod." -ForegroundColor Yellow
        $summaryResults += [PSCustomObject]@{ Tool = "Checkov"; Status = "WARN"; Details = "$checkovCount non-blocking in Dev" }
    }
}

# ---------------------------------------------------------
# 5. Ingest Findings to SecureOps API
# ---------------------------------------------------------
if ($apiOnline -and $targetAppId -and $findingsToIngest.Count -gt 0) {
    Write-Host "`n--> [Ingestion] Uploading $($findingsToIngest.Count) findings to SecureOps Portal..." -ForegroundColor Cyan
    try {
        $ingestPayload = $findingsToIngest | ConvertTo-Json -Depth 6
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($ingestPayload)
        $ingestResp = Invoke-RestMethod -Uri "$ApiUrl/api/security/findings/ingest-batch" -Method Post -Body $utf8Bytes -ContentType "application/json; charset=utf-8" -TimeoutSec 30
        Write-Host "  [SUCCESS] Uploaded $($ingestResp.Count) security findings to SecureOps Portal!" -ForegroundColor Green
        Write-Host "  [PORTAL]  View real-time dashboard: http://localhost:3000" -ForegroundColor Cyan
    } catch {
        $errMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errMsg = $reader.ReadToEnd()
            } catch {}
        }
        Write-Host "  [ERROR] Ingestion failed: $errMsg" -ForegroundColor Red
    }
} elseif ($apiOnline -and $findingsToIngest.Count -eq 0) {
    Write-Host "`n--> [Ingestion] 0 findings detected. Portal remains clean and Healthy!" -ForegroundColor Green
}

# ---------------------------------------------------------
# 6. Evaluation Summary
# ---------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " [SecureOps] Security Gate Evaluation Summary" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$summaryResults | Format-Table -AutoSize

# Cleanup temp files
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

if ($gateFailed) {
    Write-Host ">>> SECURITY GATE FAILED: Deployment blocked according to policy. <<<" -ForegroundColor Red
    Write-Host "    Remediate findings in http://localhost:3000 before promoting to $TargetEnvironment.`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ">>> SECURITY GATE PASSED: All requirements satisfied. Release approved. <<<`n" -ForegroundColor Green
    exit 0
}
