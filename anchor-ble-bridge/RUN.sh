#!/bin/bash
cd "$(dirname "$0")"

export ANCHOR_BACKEND_URL="${ANCHOR_BACKEND_URL:-http://localhost:8000}"

echo "🚀 Starting Anchor BLE Bridge"
echo "📡 Backend: $ANCHOR_BACKEND_URL"
echo ""

./.build/release/anchor-ble-cli
