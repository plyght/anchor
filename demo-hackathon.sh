#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "🌊 ANCHOR HACKATHON DEMO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Finding volunteer 'plight'..."
VOLUNTEER_ID=$(bunx convex run volunteers:list | jq -r '.[] | select(.bitchat_username == "plight") | ._id' | head -1)

if [ -z "$VOLUNTEER_ID" ]; then
    echo "❌ Volunteer 'plight' not found!"
    echo "💡 Creating volunteer 'plight'..."
    VOLUNTEER_ID=$(bunx convex run volunteers:create '{
        "full_name": "Demo Volunteer",
        "bitchat_username": "plight",
        "skills": ["first_aid", "search_rescue"],
        "current_status": "online"
    }' | tr -d '"')
fi

echo "✅ Volunteer ID: $VOLUNTEER_ID"
echo ""

echo "🚨 Creating Karachi flood incident..."
INCIDENT_ID=$(bunx convex run incidents:create '{
  "title": "Karachi Flood Emergency",
  "description": "Heavy rainfall detected. Water levels critical in multiple sectors.",
  "incident_type": "flood",
  "severity": "critical",
  "location": {
    "lat": 24.8608,
    "lon": 67.0104,
    "address": "Karachi, Pakistan"
  },
  "trigger_data": {
    "source": "ml_model_demo",
    "confidence": 94.1,
    "weather": {
      "pressure": 997.8,
      "precipitation": 1.35,
      "humidity": 96.2
    }
  }
}' | tr -d '"')

echo "✅ Incident created: $INCIDENT_ID"
echo ""

echo "📢 Creating broadcast task (to all volunteers)..."
BROADCAST_TASK_ID=$(bunx convex run tasks:create "{
  \"incident_id\": \"$INCIDENT_ID\",
  \"title\": \"CRITICAL FLOOD ALERT - EVACUATE NOW\",
  \"description\": \"Severe flooding in Karachi. All residents in affected areas must evacuate immediately to higher ground. Water levels rising fast.\",
  \"task_type\": \"evacuation\",
  \"priority\": \"urgent\"
}" | tr -d '"')

BROADCAST_CODE=$(bunx convex run tasks:get "{\"id\": \"$BROADCAST_TASK_ID\"}" | jq -r '.acceptance_code')
echo "✅ Broadcast task created"
echo "   Code: $BROADCAST_CODE"
echo ""

echo "🎯 Creating targeted task (to plight only)..."
TARGETED_TASK_ID=$(bunx convex run tasks:create "{
  \"incident_id\": \"$INCIDENT_ID\",
  \"title\": \"ASSIGNED: Guide Evacuation Operations\",
  \"description\": \"Help residents evacuate safely to designated shelter at Community Center. Prioritize elderly and disabled. Report status.\",
  \"task_type\": \"evacuation\",
  \"priority\": \"urgent\"
}" | tr -d '"')

bunx convex run tasks:update "{
  \"id\": \"$TARGETED_TASK_ID\",
  \"assigned_volunteer_id\": \"$VOLUNTEER_ID\"
}" > /dev/null

TARGETED_CODE=$(bunx convex run tasks:get "{\"id\": \"$TARGETED_TASK_ID\"}" | jq -r '.acceptance_code')
echo "✅ Targeted task created and assigned to plight"
echo "   Code: $TARGETED_CODE"
echo ""

echo "🚀 Dispatching tasks to BLE mesh..."
TIMESTAMP=$(date +%s)000

bunx convex run tasks:update "{
  \"id\": \"$BROADCAST_TASK_ID\",
  \"status\": \"dispatched\",
  \"dispatched_at\": $TIMESTAMP
}" > /dev/null

bunx convex run tasks:update "{
  \"id\": \"$TARGETED_TASK_ID\",
  \"status\": \"dispatched\",
  \"dispatched_at\": $TIMESTAMP
}" > /dev/null

echo "✅ Both tasks dispatched!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 DEMO READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Within 5 seconds, you should see on bitchat devices:"
echo ""
echo "📢 BROADCAST (to everyone):"
echo "   CRITICAL FLOOD ALERT - EVACUATE NOW"
echo "   Severe flooding in Karachi. All residents must evacuate..."
echo "   Reply: $BROADCAST_CODE A/D/DONE"
echo ""
echo "🎯 DIRECT MESSAGE (to plight only):"
echo "   ASSIGNED: Guide Evacuation Operations"
echo "   Help residents evacuate safely to designated shelter..."
echo "   Reply: $TARGETED_CODE A/D/DONE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To respond from bitchat app, type:"
echo "  $BROADCAST_CODE A    (accept broadcast task)"
echo "  $TARGETED_CODE A     (accept your assigned task)"
echo ""
