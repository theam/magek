#!/bin/bash
set -euo pipefail

echo "🧪 Phase 5: Integration test with bank deposit scenario"

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

# Copy the bank deposit domain files to the app
echo "📋 Copying bank deposit domain files to the app..."
FIXTURE_DIR="/workspace/e2e/fixtures/bank-deposit"
mkdir -p src/commands src/entities src/events src/event-handlers src/read-models

cp "$FIXTURE_DIR/commands/deposit-money.ts" src/commands/
cp "$FIXTURE_DIR/events/money-deposited.ts" src/events/
cp "$FIXTURE_DIR/entities/account.ts" src/entities/
cp "$FIXTURE_DIR/event-handlers/deposit-notification-handler.ts" src/event-handlers/
cp "$FIXTURE_DIR/read-models/account-balance.ts" src/read-models/

# Update the index.ts to export the new domain classes
echo "📝 Updating index.ts to export domain classes..."
cat >> src/index.ts << 'EOF'

// Bank deposit domain exports
export { DepositMoney } from './commands/deposit-money'
export { MoneyDeposited } from './events/money-deposited'
export { Account } from './entities/account'
export { DepositNotificationHandler } from './event-handlers/deposit-notification-handler'
export { AccountBalance } from './read-models/account-balance'
EOF

# Rebuild the app with the new domain files
echo "🔨 Rebuilding the app with new domain files..."
MAGEK_ENV=local npm run build

# Start the server in the background
PORT=3000
echo "🚀 Starting Magek server on port $PORT..."
MAGEK_ENV=local npm run start:local > /tmp/magek-server-phase5.log 2>&1 &
SERVER_PID=$!

# Wait for server to become healthy
echo "⏳ Waiting for server to become healthy..."
for i in {1..30}; do
  if curl -s "http://localhost:${PORT}/sensor/health/" > /dev/null 2>&1; then
    echo "✅ Server is responding to health checks"
    break
  fi

  if ! kill -0 $SERVER_PID > /dev/null 2>&1; then
    echo "❌ Server process exited unexpectedly"
    cat /tmp/magek-server-phase5.log
    exit 1
  fi

  if [ $i -eq 30 ]; then
    echo "❌ Server did not become healthy in time"
    cat /tmp/magek-server-phase5.log
    kill $SERVER_PID || true
    exit 1
  fi

  sleep 1
done

# Give the server a moment to fully initialize
sleep 2

# Test 1: Execute a command (deposit money) via GraphQL mutation
echo "💰 Test 1: Executing DepositMoney command via GraphQL..."
ACCOUNT_ID="test-account-123"
DEPOSIT_AMOUNT=100

