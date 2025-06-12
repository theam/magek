#!/bin/bash
set -euo pipefail

echo "🚀 Starting E2E test for create-booster-ai"

# Create test app using the CLI
echo "📦 Creating test app..."
npm create booster-ai@latest test-app --yes

echo "🔍 Running validation tests..."

# Copy validation script to current directory for easier access
cp /work/tests/scaffold.spec.js ./

# Run comprehensive validation
node scaffold.spec.js test-app test-app

echo "🎉 E2E test completed successfully!"
echo "✅ create-booster-ai CLI works correctly"