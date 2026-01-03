# Anchor BLE Bridge - Production Checklist

## ✅ Core Functionality

- [x] BLE mesh communication working
- [x] Task polling from backend (5s interval)
- [x] Broadcast messages to all volunteers
- [x] Targeted DMs to specific volunteers by bitchat username
- [x] Parse volunteer responses (A/D/DONE)
- [x] Report responses back to backend
- [x] Noise protocol encryption for DMs
- [x] Handshake initiation and response

## 🔧 Configuration

### Environment Variables

```bash
ANCHOR_BACKEND_URL=http://localhost:3000  # Update for production
```

### Production URLs

- [ ] Update `ANCHOR_BACKEND_URL` to production backend URL
- [ ] Ensure backend is accessible from BLE bridge device
- [ ] Verify Convex URL is production deployment

## 🚀 Deployment

### Hardware Requirements

- [ ] Mac with Bluetooth LE support
- [ ] Stable power supply
- [ ] Network connectivity to backend

### Service Setup

1. **Build Release Binary**
   ```bash
   cd ~/anchor/anchor-ble-bridge
   swift build -c release
   ```

2. **Create Launch Daemon** (macOS)
   
   Create `/Library/LaunchDaemons/com.anchor.ble-bridge.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.anchor.ble-bridge</string>
       <key>ProgramArguments</key>
       <array>
           <string>/Users/nicojaffer/anchor/anchor-ble-bridge/.build/release/anchor-ble-cli</string>
       </array>
       <key>EnvironmentVariables</key>
       <dict>
           <key>ANCHOR_BACKEND_URL</key>
           <string>https://your-production-backend.com</string>
       </dict>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/var/log/anchor-ble-bridge.log</string>
       <key>StandardErrorPath</key>
       <string>/var/log/anchor-ble-bridge.error.log</string>
   </dict>
   </plist>
   ```

3. **Load Service**
   ```bash
   sudo launchctl load /Library/LaunchDaemons/com.anchor.ble-bridge.plist
   sudo launchctl start com.anchor.ble-bridge
   ```

4. **Check Status**
   ```bash
   sudo launchctl list | grep anchor
   tail -f /var/log/anchor-ble-bridge.log
   ```

## 🔒 Security

- [x] Noise protocol encryption for private messages
- [x] Ed25519 signatures on packets
- [ ] Review acceptance code security (4 chars = 1.6M combinations)
- [ ] Consider HTTPS for backend communication in production
- [ ] Secure storage of Noise keys (currently ephemeral, regenerated on restart)

## 📊 Monitoring

### Logs to Watch

- Backend connection status ("✅ Anchor backend reconnected" / "⚠️ Anchor backend offline")
- Task dispatch ("🚨 NEW TASK")
- DM targeting ("🎯 Targeted to: <username>")
- Peer discovery ("👋 <username> joined")
- Response parsing ("✅ Task response detected")

### Key Metrics

- Backend polling interval: 5 seconds
- Task dispatch latency: < 1 second
- Response reporting latency: < 2 seconds
- BLE connection count: Track discovered peers

### Alert Conditions

- Backend offline > 1 minute
- No tasks dispatched in > 1 hour (during active incident)
- Targeted volunteer not discovered (falls back to broadcast)
- Repeated handshake failures with same peer

## 🧪 Testing

### Manual Test: Broadcast Message

1. Create incident and task (no assigned volunteer)
2. Dispatch task
3. Verify broadcast to all mesh peers
4. Respond from any bitchat device
5. Verify response recorded in backend

### Manual Test: Targeted DM

1. Create task with `assigned_volunteer_id` set
2. Ensure volunteer's bitchat username matches discovered peer
3. Dispatch task
4. Verify DM sent (not broadcast)
5. Respond from target volunteer
6. Verify response recorded

### Manual Test: Fallback to Broadcast

1. Create targeted task for volunteer not yet discovered
2. Dispatch task
3. Verify warning: "Peer not yet discovered, broadcasting instead"
4. Volunteer joins and receives broadcast
5. Response works normally

## 📦 Dependencies

- Swift 5.9+
- macOS 13.0+
- AsyncHTTPClient (for backend polling)
- CoreBluetooth framework
- Noise protocol implementation

## 🔄 Recovery Procedures

### Bridge Crashes

- LaunchDaemon auto-restarts service
- Check logs: `/var/log/anchor-ble-bridge.error.log`
- Verify Bluetooth adapter status

### Backend Unreachable

- Bridge retries silently (5s interval)
- Tasks queue in backend until bridge reconnects
- No manual intervention needed

### Peer Not Discovered

- Task falls back to broadcast automatically
- Volunteer can still respond once they receive broadcast
- Consider extending discovery period before dispatch

## 🎯 Known Limitations

1. **Peer Discovery**: Volunteers must be in BLE range and have announced before targeted DM works
2. **Acceptance Codes**: 4-character codes are short for security but sufficient for non-sensitive tasks
3. **No Message Queuing**: If volunteer offline, messages broadcast to mesh (TTL=7 hops)
4. **Noise Key Ephemeral**: Keys regenerate on restart (sessions must re-establish)

## 📝 Production URLs

- **Backend**: Update in `ANCHOR_BACKEND_URL`
- **Convex**: Already configured in backend `.env`
- **Frontend**: Admin dashboard for task management

## ✅ Pre-Flight Checklist

Before going live:

- [ ] Backend running in production
- [ ] Convex deployed to production
- [ ] Frontend deployed and accessible
- [ ] BLE bridge service configured and running
- [ ] At least one volunteer bitchat device in range for testing
- [ ] Test end-to-end: incident → task → dispatch → response
- [ ] Test targeted DM flow
- [ ] Test broadcast flow
- [ ] Verify response reporting to backend
- [ ] Set up log monitoring
- [ ] Document on-call procedures
