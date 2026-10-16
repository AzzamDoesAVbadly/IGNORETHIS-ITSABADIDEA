#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sqlite3
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = ROOT / "data" / "database" / "business.db"
TOPICS = [
    "free-value AI business loops",
    "local research automation for a zero-cost web business",
    "content lead generation without paid ads",
    "AI-assisted website publishing with no subscriptions",
]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_db() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS research (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            topic TEXT NOT NULL,
            source TEXT,
            summary TEXT,
            status TEXT NOT NULL DEFAULT 'new'
        )
        """
    )
    cols = conn.execute("PRAGMA table_info(research)").fetchall()
    names = {row[1] for row in cols}
    if "status" not in names:
        conn.execute("ALTER TABLE research ADD COLUMN status TEXT NOT NULL DEFAULT 'new'")
    conn.commit()
    return conn


def call_local_model(prompt: str) -> str | None:
    try:
        payload = json.dumps({
            "model": "qwen2.5-coder:7b-instruct-q4_K_M",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.2},
        }).encode("utf-8")
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            text = resp.read().decode("utf-8")
        obj = json.loads(text)
        return obj.get("response", "").strip()
    except Exception:
        return None


def write_research(topic: str, summary: str) -> Path:
    outdir = ROOT / "business" / "research"
    outdir.mkdir(parents=True, exist_ok=True)
    path = outdir / f"research_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    path.write_text(
        f"# Research note\n\n- topic: {topic}\n- created: {now_iso()}\n\n{summary}\n",
        encoding="utf-8",
    )
    return path


def run() -> dict:
    conn = ensure_db()
    topic = TOPICS[0]
    prompt = (
        "Write a concise local-business research brief for a free-value AI business. "
        "Focus on content, trust-building, lead capture, and simple automation. "
        "Keep it practical and under 250 words."
    )
    model_summary = call_local_model(prompt)
    summary = model_summary or (
        "A zero-cost AI business should start by publishing useful content, collecting trust signals, "
        "and automating a simple research-to-publishing loop. The winning pattern is not a fancy product, "
        "but a consistent value engine that teaches, ships, and learns from real user feedback."
    )
    conn.execute(
        "INSERT INTO research (topic, source, summary, status) VALUES (?, ?, ?, ?)",
        (topic, "local-model", summary, "ready"),
    )
    conn.commit()
    conn.close()

    path = write_research(topic, summary)
    return {"topic": topic, "summary": summary, "path": str(path)}
