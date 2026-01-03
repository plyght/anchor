# Convex Bridge Integration Guide

**Version:** 2.0  
**Date:** 2026-01-02  
**Status:** Production Ready

---

## Overview

This document describes how to integrate bitchat-terminal with Anchor's Convex backend to enable bidirectional task dispatch between the web application and the Bluetooth mesh network.

**Architecture Update:** Anchor migrated from Supabase to Convex. The bridge now uses HTTP polling instead of PostgreSQL LISTEN/NOTIFY.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB APPLICATION (React)                       │
│                    Convex Reactive Queries                       │
└────────────────────┬────────────────────────────────────────────┘
                     │ Convex Client SDK
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONVEX (Serverless Backend)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  - tasks: id, title, acceptance_code, status             │   │
│  │  - task_assignments: volunteer responses                 │   │
│  │  - mesh_messages: bidirectional message log              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP API (polling)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              BITCHAT-TERMINAL (Rust Bridge Process)             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Polls Convex: GET tasks?status=dispatched             │   │
│  │  Broadcasts to mesh via BLE                             │   │
│  │  Receives responses from mesh                           │   │
│  │  Updates Convex: POST mutation (task status)            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Bluetooth LE
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BITCHAT MESH NETWORK                          │
│   (iOS/Android phones, other Rust terminals via BLE)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Outbound (Web App → Mesh)

1. **Admin creates task** in web dashboard
2. **Convex mutation** inserts task with `status='pending'`
3. **Admin dispatches task** via UI → updates `status='dispatched'`
4. **Bridge polls Convex** every N seconds for tasks where `status='dispatched'`
5. **Bridge formats message**: `"TASK#3: Check levee B5 | Code: X7Y2"`
6. **Bridge broadcasts** to mesh via Bluetooth LE
7. **Message propagates** through mesh network (TTL=7)

### Inbound (Mesh → Web App)

1. **Volunteer receives task** on mobile device
2. **Volunteer responds**: `"X7Y2 A"` (Accept) or `"X7Y2 D"` (Decline)
3. **Bridge receives** response via Bluetooth LE
4. **Bridge validates** acceptance code against active tasks
5. **Bridge calls Convex mutation**: Update task status + create task_assignment
6. **Web app updates** in real-time via Convex reactive query

---

## Installation

### Prerequisites

- Rust 1.85+
- Bun 1.0+
- Convex account with deployed Anchor functions
- Bluetooth LE adapter (for bridge device)

### 1. Setup Anchor (Convex)

```bash
cd ~/anchor

bunx convex dev

bunx convex deploy --prod
```

Note the `CONVEX_URL` from output (e.g., `https://your-project.convex.cloud`).

### 2. Build bitchat-terminal with Bridge Support

```bash
cd ~/bitchat-terminal

cargo build --release
```

### 3. Configure Environment Variables

Create `.env` in bitchat-terminal directory:

```bash
CONVEX_URL=https://your-project.convex.cloud
BRIDGE_MODE=true
POLL_INTERVAL_SECS=5
RUST_LOG=info
```

### 4. Run Bridge

```bash
cd ~/bitchat-terminal

sudo -E ./target/release/bitchat --bridge
```

**Note:** `sudo` required for Bluetooth LE access. `-E` preserves environment variables.

---

## Convex API Endpoints

### Query: List Dispatched Tasks

**Endpoint:** `POST https://your-project.convex.cloud/api/query`

**Payload:**
```json
{
  "path": "tasks:list",
  "args": {
    "status": "dispatched"
  }
}
```

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_abc123",
      "incident_id": "inc_456",
      "title": "Check levee integrity",
      "acceptance_code": "X7Y2",
      "status": "dispatched",
      "task_type": "assessment",
      "priority": "urgent",
      "dispatched_at": 1704211200000
    }
  ]
}
```

### Mutation: Update Task Status

**Endpoint:** `POST https://your-project.convex.cloud/api/mutation`

