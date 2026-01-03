# Testing Anchor Integration

## End-to-End Test

### 1. Start the Stack

Terminal 1 - Backend:
```bash
cd ~/anchor/backend
bun run src/index.ts
```

Terminal 2 - Frontend:
```bash
cd ~/anchor/frontend
bun dev
```

Terminal 3 - BLE Bridge:
```bash
cd ~/anchor/anchor-ble-bridge
./RUN.sh
```

### 2. Create and Dispatch Task

1. Open http://localhost:5173/admin
2. Create an incident (or use existing)
3. Generate tasks for the incident
4. Click "Dispatch" on a task

### 3. Verify Task Broadcast

In Terminal 3, you should see:
```
🚨 NEW TASK: Check levee integrity
   Inspect levee section B5 for structural issues
   Code: X7Y2
```

### 4. Verify on Phone

Open bitchat app on iPhone - you should see:
```
anchor_XXXXXXXX: TASK#123: Inspect levee section B5 for structural issues | Code: X7Y2
```

### 5. Accept Task from Phone

In bitchat app, type:
```
X7Y2 A
```

### 6. Verify Response Received

In Terminal 3, you should see:
```
[2:00:00 PM] 📩 Message from ea02bc80: X7Y2 A
   ✅ Task response detected: code=X7Y2 action=A
   Reported A from ea02bc8074a9d27c for task X7Y2
```

### 7. Verify in Admin UI

Refresh admin dashboard - task assignment should show volunteer accepted.

## Manual Testing Commands

### Send arbitrary message to mesh:
```bash
# While bridge is running, just type:
hello mesh
```

### Check backend API directly:
```bash
# List dispatched tasks
curl http://localhost:8000/api/tasks?status=dispatched

# Create test task
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Test description",
    "status": "dispatched",
    "acceptance_code": "TEST"
  }'
```

## Troubleshooting

### Bridge not seeing tasks
- Check backend is running: `curl http://localhost:8000/health`
- Check tasks exist: `curl http://localhost:8000/api/tasks?status=dispatched`
- Check polling logs in Terminal 3

### Tasks not appearing on phone
- Verify phone shows `anchor_XXXXXXXX` in peer list
- Check BLE connection is stable (no disconnect/reconnect cycles)
- Try sending manual message first to verify connection

### Responses not reaching backend
- Check response format: `<CODE> <ACTION>` (space-separated, uppercase)
- Valid actions: A, ACCEPT, D, DECLINE, DONE, COMPLETE
- Check Terminal 3 for "Task response detected" log
- Check backend logs for POST /api/tasks/:id/respond

## Expected Flow

```
Admin UI → Create/Dispatch Task
    ↓
Backend → Task status = 'dispatched'
    ↓ (HTTP poll every 5s)
Bridge → Polls backend
    ↓
Bridge → Broadcasts to BLE mesh
    ↓ (signed packet)
Phone → Receives task in bitchat
    ↓
Volunteer → Types "CODE A"
    ↓ (BLE packet)
Bridge → Receives response
    ↓
Bridge → Parses code + action
    ↓ (HTTP POST)
Backend → Records response in Convex
    ↓
Admin UI → Shows assignment status
```
