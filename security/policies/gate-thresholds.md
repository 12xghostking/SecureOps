# SecureOps DevSecOps Quality & Security Gate Policies

This document formalizes the multi-tier automated security gate policies enforced by SecureOps across continuous integration (CI) and continuous delivery/deployment (CD) pipelines.

---

## 1. Security Gate Policy Matrix

| Scanner Tool | Scan Type | Target Scope | Non-Production Gate | Production Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Gitleaks** | Secret Detection | Git history, PR commits, config files | **0 Secrets** (Hard Block) | **0 Secrets** (Hard Block) |
| **Semgrep** | SAST (Static Analysis) | C#, TypeScript, JavaScript, SQL | Max 0 Critical, ≤ 5 High | **0 Critical, 0 High** (Hard Block) |
| **Trivy** | Container & SCA | OS packages, NuGet, npm packages | Max 0 Critical, ≤ 3 High | **0 Critical, 0 High** (Hard Block) |
| **Checkov** | IaC Security | Terraform, Kubernetes, Dockerfiles | Max 0 Critical, ≤ 2 High | **0 Critical, 0 High** (Hard Block) |

---

## 2. Severity Definitions & Remediation SLAs

1. **Critical Severity (CVSS 9.0 - 10.0)**:
   - *Characteristics*: Actively exploitable remote code execution (RCE), unauthenticated authentication bypass, exposed production credentials, or root-privileged container execution without security boundaries.
   - *SLA*: Remediation required within **24 hours**.
   - *Gate Action*: **Immediate hard pipeline block**. Rollback triggered if detected in active runtime.

2. **High Severity (CVSS 7.0 - 8.9)**:
   - *Characteristics*: Authenticated privilege escalation, stored Cross-Site Scripting (XSS), unencrypted sensitive data in transit/rest, missing network security policies.
   - *SLA*: Remediation required within **7 calendar days**.
   - *Gate Action*: Allowed in Development/Staging with automated tracking ticket; blocked for Production release.

3. **Medium Severity (CVSS 4.0 - 6.9)**:
   - *Characteristics*: Information disclosure, missing rate limiting, CSRF on non-mutating endpoints, verbose error logs.
   - *SLA*: Remediation within **30 calendar days**.
   - *Gate Action*: Informational warning; does not block deployment.

4. **Low / Informational (CVSS 0.0 - 3.9)**:
   - *Characteristics*: Code quality issues, minor style deviations, hardening recommendations.
   - *SLA*: Next scheduled sprint refactor.

---

## 3. Triage & Exception Protocol

If a security finding is identified as a **False Positive** or requires an architectural **Temporary Exception**:
1. All overrides MUST be submitted via the SecureOps API (`POST /api/security/findings/{id}/triage`) or the UI.
2. The triage record must specify:
   - `NewStatus`: `FalsePositive` or `Suppressed`.
   - `TriagedBy`: Corporate email of authorized SecOps Lead or Principal Engineer.
   - `Notes`: Comprehensive business justification, compensating controls, and expiration date (max 30 days).
3. Every triage action creates an immutable record in `AuditLogEntity` with timestamp, user identity, and change diff.
