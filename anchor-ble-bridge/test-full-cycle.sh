#!/bin/bash

BACKEND_URL="${ANCHOR_BACKEND_URL:-http://localhost:8000}"

echo "🧪 Full Cycle Test: Server → BLE → Server"
echo "📡 Backend: $BACKEND_URL"
echo ""

check_command() {
  if ! command -v $1 &> /dev/null; then
    echo "❌ $1 not found. Please install it first."
    exit 1
  fi
}

check_command curl
check_command jq

echo "Step 1: Check backend is running..."
if ! curl -s "$BACKEND_URL/health" &> /dev/null; then
  echo "❌ Backend not reachable at $BACKEND_URL"
  echo "   Start it with: cd ~/anchor/backend && bun run src/index.ts"
  exit 1
fi
echo "✅ Backend is up"
echo ""

echo "Step 2: Create test task..."
TASK_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Evacuation Alert",
    "description": "Assist evacuation at Main St & 5th Ave",
    "status": "dispatched",
    "acceptance_code": "EV42",
    "required_skills": ["navigation"],
    "location": "Main St & 5th Ave"
  }')

TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '._id' 2>/dev/null)

if [ -z "$TASK_ID" ] || [ "$TASK_ID" = "null" ]; then
  echo "❌ Failed to create task"
  echo "Response: $TASK_RESPONSE"
  exit 1
fi

echo "✅ Task created: $TASK_ID"
echo "   Code: EV42"
echo ""

echo "Step 3: Wait for bridge to poll (5s)..."
sleep 6
echo ""

echo "Step 4: Verify task was broadcast"
echo "   👉 Check BLE CLI output for:"
echo "      🚨 NEW TASK: Evacuation Alert"
echo "      Assist evacuation at Main St & 5th Ave"
echo "      Code: EV42"
echo ""

echo "Step 5: Simulate volunteer response from phone"
echo "   📱 In bitchat app, type: EV42 A"
echo ""
echo "   Or test the parsing logic locally:"
echo "   echo 'EV42 A' | ... (would need CLI update to support stdin)"
echo ""

echo "Step 6: Check task status"
echo "   curl $BACKEND_URL/api/tasks/$TASK_ID | jq"
echo ""

echo "✅ Test task created and dispatched!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify 'anchor-alerts' peer appears on phone"
echo "   2. Verify task message appears in bitchat"
echo "   3. Type 'EV42 A' in bitchat"
echo "   4. Check BLE CLI for 'Task response detected'"
echo "   5. Verify backend received response"
