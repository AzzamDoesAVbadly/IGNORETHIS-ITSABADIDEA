from __future__ import annotations

def run(research: dict, content: dict, qa: dict) -> dict:
    return {
        "status": "ok",
        "action": "continue_loop",
        "details": "local fallback ops cycle",
    }