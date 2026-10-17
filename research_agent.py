from __future__ import annotations

def run(topic: str = "AI media") -> dict:
    return {
        "status": "ok",
        "topic": topic,
        "source": "local-fallback",
        "notes": "research agent stub for alpha build",
    }