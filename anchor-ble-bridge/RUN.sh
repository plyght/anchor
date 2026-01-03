#!/bin/bash
cd ~/anchor/anchor-ble-bridge
echo "Building..."
swift build -c release
echo ""
echo "Starting Anchor BLE Bridge..."
./.build/release/anchor-ble-cli
