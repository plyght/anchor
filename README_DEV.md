# Anchor Development Guide

## Quick Start

Run everything with a single command:

```bash
bun dev
```

This starts:
- **Convex** - Database and backend functions
- **Backend** - REST API on http://localhost:3000
- **Frontend** - Web UI on http://localhost:5173
- **BLE Bridge** - Bluetooth mesh communication

Press `Ctrl+C` to stop all services.

## Configuration

Backend URL is configured in `.env`:
```
ANCHOR_BACKEND_URL=http://localhost:3000
```

For production, update to your deployed backend URL.

## Testing Message Dispatch

### 1. Create an Incident
```bash
bunx convex run incidents:create '{
  "title": "Flood Warning",
  "description": "Water rising in sector B",
  "incident_type": "flood",
  "severity": "high"
}'
```

### 2. Create a Task
```bash
bunx convex run tasks:create '{
  "incident_id": "<incident-id-from-step-1>",
  "title": "Check water levels",
  "description": "Monitor and report water levels immediately",
  "task_type": "assessment",
  "priority": "urgent"
}'
```

### 3. Dispatch Task
```bash
bunx convex run tasks:update '{
  "id": "<task-id-from-step-2>",
  "status": "dispatched"
}'
```

The task will appear on all bitchat devices within 5 seconds.

### 4. Respond from Bitchat
On your phone, type:
```
<CODE> A     # Accept
<CODE> D     # Decline
<CODE> DONE  # Complete
```

## Targeted Messages

To send to a specific volunteer:

```bash
# Get volunteer ID
bunx convex run volunteers:list | jq '.[] | {id: ._id, username: .bitchat_username}'

# Assign task to volunteer
bunx convex run tasks:update '{
  "id": "<task-id>",
  "assigned_volunteer_id": "<volunteer-id>",
  "status": "dispatched"
}'
```

The bridge will send a DM if the volunteer is discovered, otherwise broadcasts.

## Message Format

Tasks are sent as:
```
<Title>
<Description>
Reply: <CODE> A/D/DONE
```

Clean and simple, no emojis.

## Troubleshooting

**Backend offline:** Check backend logs in the terminal window

**Tasks not appearing:** Verify BLE bridge is running and backend URL is correct

**DM not received:** Ensure target volunteer has announced on mesh network