**Payload:**
```json
{
  "path": "tasks:update",
  "args": {
    "id": "task_abc123",
    "status": "accepted",
    "assigned_volunteer_id": "vol_xyz789",
    "accepted_at": 1704211260000
  }
}
```

### Mutation: Create Task Assignment

**Endpoint:** `POST https://your-project.convex.cloud/api/mutation`

**Payload:**
```json
{
  "path": "task_assignments:create",
  "args": {
    "task_id": "task_abc123",
    "volunteer_id": "vol_xyz789",
    "acceptance_code": "X7Y2",
    "status": "accepted",
    "response_message": "En route",
    "responded_at": 1704211260000
  }
}
```

### Mutation: Log Mesh Message

**Endpoint:** `POST https://your-project.convex.cloud/api/mutation`

**Payload:**
```json
{
  "path": "mesh_messages:create",
  "args": {
    "direction": "outbound",
    "message_content": "TASK#3: Check levee | Code: X7Y2",
    "task_id": "task_abc123"
  }
}
```

---

## Bridge Configuration

### Command Line Flags

```bash
bitchat --bridge           # Enable bridge mode (no terminal UI)
bitchat --bridge -d        # Bridge mode with connection debug
bitchat --bridge -dd       # Bridge mode with full packet inspection
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONVEX_URL` | Yes | - | Convex deployment URL |
| `BRIDGE_MODE` | No | `false` | Enable bridge mode |
| `POLL_INTERVAL_SECS` | No | `5` | Task polling interval |
| `RUST_LOG` | No | `info` | Log level (trace/debug/info/warn/error) |

---

## Task Response Codes

Volunteers respond to tasks using acceptance codes:

| Response | Action | Task Status | Description |
|----------|--------|-------------|-------------|
| `X7Y2 A` | Accept | `accepted` | Volunteer accepts task |
| `X7Y2 D` | Decline | `pending` | Volunteer declines, stays available |
| `X7Y2 DONE` | Complete | `completed` | Task finished |
| `X7Y2 HELP` | Request Help | `in_progress` | Volunteer needs assistance |

**Format:** `<CODE> <ACTION>` where CODE is 4 alphanumeric characters (uppercase).

---

## Testing

### 1. Test Task Dispatch (Web → Mesh)

**Terminal 1: Start Bridge**
```bash
cd ~/bitchat-terminal
sudo -E ./target/release/bitchat --bridge -d
```

**Terminal 2: Create and Dispatch Task**
```bash
cd ~/anchor
bunx convex run tasks:create '{
  "incident_id": "<incident-id>",
  "title": "Test Task",
  "task_type": "assessment",
  "priority": "medium",
  "acceptance_code": "TEST"
}'

bunx convex run tasks:update '{
  "id": "<task-id>",
  "status": "dispatched"
}'
```

**Expected:** Bridge logs show task received and broadcast to mesh.

### 2. Test Response (Mesh → Web)

**Mobile Device or Terminal 3:**
```bash
Send mesh message: "TEST A"
```

**Expected:** 
- Bridge logs show response parsed
- Convex dashboard shows task status = `accepted`
- task_assignments table has new entry

### 3. Integration Test Script

```bash
cd ~/anchor
bun test test/bridge-integration.test.ts
```

---

## Monitoring

### Bridge Logs

```bash
[CONVEX] Starting task polling (interval: 5s)
[CONVEX] Found 1 dispatched task(s)
[CONVEX] Dispatching task: Check levee (Code: X7Y2)
[BLE] Broadcasting task message to mesh
[BLE] Received message from @alice: X7Y2 A
[BRIDGE] Parsed response: accept (Code: X7Y2)
[CONVEX] Updated task task_abc123 to status 'accepted'
[CONVEX] Recorded accept response for task task_abc123
```

### Convex Dashboard

1. **Functions Tab:** Monitor query/mutation call counts
2. **Logs Tab:** View function execution logs
3. **Data Tab:** Inspect tasks, task_assignments, mesh_messages

### Metrics

