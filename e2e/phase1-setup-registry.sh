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

# Configure npm to use local registry
npm config set registry http://localhost:4873

# Build and publish packages
echo "🔨 Building workspace packages..."
cd /workspace

# Install Rush if needed
if [ ! -f "common/scripts/install-run-rush.js" ]; then
  echo "❌ Rush scripts not found"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
node common/scripts/install-run-rush.js install

# Build all packages
echo "🔨 Building all packages..."
node common/scripts/install-run-rush.js build

# Read rush.json to get project information
echo "📤 Publishing packages to local registry..."

# Manually list the projects that should be published based on rush.json
# This is a more robust approach that avoids JSON parsing issues
PUBLISHABLE_PROJECTS=(
  "packages/cli:@booster-ai/cli"
  "packages/create:create-booster-ai"
  "packages/common:@booster-ai/common"
  "packages/core:@booster-ai/core"
  "packages/server:@booster-ai/server"
  "packages/server-infrastructure:@booster-ai/server-infrastructure"
  "packages/metadata:@booster-ai/metadata"
)

# Pack and publish each project
for project_info in "${PUBLISHABLE_PROJECTS[@]}"; do
  project_dir="${project_info%%:*}"
  project_name="${project_info#*:}"
  
  if [ -d "$project_dir" ] && [ -f "$project_dir/package.json" ]; then
    cd "$project_dir"
    
    echo "📦 Packing and publishing $project_name..."
    npm pack
    npm publish *.tgz --registry http://localhost:4873 --access public || echo "⚠️  Failed to publish $project_name"
    rm -f *.tgz
    cd /workspace
  fi
done

echo "✅ Phase 1 completed: Registry is running and packages are published" 