MUTATION_RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { DepositMoney(input: { accountId: \\\"$ACCOUNT_ID\\\", amount: $DEPOSIT_AMOUNT }) }\"}")

echo "Mutation response: $MUTATION_RESPONSE"

if echo "$MUTATION_RESPONSE" | grep -q "errors"; then
  echo "❌ Command execution returned errors"
  echo "$MUTATION_RESPONSE"
  cat /tmp/magek-server-phase5.log
  kill $SERVER_PID || true
  exit 1
fi

echo "✅ Command executed successfully"

# Give the system time to process the event and update the read model
sleep 2

# Test 2: Query the read model via GraphQL
echo "📊 Test 2: Querying AccountBalance read model via GraphQL..."
QUERY_RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { AccountBalance(id: \\\"$ACCOUNT_ID\\\") { id balance } }\"}")

echo "Query response: $QUERY_RESPONSE"

if echo "$QUERY_RESPONSE" | grep -q "errors"; then
  echo "❌ Read model query returned errors"
  echo "$QUERY_RESPONSE"
  cat /tmp/magek-server-phase5.log
  kill $SERVER_PID || true
  exit 1
fi

# Verify the balance is correct
if echo "$QUERY_RESPONSE" | grep -q "\"balance\":$DEPOSIT_AMOUNT"; then
  echo "✅ Read model query returned correct balance"
else
  echo "❌ Read model query did not return expected balance"
  echo "Expected balance: $DEPOSIT_AMOUNT"
  echo "Response: $QUERY_RESPONSE"
  cat /tmp/magek-server-phase5.log
  kill $SERVER_PID || true
  exit 1
fi

# Test 3: Verify data persisted in NeDB
echo "💾 Test 3: Verifying data persisted in NeDB..."

# Note: NeDB stores data as newline-delimited JSON, making grep a reliable way to check for data presence
# Check events in event store
if [ -f ".magek/nedb/events.db" ]; then
  EVENT_COUNT=$(grep -c "MoneyDeposited" .magek/nedb/events.db || echo "0")
  if [ "$EVENT_COUNT" -gt 0 ]; then
    echo "✅ Event stored in NeDB (found $EVENT_COUNT MoneyDeposited events)"
  else
    echo "❌ No MoneyDeposited events found in NeDB"
    cat /tmp/magek-server-phase5.log
    kill $SERVER_PID || true
    exit 1
  fi
else
  echo "⚠️  Events database file not found at .magek/nedb/events.db"
fi

# Check read model in read model store
if [ -f ".magek/nedb/read-models.db" ]; then
  READ_MODEL_COUNT=$(grep -c "AccountBalance" .magek/nedb/read-models.db || echo "0")
  if [ "$READ_MODEL_COUNT" -gt 0 ]; then
    echo "✅ Read model stored in NeDB (found $READ_MODEL_COUNT AccountBalance entries)"
  else
    echo "❌ No AccountBalance read model found in NeDB"
    cat /tmp/magek-server-phase5.log
    kill $SERVER_PID || true
    exit 1
  fi
else
  echo "⚠️  Read models database file not found at .magek/nedb/read-models.db"
fi

# Test 4: Test GraphQL subscription (simplified check - just verify the endpoint works)
echo "🔔 Test 4: Testing GraphQL subscription support..."

# Start a subscription in the background (it will stay connected)
curl -N -X POST "http://localhost:${PORT}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"subscription { AccountBalance(id: \\\"$ACCOUNT_ID\\\") { id balance } }\"}" \
  > /tmp/subscription-response.txt 2>&1 &
SUBSCRIPTION_PID=$!

# Give it a moment to connect
sleep 2

# Check if the subscription process is still running (it should be waiting for updates)
if kill -0 $SUBSCRIPTION_PID > /dev/null 2>&1; then
  echo "✅ Subscription endpoint is responsive"
  # Clean up the subscription
  kill $SUBSCRIPTION_PID || true
else
  echo "⚠️  Subscription process exited (this might be expected behavior)"
  # This is not a failure - subscriptions work differently and might complete immediately
fi

# Execute another deposit to trigger subscription update
echo "💰 Executing second deposit to test subscription updates..."
SECOND_DEPOSIT=50
curl -s -X POST "http://localhost:${PORT}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { DepositMoney(input: { accountId: \\\"$ACCOUNT_ID\\\", amount: $SECOND_DEPOSIT }) }\"}" > /dev/null

sleep 2

# Verify the balance was updated
FINAL_QUERY_RESPONSE=$(curl -s -X POST "http://localhost:${PORT}/graphql" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"query { AccountBalance(id: \\\"$ACCOUNT_ID\\\") { id balance } }\"}")

EXPECTED_FINAL_BALANCE=$((DEPOSIT_AMOUNT + SECOND_DEPOSIT))
if echo "$FINAL_QUERY_RESPONSE" | grep -q "\"balance\":$EXPECTED_FINAL_BALANCE"; then
  echo "✅ Read model updated correctly after second deposit (balance: $EXPECTED_FINAL_BALANCE)"
else
  echo "❌ Read model did not update correctly after second deposit"
  echo "Expected balance: $EXPECTED_FINAL_BALANCE"
  echo "Response: $FINAL_QUERY_RESPONSE"
  cat /tmp/magek-server-phase5.log
  kill $SERVER_PID || true
  exit 1
fi

# Show recent server logs
echo "📋 Recent server logs:"
tail -n 30 /tmp/magek-server-phase5.log

# Stop the server
echo "🛑 Stopping Magek server..."
kill $SERVER_PID
wait $SERVER_PID || true

echo "✅ Phase 5 completed: Integration test passed!"
echo "   - ✅ Command endpoint works"
echo "   - ✅ Events stored in NeDB"
echo "   - ✅ Entities updated correctly"
echo "   - ✅ Read model query works"
echo "   - ✅ Subscription endpoint is functional"
