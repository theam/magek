#!/bin/bash
set -euo pipefail

echo "🔍 Phase 3: Validating the generated project"

# Get the app directory from previous phase
if [ -f "/tmp/app-directory.txt" ]; then
  APP_DIR=$(cat /tmp/app-directory.txt)
else
  echo "❌ App directory not found. Was phase 2 successful?"
  exit 1
fi

cd /work

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory '$APP_DIR' does not exist"
  ls -la
  exit 1
fi

echo "🔍 Validating app in directory: $APP_DIR"

# Run validation script if it exists
if [ -f "/work/tests/scaffold.spec.js" ]; then
  echo "📋 Running validation tests..."
  node /work/tests/scaffold.spec.js "$APP_DIR" "$APP_DIR"
else
  echo "⚠️  Validation script not found at /work/tests/scaffold.spec.js"
  echo "📋 Performing basic validation..."
  
  # Basic validation checks
  cd "$APP_DIR"
  
  # Check essential files exist
  REQUIRED_FILES=("package.json" "tsconfig.json" "src/index.ts")
  for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
      echo "✅ Found: $file"
    else
      echo "❌ Missing: $file"
      exit 1
    fi
  done
  
  # Validate git repository initialization
  if [ -d ".git" ]; then
    echo "✅ Git repository initialized"
  else
    echo "❌ Git repository not initialized"
    echo "🔧 Note: This may indicate an issue with create-booster-ai package"
    exit 1
  fi
  
  # Validate node_modules exists and is populated
  if [ -d "node_modules" ] && [ "$(ls -A node_modules)" ]; then
    echo "✅ Dependencies installed"
  else
    echo "❌ Dependencies not installed or node_modules empty"
    exit 1
  fi
  
  # Validate @booster-ai/cli is available
  if npm list @booster-ai/cli > /dev/null 2>&1; then
    echo "✅ @booster-ai/cli dependency found"
  else
    echo "❌ @booster-ai/cli dependency missing"
    exit 1
  fi
  
  # Validate npm works out of the box
  if npm run --silent > /dev/null 2>&1; then
    echo "✅ NPM scripts functional"
  else
    echo "❌ NPM scripts not working"
    exit 1
  fi
  
  # Check package.json has correct name
  PROJECT_NAME=$(node -p "require('./package.json').name")
  echo "📦 Project name: $PROJECT_NAME"
  
  # Check dependencies
  if [ -f "package.json" ]; then
    echo "📚 Dependencies found:"
    node -p "Object.keys(require('./package.json').dependencies || {}).join(', ')"
  fi
fi

echo "✅ Phase 3 completed: Project validation successful" 