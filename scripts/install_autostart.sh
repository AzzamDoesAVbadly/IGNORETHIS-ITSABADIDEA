#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_FILE="$TARGET_DIR/com.ai-business.local-stack.plist"
SOURCE_FILE="$ROOT/scripts/com.ai-business.local-stack.plist"

mkdir -p "$TARGET_DIR"
cp "$SOURCE_FILE" "$TARGET_FILE"
launchctl unload "$TARGET_FILE" 2>/dev/null || true
launchctl load "$TARGET_FILE"

echo "[autostart] installed at $TARGET_FILE"
echo "[autostart] it will start on login and when the user session loads"
