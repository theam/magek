#!/bin/bash
set -euo pipefail

echo "📦 Phase 2: Creating test app with npm create magek"

# Ensure we're using the local registry (inherit from phase1 if sourced)
if [ -z "${NPM_CONFIG_REGISTRY:-}" ]; then
  npm config set registry http://localhost:4873
  pnpm config set registry http://localhost:4873
  export NPM_CONFIG_REGISTRY=http://localhost:4873
  export PNPM_REGISTRY=http://localhost:4873
fi

# Check if create-magek package is available
echo "🔍 Checking if create-magek is available..."
if ! npm view create-magek --registry http://localhost:4873 > /dev/null 2>&1; then
  echo "❌ create-magek package not found in registry"
  echo "Available packages:"
  curl -s http://localhost:4873/-/all | jq -r 'keys[]' 2>/dev/null || echo "Could not list packages"
  exit 1
fi

echo "✅ create-magek package found in registry"

# Create test app
cd /work

# Use the default template
echo "📦 Creating test-app with default template..."
npm create magek@latest test-app -- \
  --template /workspace/templates/default \
  --skip-install \
  --skip-git \
  --description "Test app"

APP_DIR="test-app"

# Verify app was created
if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory '$APP_DIR' was not created"
  ls -la
  exit 1
fi

# Install dependencies explicitly to ensure registry config is inherited
cd "$APP_DIR"
echo "📦 Installing dependencies..."
if ! npm install; then
  echo "❌ Failed to install dependencies"
  echo "Registry config: $(npm config get registry)"
  exit 1
fi
echo "✅ Dependencies installed successfully"

# Initialize git repository
echo "🔄 Initializing git repository..."
if ! git init; then
  echo "❌ Failed to initialize git repository"
  exit 1
fi
if ! git add -A; then
  echo "❌ Failed to add files to git"
  exit 1
fi
if ! git commit -m "Initial commit"; then
  echo "❌ Failed to create initial commit"
  echo "Git config: user.name=$(git config user.name), user.email=$(git config user.email)"
  exit 1
fi
echo "✅ Git repository initialized successfully"

# Return to parent directory
cd /work

# Store app directory for next phase
echo "$APP_DIR" > /tmp/app-directory.txt

echo "✅ Phase 2 completed: App created successfully in '$APP_DIR'" 