#!/bin/bash
cd "$(dirname "$0")"

export ANCHOR_BACKEND_URL="${ANCHOR_BACKEND_URL:-http://localhost:8000}"

swift build -c release >/dev/null 2>&1

./.build/release/anchor-ble-cli
