# Anchor BLE Bridge

Headless Bluetooth LE client for macOS that communicates with bitchat mesh network.

## Overview

This is a lightweight Swift CLI that implements the bitchat protocol to send/receive messages over Bluetooth LE mesh networks. It runs headlessly on macOS and can be integrated with the anchor backend.

## Features

- Uses exact bitchat protocol (binary packet format, compression, etc.)
- Acts as both BLE Central (scans/connects to peers) and Peripheral (advertises/accepts connections)
- Compatible with bitchat iOS/Android apps
- Headless operation (no GUI)
- Built with Swift Package Manager

## Requirements

- macOS 13.0+
- Swift 5.9+
- Bluetooth LE capability

## Building

```bash
cd anchor-ble-bridge
swift build
```

## Running

### Standalone (no anchor backend)

```bash
.build/release/anchor-ble-cli
```

### With Anchor Backend

```bash
export ANCHOR_BACKEND_URL=http://localhost:8000
./RUN.sh
```

Or use the script directly:

```bash
./RUN.sh
```

The CLI will:
1. Generate Ed25519 signing keys and derive peer ID from noise key
2. Announce as **"anchor-alerts"** on the mesh
3. Start advertising as a BLE peripheral (production UUID)
4. Scan for and connect to bitchat peers
5. Send signed periodic announces (every 30 seconds)
6. **Poll anchor backend** every 5s for dispatched tasks
7. **Broadcast tasks** to mesh with acceptance codes
8. **Parse volunteer responses** (e.g., "X7Y2 A", "X7Y2 DONE")
9. **Report responses** back to anchor backend
10. Accept typed messages from stdin to broadcast

### Interactive Commands

Once running:
- Type any message and press Enter to broadcast to mesh
- Type `quit` to exit

### Example Session

```
🚀 Anchor BLE Bridge started
📡 Peer ID: a1b2c3d4e5f6a7b8
📻 Service UUID: F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A

✨ Waiting for bitchat peers...
💡 Open bitchat iOS app nearby to test connection

Type a message and press Enter to send, or 'quit' to exit

[bluetooth] INFO: Started BLE scanning
[bluetooth] INFO: Started BLE advertising
[bluetooth] INFO: Discovered: iPhone
[bluetooth] INFO: Connected: iPhone
[14:23:45] 👋 alice announced (12345678)
hello from mac
📤 Sent: hello from mac
[14:24:01] 📩 Message from 12345678: hey there!
```

## Architecture

### Components

- `BitchatPacket.swift` - Core packet structure (copied from bitchat)
- `BinaryProtocol.swift` - Binary encoding/decoding (copied from bitchat)
- `MessagePadding.swift` - Padding utilities (copied from bitchat)
- `CompressionUtil.swift` - Payload compression (copied from bitchat)
- `PeerID.swift` - Peer identification (copied from bitchat)
- `FileTransferLimits.swift` - Size limits (copied from bitchat)
- `Extensions.swift` - Data hex conversion, SHA256
- `Logger.swift` - Simple logging
- `AnchorBLEService.swift` - BLE central/peripheral manager
- `main.swift` - CLI entry point

### BLE Service UUIDs

- **Service**: `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A` (debug/testnet)
- **Characteristic**: `A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D`

These match the bitchat protocol exactly.

## Anchor Backend Integration

The bridge now includes full anchor backend integration:

### Task Dispatching

1. Anchor admin creates incident and generates tasks
2. Admin clicks "Dispatch" → task status becomes `dispatched`
3. Bridge polls `GET /api/tasks?status=dispatched` every 5 seconds
4. Bridge broadcasts to mesh: `"TASK#<id>: <description> | Code: <code>"`
5. Volunteers see task in bitchat app

### Volunteer Responses

Volunteers respond in bitchat:
```
X7Y2 A      # Accept task
X7Y2 D      # Decline task  
X7Y2 DONE   # Mark complete
```

Bridge parses responses and calls:
```
POST /api/tasks/<id>/respond
{
  "volunteer_id": "ea02bc8074a9d27c",
  "action": "A" | "D" | "DONE"
}
```

### Environment Variables

- `ANCHOR_BACKEND_URL` - Backend URL (default: `http://localhost:8000`)

### Testing

1. **Start backend**:
   ```bash
   cd ~/anchor/backend
   bun run src/index.ts
   ```

2. **Start bridge**:
   ```bash
   cd ~/anchor/anchor-ble-bridge
   ./RUN.sh
   ```

3. **Create task** via admin UI at http://localhost:5173/admin

4. **Dispatch task** → appears on phones

5. **Respond from phone**: Type `<code> A` in bitchat

6. **Verify** in admin UI that response was recorded

## Development

### Testing with Bitchat App

1. Build and run bitchat iOS app on device
2. Run `anchor-ble-cli` on Mac
3. Mac should discover and connect to iPhone
4. Messages sent from iOS app should appear in CLI output

### Adding HTTP API

To add HTTP server for anchor integration, add Vapor or Hummingbird dependency:

```swift
dependencies: [
    .package(url: "https://github.com/hummingbird-project/hummingbird.git", from: "2.0.0")
]
```

### Permissions

macOS requires Bluetooth permissions. The app will prompt on first run.

For programmatic access (e.g., running as daemon), add to `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Anchor needs Bluetooth to communicate with emergency volunteers</string>
```

## Protocol Compatibility

This implementation uses the exact bitchat protocol:

- Binary packet format with version/type/ttl/timestamp/flags
- 8-byte sender IDs
- Optional recipient IDs for directed messages
- LZ4 compression for payloads >256 bytes
- TTL-based hop limiting (max 7 hops)
- Ed25519 signatures (not yet implemented here)

## Limitations

- No Noise protocol encryption (sends unencrypted packets)
- No message signing (BitchatPacket.signature field unused)
- No fragment reassembly (messages must fit in MTU)
- No mesh routing (just direct BLE connections)

These can be added as needed for anchor's use case.

## License

Uses code from bitchat which is public domain (Unlicense).
