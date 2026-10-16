#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
LOG_DIR="$ROOT/logs"

for pidfile in "$LOG_DIR/ollama.pid" "$LOG_DIR/website.pid"; do
  if [ -f "$pidfile" ]; then
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "[local-stack] stopping pid $pid from $pidfile"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$pidfile"
  fi
done

if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx 'open-webui'; then
    echo "[local-stack] stopping open-webui container"
    docker rm -f open-webui >/dev/null 2>&1 || true
  fi
fi

if command -v colima >/dev/null 2>&1; then
  echo "[local-stack] colima remains installed; VM not forcibly stopped."
fi

echo "[local-stack] stopped"
