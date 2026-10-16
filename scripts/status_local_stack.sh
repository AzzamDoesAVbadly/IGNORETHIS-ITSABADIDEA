#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
LOG_DIR="$ROOT/logs"

printf '\n[local-stack] status\n'

if command -v ollama >/dev/null 2>&1; then
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "- ollama: running"
  else
    echo "- ollama: not running"
  fi
else
  echo "- ollama: not installed"
fi

if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000').read(1)" >/dev/null 2>&1; then
  echo "- website: running"
else
  echo "- website: not running"
fi

if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -qx 'open-webui'; then
    echo "- open-webui: running"
  else
    echo "- open-webui: not running"
  fi
else
  echo "- docker: not running / unavailable"
fi

if [ -d "$LOG_DIR" ]; then
  echo "- logs: $LOG_DIR"
fi
