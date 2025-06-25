#!/bin/bash
set -euo pipefail

echo "📦 Phase 1: Setting up Verdaccio registry and building packages"

# Start Verdaccio in the background
echo "🚀 Starting Verdaccio registry..."
verdaccio --config /etc/verdaccio/config.yaml &

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

# Pack and publish packages
echo "📤 Publishing packages to local registry..."
for project_dir in packages/*; do
  if [ -d "$project_dir" ] && [ -f "$project_dir/package.json" ]; then
    cd "$project_dir"
    project_name=$(node -p "require('./package.json').name")
    
    # Get shouldPublish from rush.json
    should_publish=$(cd /workspace && node common/scripts/install-run-rush.js list --json | jq -r ".projects[] | select(.packageName == \"$project_name\") | .shouldPublish")
    
    if [ "$should_publish" = "true" ]; then
      echo "📦 Packing and publishing $project_name..."
      npm pack
      npm publish *.tgz --registry http://localhost:4873 || echo "⚠️  Failed to publish $project_name"
      rm -f *.tgz
    else
      echo "⏭️  Skipping $project_name (shouldPublish=false)"
    fi
    cd /workspace
  fi
done

echo "✅ Phase 1 completed: Registry is running and packages are published" 