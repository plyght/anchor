#!/bin/bash
cd "$(dirname "$0")"

if [ -f "../.env" ]; then
    export $(grep ANCHOR_BACKEND_URL ../.env | xargs)
fi

export ANCHOR_BACKEND_URL="${ANCHOR_BACKEND_URL:-http://localhost:3000}"

swift build -c release >/dev/null 2>&1

./.build/release/anchor-ble-cli
