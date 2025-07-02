#!/bin/bash
set -euo pipefail

echo "📦 Phase 2: Creating test app with npm create booster-ai"

# Ensure we're using the local registry (inherit from phase1 if sourced)
if [ -z "${NPM_CONFIG_REGISTRY:-}" ]; then
  npm config set registry http://localhost:4873
  pnpm config set registry http://localhost:4873
  export NPM_CONFIG_REGISTRY=http://localhost:4873
  export PNPM_REGISTRY=http://localhost:4873
fi

# Check if create-booster-ai package is available
echo "🔍 Checking if create-booster-ai is available..."
if ! npm view create-booster-ai --registry http://localhost:4873 > /dev/null 2>&1; then
  echo "❌ create-booster-ai package not found in registry"
  echo "Available packages:"
  curl -s http://localhost:4873/-/all | jq -r 'keys[]' 2>/dev/null || echo "Could not list packages"
  exit 1
fi

echo "✅ create-booster-ai package found in registry"

# Create test app
cd /work

# Use the default template
echo "📦 Creating test-app with default template..."
export CI=true
npm create booster-ai@latest test-app \
  --template /workspace/templates/default \
  --description "Test app" \
  --non-interactive

APP_DIR="test-app"

# Verify app was created
if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory '$APP_DIR' was not created"
  ls -la
  exit 1
fi

# Store app directory for next phase
echo "$APP_DIR" > /tmp/app-directory.txt

echo "✅ Phase 2 completed: App created successfully in '$APP_DIR'" 