# Testing the BLE Bridge

## Quick Test (No Bitchat Device Needed)

To verify the bridge is working without a bitchat device:

### 1. Check Bluetooth is On
```bash
system_profiler SPBluetoothDataType | grep "Bluetooth Power"
```

Should show: `Bluetooth Power: On`

### 2. Run the CLI
```bash
cd ~/anchor/anchor-ble-bridge
./.build/debug/anchor-ble-cli
```

### 3. Verify Output
You should see:
```
[bluetooth] INFO: Peripheral state: 5
[bluetooth] INFO: Central state: 5
[bluetooth] INFO: Started BLE scanning
[bluetooth] INFO: Started BLE advertising
[bluetooth] INFO: Sending announce
```

**State 5 = .poweredOn** means Bluetooth is working correctly.

### 4. Type a Message
Type anything and press Enter:
```
hello mesh
```

You should see:
```
📤 Sent: hello mesh
```

The message is now being broadcast over BLE. If there were any bitchat peers nearby, they'd receive it.

## Testing with Bitchat App

### Prerequisites
1. iPhone or Android device with bitchat app installed
2. Mac with Bluetooth on
3. Both devices in same physical location (within ~10-30 meters)

### Steps

1. **Start bitchat on phone**:
   - Open bitchat iOS/Android app
   - Make sure Bluetooth permissions are granted
   - App should show "Bluetooth" status as connected

2. **Start anchor BLE bridge on Mac**:
   ```bash
   cd ~/anchor/anchor-ble-bridge
   ./.build/debug/anchor-ble-cli
   ```

3. **Wait for discovery** (10-30 seconds):
   - Mac should log: `[bluetooth] INFO: Discovered: <device-name>`
   - Then: `[bluetooth] INFO: Connected: <device-name>`
   - You'll see announce from phone: `👋 <nickname> announced (12345678)`

4. **Send message from Mac**:
   ```
   hello from anchor
   ```
   - Mac shows: `📤 Sent: hello from anchor`
   - Phone should receive it in bitchat

5. **Send message from phone**:
   - Type message in bitchat app
   - Mac should show: `📩 Message from 12345678: <message>`

## Troubleshooting

### "Peripheral state: 3" or "Central state: 3"
Bluetooth is off. Turn it on:
```bash
blueutil -p 1  # Install: brew install blueutil
```

### "No peers discovered"
- Make sure bitchat app is open and in foreground
- Check Bluetooth is on for both devices
- Move devices closer together
- Wait 30-60 seconds for BLE discovery

### "Discovered but not connecting"
- Check bitchat app has Bluetooth permissions
- Restart both apps
- Check they're using same service UUID (debug vs production)

### Messages not appearing
- Verify connection established (should see "Connected" log)
- Check bitchat app is in mesh/Bluetooth mode (not Nostr-only)
- Try sending from both directions

## Debug Mode

The bridge uses DEBUG service UUID by default:
- Debug: `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5A`
- Production: `F47B5E2D-4A9E-4C5A-9B3F-8E1D2C3A4B5C`

Make sure bitchat app is in same mode (debug build uses debug UUID).

## What's Actually Happening

When you run the CLI:

1. **Mac as Peripheral**:
   - Advertises service UUID over BLE
   - Accepts connections from bitchat apps
   - Sends notifications when messages broadcast

2. **Mac as Central**:
   - Scans for bitchat service UUID
   - Connects to discovered peripherals
   - Receives notifications from them

3. **Message Flow**:
   ```
   Type message → BitchatPacket → Binary encode → BLE broadcast →
   → bitchat apps receive → decode → show in UI
   ```

This is exactly how bitchat's iOS/Android apps communicate, just with a headless CLI instead of GUI.
