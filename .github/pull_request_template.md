## DevSecOps Pull Request Checklist

### 1. Change Summary
<!-- Briefly explain what changes were made, why, and which issue or feature ticket it addresses. -->

- **Service / Area Modified**: [e.g., SecureOps.Api, Frontend, IaC, CI/CD]
- **Target Environment**: [Development | Staging | Production]

---

### 2. DevSecOps Verification Checklist
Please verify all mandatory quality and security checks prior to requesting review:

- [ ] **Automated Tests Passing**:
  - `dotnet test` passed (Unit & Integration tests).
  - `npm test` passed in `frontend/`.
- [ ] **Secret Hygiene**:
  - Ran `gitleaks dir --config .gitleaks.toml` locally with zero findings.
  - No plaintext credentials, private keys, or API tokens committed.
- [ ] **Static Code Analysis (SAST)**:
  - Ran `semgrep scan --config security/semgrep/semgrep-rules.yml`.
  - No new SQL injection, cryptographic, or XSS flaws introduced.
- [ ] **Software Supply Chain (SCA)**:
  - New dependencies vetted against Trivy/npm audit.
  - No unpatched `CRITICAL` vulnerabilities introduced.
- [ ] **Infrastructure & Container Hardening**:
  - Container runs as non-root unprivileged user (`appuser` / UID `10001`).
  - Read-only root filesystem where applicable.
  - Dockerfiles pass `checkov` security checks.

---

### 3. Security Gate Status
<!-- Run `powershell scripts/security-gate.ps1` or `./scripts/security-gate.sh` and paste output below -->
```text
[Paste Security Gate Summary Table Here]
```

---

### 4. Reviewer Sign-Off
- [ ] Peer Engineer Code Review approved
- [ ] DevSecOps / SecOps Lead Sign-off (mandatory for Production and security policy modifications)
