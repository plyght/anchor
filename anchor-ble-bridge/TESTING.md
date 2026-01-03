# Testing Guide

## Quick Start

1. **Start backend**:
   ```bash
   cd ~/anchor/backend
   bun run src/index.ts
   ```

2. **Start BLE bridge**:
   ```bash
   cd ~/anchor/anchor-ble-bridge
   ./RUN.sh
   ```

3. **Run test**:
   ```bash
   # In another terminal
   cd ~/anchor/anchor-ble-bridge
   ./test-dispatch.sh
   ```

## What to Expect

### On BLE CLI Terminal

After running `test-dispatch.sh`, within 5 seconds you should see:

```
🚨 NEW TASK: Test Emergency Task
   Check water levels at checkpoint Alpha
   Code: TEST
```

### On Phone (bitchat app)

- **Peer list**: "anchor-alerts" appears
- **Message from anchor-alerts**:
  ```
  TASK#xxx: Check water levels at checkpoint Alpha | Code: TEST
  ```

### Testing Response

In bitchat app, type:
```
TEST A
```

BLE CLI should show:
```
[2:00:00 PM] 📩 Message from ea02bc80: TEST A
   ✅ Task response detected: code=TEST action=A
```

## Test Scripts

### `test-dispatch.sh`
- Creates a single test task
- Shows expected output
- Good for quick verification

### `test-full-cycle.sh`
- Full validation with health checks
- Requires `jq` installed
- Shows step-by-step verification

## Manual Testing

### Create Task via curl

```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual Test",
    "description": "Testing manual dispatch",
    "status": "dispatched",
    "acceptance_code": "MAN1"
  }'
```

### Send Arbitrary Message

While BLE CLI is running, just type:
```
hello volunteers!
```

Press Enter. All connected phones will receive it from "anchor-alerts".

### Check Dispatched Tasks

```bash
curl http://localhost:8000/api/tasks?status=dispatched | jq
```

### Verify Response Recorded

```bash
curl http://localhost:8000/api/tasks/<TASK_ID> | jq
```

Look for `task_assignments` array showing volunteer responses.

## Troubleshooting

### BLE CLI shows "anchor-alerts" but phone doesn't

**Issue**: Signature verification failing

**Fix**: Restart BLE CLI. Keys are regenerated on each start.

### Tasks not appearing on CLI

**Check**:
1. Backend running: `curl http://localhost:8000/health`
2. Tasks exist: `curl http://localhost:8000/api/tasks?status=dispatched`
3. Polling interval (5s delay is normal)

### Responses not reaching backend

**Check**:
1. Format is correct: `<CODE> <ACTION>` (space-separated, uppercase)
2. Valid actions: A, ACCEPT, D, DECLINE, DONE, COMPLETE
3. Backend logs show POST requests
4. CLI shows "Task response detected"

### Connection unstable (disconnect/reconnect)

**Causes**:
- Multiple devices using same peer ID
- Bluetooth interference
- Distance too far

**Fix**:
- Restart BLE CLI (generates new keys)
- Move devices closer
- Reduce Bluetooth device count nearby

## Performance Testing

### Latency Test

1. Note timestamp when task dispatched
2. Note timestamp when it appears on CLI
3. Expected: < 6 seconds (5s poll + processing)

### Load Test

Dispatch multiple tasks rapidly:

```bash
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/tasks \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"Task $i\",
      \"description\": \"Load test task $i\",
      \"status\": \"dispatched\",
      \"acceptance_code\": \"LD$(printf %02d $i)\"
    }"
  sleep 0.5
done
```

All 10 tasks should appear on CLI within ~10 seconds.

## Success Criteria

✅ "anchor-alerts" visible in bitchat peer list
✅ Tasks broadcast within 5 seconds of dispatch
✅ Messages appear on all connected phones
✅ Volunteer responses parsed correctly
✅ Backend receives responses via API
✅ No disconnects during operation
✅ Manual messages work bidirectionally

## Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| No "anchor-alerts" peer | Production/debug UUID mismatch | Verify bitchat app build matches bridge |
| Peer appears then disappears | Signature validation failing | Restart BLE CLI |
| Tasks don't broadcast | Backend not reachable | Check `ANCHOR_BACKEND_URL` env var |
| Responses ignored | Wrong format | Use `<CODE> <ACTION>` (uppercase, space-separated) |
| High latency | Polling interval | Normal - 5s is by design |
