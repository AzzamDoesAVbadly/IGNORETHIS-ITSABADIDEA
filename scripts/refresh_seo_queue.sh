#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

env AI_BUSINESS_HOME="$ROOT" python3 -c 'import os, sys; sys.path.insert(0, os.environ.get("AI_BUSINESS_HOME", os.path.expanduser("~/AI-Business"))); import site_server; print(site_server.run_seo_queue())' >> "$LOG_DIR/seo-refresh.log" 2>&1