- Task dispatch latency: < 1 second
- Response recording latency: < 2 seconds
- Poll interval: 5 seconds (configurable)

---

## Troubleshooting

### Issue: Bridge can't connect to Bluetooth

**Symptom:** `Failed to discover adapter`

**Solution:**
```bash
sudo systemctl restart bluetooth
sudo usermod -a -G bluetooth $USER
```

Log out and back in, then retry without `sudo`.

### Issue: Tasks not appearing in mesh

**Check:**
1. Task status is `dispatched` (not `pending`)
2. Bridge is running with correct `CONVEX_URL`
3. Bluetooth adapter is connected and scanning

**Debug:**
```bash
sudo ./target/release/bitchat --bridge -dd
```

### Issue: Responses not updating Convex

**Check:**
1. Acceptance code matches task code exactly
2. Task exists and is active
3. `CONVEX_URL` is correct and reachable

**Verify:**
```bash
curl -X POST https://your-project.convex.cloud/api/query \
  -H "Content-Type: application/json" \
  -d '{"path":"tasks:list","args":{"status":"dispatched"}}'
```

---

## Production Deployment

### Systemd Service

Create `/etc/systemd/system/bitchat-bridge.service`:

```ini
[Unit]
Description=BitChat Convex Bridge
After=network.target bluetooth.target

[Service]
Type=simple
User=bitchat
WorkingDirectory=/opt/bitchat-terminal
Environment="CONVEX_URL=https://your-project.convex.cloud"
Environment="BRIDGE_MODE=true"
Environment="POLL_INTERVAL_SECS=5"
Environment="RUST_LOG=info"
ExecStart=/opt/bitchat-terminal/target/release/bitchat --bridge
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable and Start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable bitchat-bridge
sudo systemctl start bitchat-bridge
sudo systemctl status bitchat-bridge
```

**View Logs:**
```bash
sudo journalctl -u bitchat-bridge -f
```

---

## Security Considerations

1. **No Authentication on Bridge:** Bridge polls Convex public API. Use Convex's built-in security rules to restrict access if needed.
2. **Acceptance Codes:** 4-character codes prevent accidental task claiming but are not cryptographically secure. Tasks should not contain sensitive information.
3. **Bluetooth Security:** Mesh messages are encrypted with X25519 + AES-256-GCM for private messages. Public broadcasts are unencrypted.
4. **Environment Variables:** Store `CONVEX_URL` securely. Don't commit `.env` files.

---

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Poll Interval | 5 seconds | Configurable via `POLL_INTERVAL_SECS` |
| Task Dispatch Latency | < 1 second | From Convex to mesh broadcast |
| Response Recording | < 2 seconds | From mesh to Convex update |
| Concurrent Tasks | Unlimited | Bridge tracks all active acceptance codes |
| Mesh Propagation | 2-5 hops | Depends on network density |

---

## Differences from Supabase Version

| Feature | Supabase (Old) | Convex (Current) |
|---------|---------------|------------------|
| **Trigger Mechanism** | PostgreSQL LISTEN/NOTIFY | HTTP Polling |
| **Real-time Updates** | Database triggers | Poll interval |
| **API Format** | REST with SQL | JSON-RPC style |
| **Schema** | SQL DDL | TypeScript schema |
| **Auth** | Supabase Auth | Convex Auth |
| **Connection** | PostgreSQL client | HTTP client |

---

## Roadmap

### Future Enhancements

- [ ] WebSocket/SSE for real-time push (eliminate polling)
- [ ] Webhook endpoint for instant task dispatch notifications
- [ ] Task priority queue (handle urgent tasks first)
- [ ] Volunteer location tracking integration
- [ ] Multi-bridge support (multiple mesh networks)

---

## Support

- **Anchor Issues:** https://github.com/your-org/anchor/issues
- **BitChat Terminal:** https://github.com/ShilohEye/bitchat-terminal/issues
- **Convex Docs:** https://docs.convex.dev

---

**END OF GUIDE**
