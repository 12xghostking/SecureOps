# ADR-002: Multi-Layer Security Gating & Shift-Left DevSecOps

## Status
Accepted

## Context
Traditional enterprise security reviews occur late in the software development lifecycle (pre-release gate or manual penetration testing). This "throw it over the fence" approach results in costly remediation cycles, emergency rollbacks, and delayed feature delivery. We needed a comprehensive, automated shift-left security model covering secrets, static source code, container CVEs, and infrastructure-as-code configurations.

## Decision
We implemented a **4-Layer Automated Security Gate**:

1. **Secret Detection (Gitleaks)**: Scans commits, staged files, and git history for high-entropy tokens, database passwords, and API keys (`.gitleaks.toml`).
2. **Static Application Security Testing - SAST (Semgrep)**: Runs custom rule definitions (`security/semgrep/semgrep-rules.yml`) targeting SQL injection in EF Core raw queries, weak cryptography (MD5/SHA1), insecure deserializers (`BinaryFormatter`), and unescaped HTML.
3. **Software Supply Chain & Vulnerability Scanner (Trivy)**: Scans filesystem dependencies (NuGet `.deps.json`, npm `package-lock.json`) and container images for unpatched CVEs (`security/trivy/trivy.yaml`).
4. **Infrastructure as Code Security (Checkov)**: Evaluates Terraform, Kubernetes, and Dockerfiles against CIS benchmarks and cloud security best practices (`security/checkov/.checkov.yml`).

### Enforcement Mechanism
- **Non-Production (Development/Staging)**: 0 Secrets, 0 Critical SAST, High vulnerabilities allowed with a 7-day remediation grace period.
- **Production Gate**: Hard block on any detected secrets, critical or high severity vulnerabilities across any layer (`scripts/security-gate.sh` and `security-gate.ps1`).

## Consequences

### Positive
- Prevents vulnerable code or credentials from ever reaching production.
- Generates standardized SARIF reports for GitHub Code Scanning integration.
- Provides immediate developer feedback in local terminals and pull requests.

### Negative / Trade-offs
- Adds approximately 10-30 seconds to the CI build cycle.
- Requires documented triage protocols for genuine false positives (`POST /api/security/findings/{id}/triage`).
