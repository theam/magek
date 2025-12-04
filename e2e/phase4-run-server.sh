#!/bin/bash
set -euo pipefail

echo "🧪 Phase 4: Building the app and running the Magek server with NeDB"

APP_DIR_FILE="/tmp/app-directory.txt"
if [ ! -f "$APP_DIR_FILE" ]; then
  echo "❌ App directory file not found at $APP_DIR_FILE"
  exit 1
fi

APP_DIR=$(cat "$APP_DIR_FILE")
cd /work

if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory '$APP_DIR' does not exist"
  exit 1
fi

cd "$APP_DIR"

# Ensure registry is set to Verdaccio
npm config set registry http://localhost:4873
pnpm config set registry http://localhost:4873

# Install app dependencies from local registry
echo "📦 Installing app dependencies from local registry..."
npm install

# Build the generated app
echo "🔨 Building the generated app..."
MAGEK_ENV=local npm run build

# Start the local server in the background
PORT=3000
echo "🚀 Starting Magek server on port $PORT using NeDB adapters..."
MAGEK_ENV=local npm run start:local > /tmp/magek-server.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to become healthy..."
for i in {1..30}; do
  if curl -s "http://localhost:${PORT}/sensor/health/" > /dev/null 2>&1; then
    echo "✅ Server is responding to health checks"
    break
  fi

  if ! kill -0 $SERVER_PID > /dev/null 2>&1; then
    echo "❌ Server process exited unexpectedly"
    cat /tmp/magek-server.log
    exit 1
  fi

  if [ $i -eq 30 ]; then
    echo "❌ Server did not become healthy in time"
    cat /tmp/magek-server.log
    kill $SERVER_PID || true
    exit 1
  fi

  sleep 1
done

echo "📋 Recent server logs:"
tail -n 20 /tmp/magek-server.log

# Stop the server now that health has been verified
echo "🛑 Stopping Magek server..."
kill $SERVER_PID
wait $SERVER_PID || true

echo "✅ Phase 4 completed: Magek server built and validated"
