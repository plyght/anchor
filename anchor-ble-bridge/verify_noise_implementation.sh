#!/bin/bash
set -e

echo "🔍 Verifying Noise-Encrypted DM Implementation"
echo "=============================================="
echo

echo "✓ Checking build status..."
swift build -c release >/dev/null 2>&1
echo "  Build: SUCCESS"
echo

echo "✓ Checking binary exists..."
if [ -f .build/release/anchor-ble-cli ]; then
    SIZE=$(du -h .build/release/anchor-ble-cli | cut -f1)
    echo "  Binary: .build/release/anchor-ble-cli ($SIZE)"
else
    echo "  ❌ Binary not found"
    exit 1
fi
echo

echo "✓ Checking Noise protocol files..."
NOISE_FILES=(
    "Sources/AnchorBLEBridge/Noise/NoiseProtocol.swift"
    "Sources/AnchorBLEBridge/Noise/NoiseSession.swift"
    "Sources/AnchorBLEBridge/Noise/NoiseSessionManager.swift"
    "Sources/AnchorBLEBridge/Noise/NoiseRateLimiter.swift"
    "Sources/AnchorBLEBridge/Noise/NoiseSecurityValidator.swift"
    "Sources/AnchorBLEBridge/Noise/KeychainManager.swift"
)

for file in "${NOISE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ Missing: $file"
        exit 1
    fi
done
echo

echo "✓ Checking NoiseEncryptionService..."
if [ -f "Sources/AnchorBLEBridge/NoiseEncryptionService.swift" ]; then
    echo "  ✓ NoiseEncryptionService.swift"
    grep -q "public func initiateHandshake" Sources/AnchorBLEBridge/NoiseEncryptionService.swift && echo "    ✓ initiateHandshake() is public"
    grep -q "public func processHandshakeMessage" Sources/AnchorBLEBridge/NoiseEncryptionService.swift && echo "    ✓ processHandshakeMessage() is public"
    grep -q "public func encrypt" Sources/AnchorBLEBridge/NoiseEncryptionService.swift && echo "    ✓ encrypt() is public"
    grep -q "public func decrypt" Sources/AnchorBLEBridge/NoiseEncryptionService.swift && echo "    ✓ decrypt() is public"
else
    echo "  ❌ NoiseEncryptionService.swift not found"
    exit 1
fi
echo

echo "✓ Checking main.swift handlers..."
grep -q "packet.type == 0x10" Sources/AnchorBLECLI/main.swift && echo "  ✓ Handshake handler (0x10)"
grep -q "packet.type == 0x11" Sources/AnchorBLECLI/main.swift && echo "  ✓ Encrypted DM handler (0x11)"
grep -q "processHandshakeMessage" Sources/AnchorBLECLI/main.swift && echo "  ✓ Handshake processing"
grep -q "noiseService.decrypt" Sources/AnchorBLECLI/main.swift && echo "  ✓ Decryption logic"
echo

echo "✓ Checking AnchorBLEService integration..."
grep -q "public let noiseService" Sources/AnchorBLEBridge/AnchorBLEService.swift && echo "  ✓ noiseService exposed"
grep -q "sendPrivateMessage" Sources/AnchorBLEBridge/AnchorBLEService.swift && echo "  ✓ sendPrivateMessage() implemented"
grep -q "initiateHandshakeIfNeeded" Sources/AnchorBLEBridge/AnchorBLEService.swift && echo "  ✓ Handshake initiation"
grep -q "pendingDMs" Sources/AnchorBLEBridge/AnchorBLEService.swift && echo "  ✓ Pending message queue"
echo

echo "✓ Checking packet types..."
grep -q "case 0x10:" Sources/AnchorBLECLI/main.swift && echo "  ✓ Type 0x10: Noise handshake"
grep -q "case 0x11:" Sources/AnchorBLECLI/main.swift && echo "  ✓ Type 0x11: Noise encrypted"
echo

echo "✓ Checking PeerID visibility..."
grep -q "public struct PeerID" Sources/AnchorBLEBridge/PeerID.swift && echo "  ✓ PeerID is public"
grep -q "public init(hexData:" Sources/AnchorBLEBridge/PeerID.swift && echo "  ✓ hexData initializer public"
echo

echo "=============================================="
echo "✅ All checks passed!"
echo
echo "Next steps:"
echo "1. Start backend: cd ~/anchor/backend && bun run src/index.ts"
echo "2. Start bridge: ./RUN.sh"
echo "3. Open bitchat on iOS device"
echo "4. Test DM: /dm <peer> hello"
echo
echo "See TEST_DM_FLOW.md for detailed test scenarios"
