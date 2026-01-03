#!/bin/bash

BACKEND_URL="${ANCHOR_BACKEND_URL:-http://localhost:8000}"

echo "🧪 Testing Task Dispatch"
echo "📡 Backend: $BACKEND_URL"
echo ""

echo "1️⃣ Creating test task..."
TASK_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Emergency Task",
    "description": "Check water levels at checkpoint Alpha",
    "status": "dispatched",
    "acceptance_code": "TEST",
    "required_skills": ["first-aid"],
    "location": "Checkpoint Alpha"
  }')

TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
  echo "❌ Failed to create task"
  echo "Response: $TASK_RESPONSE"
  exit 1
fi

echo "✅ Created task: $TASK_ID"
echo ""

echo "2️⃣ Task will be picked up by bridge on next poll (within 5s)"
echo ""
echo "📱 Expected on BLE CLI:"
echo "   🚨 NEW TASK: Test Emergency Task"
echo "      Check water levels at checkpoint Alpha"
echo "      Code: TEST"
echo ""
echo "📱 Expected on phone:"
echo "   anchor-alerts: TASK#$TASK_ID: Check water levels at checkpoint Alpha | Code: TEST"
echo ""

echo "3️⃣ To test volunteer response, type in bitchat app:"
echo "   TEST A      (accept)"
echo "   TEST D      (decline)"
echo "   TEST DONE   (complete)"
echo ""

echo "4️⃣ To verify response was received:"
echo "   curl $BACKEND_URL/api/tasks/$TASK_ID"
echo ""

echo "⏱️  Waiting for bridge to poll and broadcast..."
