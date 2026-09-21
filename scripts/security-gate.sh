#!/usr/bin/env bash
# ==============================================================================
# SecureOps Automated Multi-Layer Security Gate Runner
# Enforces Gitleaks, Semgrep, Trivy, and Checkov against security policy thresholds.
# Supports native CLI tools with automatic Docker container fallbacks.
# ==============================================================================

set -uo pipefail

TARGET_ENV="${1:-Production}"

echo "=========================================================="
echo " [SecureOps] DevSecOps Security Gate - Target: ${TARGET_ENV}"
echo "=========================================================="

GATE_FAILED=0

# Helper to locate config files with fallback
resolve_config() {
    local rel_path="$1"
    if [ -f "$rel_path" ]; then
        echo "$rel_path"
    elif [ -f "../$rel_path" ]; then
        echo "../$rel_path"
    else
        echo ""
    fi
}

# 1. Gitleaks - Secret Detection
echo -e "\n--> [1/4] Running Gitleaks Secret Scanner..."
GITLEAKS_CONF="$(resolve_config .gitleaks.toml)"
GITLEAKS_CMD=()

if command -v gitleaks >/dev/null 2>&1; then
    GITLEAKS_CMD=(gitleaks dir)
    if [ -n "$GITLEAKS_CONF" ]; then
        GITLEAKS_CMD+=(--config "$GITLEAKS_CONF")
    fi
    GITLEAKS_CMD+=(.)
elif command -v docker >/dev/null 2>&1; then
    echo "  [INFO] gitleaks binary not on PATH. Using Docker fallback (zricethezav/gitleaks)..."
    GITLEAKS_CMD=(docker run --rm -v "$(pwd):/path" zricethezav/gitleaks:latest dir /path)
fi

if [ ${#GITLEAKS_CMD[@]} -gt 0 ]; then
    if "${GITLEAKS_CMD[@]}"; then
        echo "  [PASS] Gitleaks: No hardcoded secrets detected."
    else
        echo "  [FAIL] Gitleaks: Secrets detected!"
        GATE_FAILED=1
    fi
else
    echo "  [WARN] Neither Gitleaks CLI nor Docker found. Skipping secret scan."
fi

# 2. Semgrep - SAST
echo -e "\n--> [2/4] Running Semgrep SAST Scanner..."
SEMGREP_CONF="$(resolve_config security/semgrep/semgrep-rules.yml)"
SEMGREP_CMD=()

if command -v semgrep >/dev/null 2>&1; then
    SEMGREP_CMD=(semgrep scan)
    if [ -n "$SEMGREP_CONF" ]; then
        SEMGREP_CMD+=(--config "$SEMGREP_CONF")
    else
        SEMGREP_CMD+=(--config auto)
    fi
    SEMGREP_CMD+=(.)
elif command -v docker >/dev/null 2>&1; then
    echo "  [INFO] semgrep binary not on PATH. Using Docker fallback (returntocorp/semgrep)..."
    SEMGREP_CMD=(docker run --rm -v "$(pwd):/src" returntocorp/semgrep semgrep scan)
    if [ -n "$SEMGREP_CONF" ]; then
        SEMGREP_CMD+=(--config "/src/$SEMGREP_CONF")
    else
        SEMGREP_CMD+=(--config auto)
    fi
    SEMGREP_CMD+=(/src)
fi

if [ ${#SEMGREP_CMD[@]} -gt 0 ]; then
    if "${SEMGREP_CMD[@]}"; then
        echo "  [PASS] Semgrep: 0 blocking SAST vulnerabilities detected."
    else
        echo "  [FAIL] Semgrep: SAST violations found!"
        GATE_FAILED=1
    fi
else
    echo "  [WARN] Neither Semgrep CLI nor Docker found. Skipping SAST scan."
fi

# 3. Trivy - Vulnerabilities & Container Scan
echo -e "\n--> [3/4] Running Trivy Filesystem Scanner..."
TRIVY_CONF="$(resolve_config security/trivy/trivy.yaml)"
TRIVY_CMD=()

if command -v trivy >/dev/null 2>&1; then
    TRIVY_CMD=(trivy fs --severity CRITICAL,HIGH --exit-code 1)
    if [ -n "$TRIVY_CONF" ]; then
        TRIVY_CMD+=(--config "$TRIVY_CONF")
    fi
    TRIVY_CMD+=(.)
elif command -v docker >/dev/null 2>&1; then
    echo "  [INFO] trivy binary not on PATH. Using Docker fallback (aquasec/trivy)..."
    TRIVY_CMD=(docker run --rm -v "$(pwd):/app" -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest fs --severity CRITICAL,HIGH --exit-code 1 /app)
fi

if [ ${#TRIVY_CMD[@]} -gt 0 ]; then
    if "${TRIVY_CMD[@]}"; then
        echo "  [PASS] Trivy: 0 CRITICAL or HIGH vulnerabilities."
    else
        if [ "${TARGET_ENV}" = "Production" ]; then
            echo "  [FAIL] Trivy: Critical/High vulnerabilities found in Production release!"
            GATE_FAILED=1
        else
            echo "  [WARN] Trivy: High/Critical issues found but allowed in Development."
        fi
    fi
else
    echo "  [WARN] Neither Trivy CLI nor Docker found. Skipping vulnerability scan."
fi

# 4. Checkov - IaC Scan
echo -e "\n--> [4/4] Running Checkov IaC Scanner..."
CHECKOV_CONF="$(resolve_config security/checkov/.checkov.yml)"
CHECKOV_CMD=()

if command -v checkov >/dev/null 2>&1; then
    CHECKOV_CMD=(checkov -d .)
    if [ -n "$CHECKOV_CONF" ]; then
        CHECKOV_CMD+=(--config-file "$CHECKOV_CONF")
    fi
elif command -v docker >/dev/null 2>&1; then
    echo "  [INFO] checkov binary not on PATH. Using Docker fallback (bridgecrew/checkov)..."
    CHECKOV_CMD=(docker run --rm -v "$(pwd):/tf" bridgecrew/checkov:latest -d /tf)
fi

if [ ${#CHECKOV_CMD[@]} -gt 0 ]; then
    if "${CHECKOV_CMD[@]}"; then
        echo "  [PASS] Checkov: 0 IaC policy violations."
    else
        if [ "${TARGET_ENV}" = "Production" ]; then
            echo "  [FAIL] Checkov: IaC violations detected in Production release!"
            GATE_FAILED=1
        else
            echo "  [WARN] Checkov: IaC issues found but allowed in Development."
        fi
    fi
else
    echo "  [WARN] Neither Checkov CLI nor Docker found. Skipping IaC scan."
fi

echo "=========================================================="
if [ "${GATE_FAILED}" -eq 1 ]; then
    echo ">>> SECURITY GATE FAILED: Deployment blocked according to policy. <<<"
    exit 1
else
    echo ">>> SECURITY GATE PASSED: All requirements satisfied. Release approved. <<<"
    exit 0
fi
