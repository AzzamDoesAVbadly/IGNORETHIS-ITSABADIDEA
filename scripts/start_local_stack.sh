#!/usr/bin/env bash
set -u

ROOT="${AI_BUSINESS_HOME:-$HOME/AI-Business}"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"

echo "[local-stack] project root: $ROOT"

if ! command -v ollama >/dev/null 2>&1; then
  echo "[local-stack] ollama is not installed or not on PATH."
else
  if curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "[local-stack] ollama is already running."
  else
    echo "[local-stack] starting ollama serve..."
    nohup ollama serve > "$LOG_DIR/ollama.log" 2>&1 &
    echo $! > "$LOG_DIR/ollama.pid"
    echo "[local-stack] ollama log: $LOG_DIR/ollama.log"
  fi
fi

if command -v python3 >/dev/null 2>&1; then
  if pgrep -af "site_server.py" >/dev/null 2>&1; then
    echo "[local-stack] website is already running on http://127.0.0.1:8000"
  else
    echo "[local-stack] starting website on http://127.0.0.1:8000"
    nohup python3 "$ROOT/site_server.py" > "$LOG_DIR/website.log" 2>&1 &
    echo $! > "$LOG_DIR/website.pid"
  fi

  if ! pgrep -af "agent/orchestrator.py run" >/dev/null 2>&1; then
    echo "[local-stack] starting autonomous cycle"
    nohup env AI_BUSINESS_HOME="$ROOT" python3 "$ROOT/agent/orchestrator.py" run > "$LOG_DIR/agent-cycle.log" 2>&1 &
  else
    echo "[local-stack] autonomous cycle is already running"
  fi

  echo "[local-stack] refreshing SEO queue"
  nohup env AI_BUSINESS_HOME="$ROOT" python3 -c 'import os, sys; sys.path.insert(0, os.environ.get("AI_BUSINESS_HOME", os.path.expanduser("~/AI-Business"))); import site_server; site_server.run_seo_queue()' > "$LOG_DIR/seo-refresh.log" 2>&1 &
fi

if command -v colima >/dev/null 2>&1; then
  echo "[local-stack] colima is installed; starting Docker VM if needed..."
  colima start >/dev/null 2>&1 || true
  if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    docker context use colima >/dev/null 2>&1 || true
    if ! docker ps --format '{{.Names}}' | grep -qx 'open-webui'; then
      echo "[local-stack] starting open-webui through colima/docker..."
      # Ollama cloud key etc. live in ~/.config/open-webui/env (kept out of git).
      env_args=()
      [ -f "$HOME/.config/open-webui/env" ] && env_args=(--env-file "$HOME/.config/open-webui/env")
      docker start open-webui >/dev/null 2>&1 || docker run -d \
        --name open-webui \
        --restart unless-stopped \
        --add-host=host.docker.internal:host-gateway \
        -p 127.0.0.1:3000:8080 \
        -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
        -e WEBUI_AUTH=False \
        ${env_args[@]+"${env_args[@]}"} \
        -v open-webui:/app/backend/data \
        ghcr.io/open-webui/open-webui:main >/dev/null 2>&1 || true
    else
      echo "[local-stack] open-webui container already running."
    fi
  else
    echo "[local-stack] docker daemon is not available yet; skipping container UI boot."
  fi
else
  echo "[local-stack] colima is not installed; skipping container UI boot."
fi

echo "[local-stack] ready."
echo "[local-stack] local Ollama: http://127.0.0.1:11434"
echo "[local-stack] local website: http://127.0.0.1:8000"
echo "[local-stack] open-webui: http://127.0.0.1:3000 (when container is active)"
