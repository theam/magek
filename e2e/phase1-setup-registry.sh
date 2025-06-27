#!/bin/bash
set -euo pipefail

echo "📦 Phase 1: Setting up Verdaccio registry and building packages"

# Start Verdaccio in the background
echo "🚀 Starting Verdaccio registry..."
verdaccio --config /etc/verdaccio/config.yaml &
VERDACCIO_PID=$!

# Wait for Verdaccio to be ready
echo "⏳ Waiting for Verdaccio to start..."
for i in {1..30}; do
  if curl -s http://localhost:4873 > /dev/null 2>&1; then
    echo "✅ Verdaccio is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Verdaccio failed to start"
    exit 1
  fi
  sleep 1
done

# Verify pnpm is available (required for Rush)
if ! command -v pnpm >/dev/null 2>&1; then
  echo "❌ pnpm is required but not found. Please install pnpm."
  exit 1
fi

echo "✅ pnpm found: $(pnpm --version)"

# Configure both npm and pnpm to use local registry
npm config set registry http://localhost:4873
pnpm config set registry http://localhost:4873

# Also set environment variable to ensure Rush uses the right registry
export NPM_CONFIG_REGISTRY=http://localhost:4873
export PNPM_REGISTRY=http://localhost:4873

# -------------------------------------------------------------
# Configure fake auth token for Verdaccio anonymous publishing
# The npm CLI requires an auth token even when Verdaccio is
# configured to accept anonymous publishes (max_users: -1).
# We add a fake token to satisfy this requirement.
# -------------------------------------------------------------

echo "🔑 Configuring auth token for local registry..."

# Set up fake auth token in npm config
npm config set //localhost:4873/:_authToken ci

# Also set it via pnpm
pnpm config set //localhost:4873/:_authToken ci

# Create temporary .npmrc files for Rush to use during publish
echo "📝 Setting up temporary .npmrc configuration for Rush..."

# Create a backup of the original Rush .npmrc files
cp /workspace/common/config/rush/.npmrc /workspace/common/config/rush/.npmrc.backup || true
cp /workspace/common/config/rush/.npmrc-publish /workspace/common/config/rush/.npmrc-publish.backup || true

# Update Rush .npmrc to point to local registry with auth token
cat > /workspace/common/config/rush/.npmrc << EOF
# Temporary configuration for E2E testing with local Verdaccio
registry=http://localhost:4873/
//localhost:4873/:_authToken=ci
always-auth=false
EOF

# Update Rush .npmrc-publish to point to local registry with auth token
cat > /workspace/common/config/rush/.npmrc-publish << EOF
# Temporary configuration for E2E testing with local Verdaccio
registry=http://localhost:4873/
//localhost:4873/:_authToken=ci
EOF

# Build and publish packages
echo "🔨 Building workspace packages..."
cd /workspace

# Install Rush if needed
if [ ! -f "common/scripts/install-run-rush.js" ]; then
  echo "❌ Rush scripts not found"
  exit 1
fi

# Update dependencies first to sync shrinkwrap file
echo "🔄 Updating dependencies to sync shrinkwrap file..."
node common/scripts/install-run-rush.js update

# Install dependencies
echo "📦 Installing dependencies..."
# Use --purge to handle store path changes in containerized environment
node common/scripts/install-run-rush.js install --purge

# Build all packages
echo "🔨 Building all packages..."
# Build all projects to ensure dist files are ready
node common/scripts/install-run-rush.js rebuild

# Publish packages to Verdaccio using Rush built-in publish command
echo "📤 Publishing packages to local registry using Rush publish..."
node common/scripts/install-run-rush.js publish --registry http://localhost:4873 --publish

echo "✅ Phase 1 completed: Registry is running and packages are published" 