#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_FILE="$TARGET_DIR/com.ai-business.seo-refresh.plist"
SOURCE_FILE="$ROOT/scripts/com.ai-business.seo-refresh.plist"

mkdir -p "$TARGET_DIR"
cp "$SOURCE_FILE" "$TARGET_FILE"
launchctl unload "$TARGET_FILE" 2>/dev/null || true
launchctl load "$TARGET_FILE"

echo "[seo-refresh-autostart] installed at $TARGET_FILE"
