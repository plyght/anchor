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

```bash
.build/debug/anchor-ble-cli
```

The CLI will:
1. Generate a random 8-byte peer ID
2. Start advertising as a BLE peripheral (service UUID: `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A` for debug)
3. Scan for and connect to other bitchat peers
4. Send periodic announces (every 30 seconds)
5. Accept typed messages from stdin to broadcast
6. Print received messages to stdout

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

## Integration with Anchor

To integrate with anchor backend:

1. **HTTP/WebSocket Server**: Add HTTP server to receive commands from anchor backend
2. **Message Queue**: Queue messages to send over BLE
3. **Callback Handler**: Forward received messages to anchor backend via HTTP POST

Example integration:

```swift
service.onMessageReceived = { packet in
    let json = [
        "sender": packet.senderID.hexEncodedString(),
        "type": packet.type,
        "payload": String(data: packet.payload, encoding: .utf8) ?? "",
        "timestamp": packet.timestamp
    ]
    
    postToAnchorBackend(json)
}
```

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
