#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

python3 "$ROOT/agent/orchestrator.py" run
