#!/usr/bin/env bash
# SecureOps Automated Multi-Layer Security Gate Runner
# Enforces Gitleaks, Semgrep, Trivy, and Checkov against security policy thresholds.

set -euo pipefail

TARGET_ENV="${1:-Production}"

echo "=========================================================="
echo " [SecureOps] DevSecOps Security Gate - Target: ${TARGET_ENV}"
echo "=========================================================="

GATE_FAILED=0

# 1. Gitleaks - Secret Detection
echo -e "\n--> [1/4] Running Gitleaks Secret Scanner..."
if gitleaks dir --config .gitleaks.toml; then
    echo "  [PASS] Gitleaks: No hardcoded secrets detected."
else
    echo "  [FAIL] Gitleaks: Secrets detected!"
    GATE_FAILED=1
fi

# 2. Semgrep - SAST
echo -e "\n--> [2/4] Running Semgrep SAST Scanner..."
if semgrep scan --config security/semgrep/semgrep-rules.yml src frontend/src; then
    echo "  [PASS] Semgrep: 0 blocking SAST vulnerabilities detected."
else
    echo "  [FAIL] Semgrep: SAST violations found!"
    GATE_FAILED=1
fi

# 3. Trivy - Vulnerabilities & Container Scan
echo -e "\n--> [3/4] Running Trivy Filesystem Scanner..."
if trivy fs --config security/trivy/trivy.yaml --severity CRITICAL,HIGH --exit-code 1 .; then
    echo "  [PASS] Trivy: 0 CRITICAL or HIGH vulnerabilities."
else
    if [ "${TARGET_ENV}" = "Production" ]; then
        echo "  [FAIL] Trivy: Critical/High vulnerabilities found in Production release!"
        GATE_FAILED=1
    else
        echo "  [WARN] Trivy: High/Critical issues found but allowed in Development."
    fi
fi

# 4. Checkov - IaC Scan
echo -e "\n--> [4/4] Running Checkov IaC Scanner..."
if checkov --config-file security/checkov/.checkov.yml -d .; then
    echo "  [PASS] Checkov: 0 IaC policy violations."
else
    if [ "${TARGET_ENV}" = "Production" ]; then
        echo "  [FAIL] Checkov: IaC violations detected in Production release!"
        GATE_FAILED=1
    else
        echo "  [WARN] Checkov: IaC issues found but allowed in Development."
    fi
fi

echo "=========================================================="
if [ "${GATE_FAILED}" -eq 1 ]; then
    echo ">>> SECURITY GATE FAILED: Deployment blocked according to policy. <<<"
    exit 1
else
    echo ">>> SECURITY GATE PASSED: All requirements satisfied. Release approved. <<<"
    exit 0
fi
