#!/bin/bash
set -euo pipefail

echo "🚀 Starting E2E Integration Tests for magek"
echo "=============================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source all phase scripts in sequence
echo "📦 Running Phase 1: Setting up Verdaccio registry and building packages..."
source "$SCRIPT_DIR/phase1-setup-registry.sh"

echo ""
echo "📦 Running Phase 2: Creating test app with npm create magek..."
source "$SCRIPT_DIR/phase2-create-app.sh"

echo ""
echo "🔍 Running Phase 3: Validating the generated project..."
source "$SCRIPT_DIR/phase3-validate-app.sh"

echo ""
echo "✅ All E2E tests completed successfully!"
echo "========================================"
