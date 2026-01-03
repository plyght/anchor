# Testing Noise-Encrypted DMs

## Prerequisites
- iOS device with bitchat app installed
- Mac with Bluetooth enabled
- Anchor backend running (optional, for task integration)

## Test Scenarios

### 1. Handshake Initiation (Anchor → iOS)
**Steps:**
1. Start anchor-cli: `./RUN.sh`
2. Open bitchat on iOS nearby
3. Wait for peer discovery (should see announcement)
4. Send DM from anchor: `/dm <ios-nickname> hello`

**Expected:**
- Anchor initiates handshake (type 0x10 packet)
- iOS responds with handshake response
- Session establishes
- Anchor sends encrypted DM (type 0x11 packet)
- iOS receives and decrypts message

**Logs to Watch:**
```
🤝 No session with <peerID>, initiating handshake and queueing message
[handshake exchange]
✅ Session established with <peerID>
📤 Sending pending DMs...
```

### 2. Handshake Response (iOS → Anchor)
**Steps:**
1. From iOS bitchat, send DM to "anchor-alerts"
2. Anchor receives handshake init from iOS
3. Anchor responds with handshake response
4. iOS sends encrypted DM

**Expected:**
- Anchor processes type 0x10 handshake
- Anchor sends handshake response
- Anchor receives type 0x11 encrypted DM
- Anchor decrypts and displays message

**Logs to Watch:**
```
[timestamp] Received handshake from <peerID>
[timestamp] Sending handshake response
[timestamp] 📨 DM from <peerID>: <decrypted message>
```

### 3. Task Response Flow (End-to-End)
**Steps:**
1. Backend dispatches task with code "X7Y2"
2. Anchor broadcasts task as encrypted DM to iOS peer
3. iOS user types: `X7Y2 A`
4. Anchor receives encrypted response
5. Anchor decrypts and parses "X7Y2 A"
6. Anchor reports to backend

**Expected:**
- Task dispatch triggers handshake if needed
- Task message encrypted with type 0x11
- Response arrives as type 0x11
- Anchor extracts "X7Y2" and "A"
- Backend receives task response

**Logs to Watch:**
```
🚨 NEW TASK: <title>
   Code: X7Y2
📨 Sending DM to <peer>: TASK#<id>: <description> | Code: X7Y2
[timestamp] 📨 DM from <peerID>: X7Y2 A
   ✅ Task response detected: code=X7Y2 action=A
```

## Debugging

### Check Session State
If DMs fail:
1. Verify handshake completed (check logs)
2. Restart both anchor-cli and iOS app
3. Try manual DM first before task dispatch

### Verify Noise Keys
- Anchor noise key: Generated at startup (SHA256 fingerprint = peerID)
- iOS noise key: Stored in bitchat keychain

### Packet Inspection
Enable verbose logging:
```swift
// In Logger.swift, set level to .debug
```

### Common Issues
1. **"No session" error:** Handshake failed or not completed
2. **Decrypt fails:** Session established but keys don't match
3. **No response:** iOS not receiving encrypted packet (check MTU)
4. **Parse fails:** TLV encoding mismatch

## Success Criteria
✅ Handshake completes in both directions
✅ Encrypted DMs decrypt successfully
✅ Task responses parsed correctly
✅ Backend receives volunteer responses
✅ No plaintext DMs visible on type 0x02 (broadcasts only)
