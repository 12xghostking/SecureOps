#!/usr/bin/env bash
# ==============================================================================
# SecureOps: DevSecOps Pipeline Installer for Target Repositories (Bash)
# Copies GitHub Actions security workflows, security configs, and gating scripts.
# ==============================================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================================${NC}"
echo -e "${CYAN} [SecureOps] DevSecOps Pipeline & Security Config Installer${NC}"
echo -e "${CYAN}==========================================================${NC}"

# Resolve source root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_PATH="${1:-}"

if [ -z "$TARGET_PATH" ]; then
    echo -e "\n${YELLOW}Please enter the path to your target project repository:${NC}"
    echo -e "${GRAY}Example: /home/user/projects/job-seek or ../job-seek${NC}"
    read -r -p "Project Path: " TARGET_PATH
fi

if [ -z "$TARGET_PATH" ]; then
    echo -e "${YELLOW}No target path provided. Operation aborted.${NC}"
    exit 1
fi

# Resolve absolute target path
mkdir -p "$TARGET_PATH"
TARGET_PATH="$(cd "$TARGET_PATH" && pwd)"

echo -e "\n${GRAY}Source: $SOURCE_ROOT${NC}"
echo -e "${GREEN}Target: $TARGET_PATH${NC}"

FILES=(
    ".github/workflows/security.yml"
    ".gitleaks.toml"
    "security/semgrep/semgrep-rules.yml"
    "security/trivy/trivy.yaml"
    "security/checkov/.checkov.yml"
    "security/policies/gate-thresholds.md"
    "scripts/security-gate.sh"
    "scripts/security-gate.ps1"
)

echo -e "\n${CYAN}--> Copying DevSecOps configuration and workflow assets...${NC}"

COPIED=0
for FILE in "${FILES[@]}"; do
    SRC="$SOURCE_ROOT/$FILE"
    DST="$TARGET_PATH/$FILE"

    if [ ! -f "$SRC" ]; then
        echo -e "  ${YELLOW}[SKIP] Missing source asset: $FILE${NC}"
        continue
    fi

    mkdir -p "$(dirname "$DST")"
    cp -f "$SRC" "$DST"
    chmod +x "$DST" 2>/dev/null || true
    COPIED=$((COPIED + 1))
    echo -e "  ${GREEN}[OK] Copied: $FILE${NC}"
done

echo -e "\n${CYAN}==========================================================${NC}"
echo -e "${GREEN} [SecureOps] Pipeline Installation Completed ($COPIED files copied)${NC}"
echo -e "${CYAN}==========================================================${NC}"

echo -e "\n${YELLOW}Next steps to activate automated GitHub Actions security scanning:${NC}"
echo -e "  1. Switch to your project directory:"
echo -e "     ${CYAN}cd \"$TARGET_PATH\"${NC}"
echo -e "\n  2. Stage and commit the DevSecOps files:"
echo -e "     ${CYAN}git add .github security scripts .gitleaks.toml${NC}"
echo -e "     ${CYAN}git commit -m \"chore: add SecureOps DevSecOps security pipeline and configs\"${NC}"
echo -e "\n  3. Push to your repository (main or master):"
echo -e "     ${CYAN}git push${NC}"
echo -e "\n  4. (Optional) Run the security gate locally:"
echo -e "     ${CYAN}./scripts/security-gate.sh Production${NC}"
echo -e "\n${GREEN}All workflows trigger on both [main, master] branches!${NC}"
