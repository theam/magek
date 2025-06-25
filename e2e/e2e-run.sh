#!/bin/bash
set -euo pipefail

echo "🚀 Starting E2E test for create-booster-ai"

# Wait for npm registry to be available
echo "⏳ Waiting for npm registry to be available..."
for i in {1..30}; do
  if npm ping --registry http://host.docker.internal:4873 > /dev/null 2>&1; then
    echo "✅ NPM registry is available"
    break
  fi
  echo "Waiting for registry... (attempt $i/30)"
  sleep 2
done

# Check if create-booster-ai package is available
echo "🔍 Checking if create-booster-ai is available..."
if ! npm view create-booster-ai --registry http://host.docker.internal:4873 > /dev/null 2>&1; then
  echo "❌ create-booster-ai package not found in registry"
  echo "Available packages:"
  curl -s http://host.docker.internal:4873/-/all | jq -r 'keys[]' 2>/dev/null || echo "Could not list packages"
  exit 1
fi

echo "✅ create-booster-ai package found in registry"

# Create test app using the CLI with flags to skip prompts
echo "📦 Creating test app..."
timeout 300 npm create booster-ai@latest test-app --skip-install --skip-git --description "Test app" 2>&1 || {
  echo "❌ Failed to create app. Trying without timeout..."
  npm create booster-ai@latest test-app-retry --skip-install --skip-git --description "Test app" 2>&1 || {
    echo "❌ CLI execution failed completely"
    echo "Debugging information:"
    npm config list
    npm view create-booster-ai --registry http://host.docker.internal:4873
    exit 1
  }
  # If retry worked, use the retry directory
  [ -d test-app-retry ] && mv test-app-retry test-app
}

if [ ! -d "test-app" ]; then
  echo "❌ test-app directory was not created"
  ls -la
  exit 1
fi

echo "🔍 Running validation tests..."

# Copy validation script to current directory for easier access
cp /work/tests/scaffold.spec.js ./

# Run comprehensive validation
node scaffold.spec.js test-app test-app

echo "🎉 E2E test completed successfully!"
echo "✅ create-booster-ai CLI works correctly"