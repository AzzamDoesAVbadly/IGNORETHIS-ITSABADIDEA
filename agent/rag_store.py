from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
import sqlite3
import os

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = ROOT / "data" / "database" / "rag.db"

DEFAULT_DOCS = [
    {
        "source": "brand-voice",
        "title": "Corporate Ghost Intelligence",
        "text": "We build cyberpunk corporate momentum for strange but useful products. The voice is polished, ominous, funny, and persuasive without lying.",
    },
    {
        "source": "playbook",
        "title": "Local growth loop",
        "text": "A good local AI business keeps marketing, research, and product under one trusted loop. Publish useful content, capture intent, and monetize only after traction is real.",
    },
    {
        "source": "creative",
        "title": "Neon boardroom energy",
        "text": "The best corporate motivational writing feels like a slide deck after a blackout. Clear, sharp, and a little haunted. The market responds to signal, not noise.",
    },
]


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_schema() -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            title TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    conn.close()


def seed_default_documents() -> list[dict]:
    ensure_schema()
    conn = sqlite3.connect(DB)
    existing = conn.execute("SELECT COUNT(*) FROM knowledge").fetchone()[0]
    if existing == 0:
        for doc in DEFAULT_DOCS:
            conn.execute(
                "INSERT INTO knowledge (source, title, text, created_at) VALUES (?, ?, ?, ?)",
                (doc["source"], doc["title"], doc["text"], now_iso()),
            )
        conn.commit()
    conn.close()
    return DEFAULT_DOCS


def add_document(source: str, title: str | None = None, text: str | None = None) -> dict:
    ensure_schema()
    if text is None:
        text = title or ""
        title = source or "Untitled"
    elif title is None:
        title = source or "Untitled"

    conn = sqlite3.connect(DB)
    conn.execute(
        "INSERT INTO knowledge (source, title, text, created_at) VALUES (?, ?, ?, ?)",
        (source or "local", title or "Untitled", text or "", now_iso()),
    )
    conn.commit()
    conn.close()
    return {"source": source, "title": title, "text": text}


def search(query: str, limit: int = 5) -> list[dict]:
    ensure_schema()
    query = (query or "").strip()
    if not query:
        return []
    terms = [term.lower() for term in re.split(r"[^a-zA-Z0-9]+", query) if term]
    if not terms:
        return []

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, source, title, text, created_at FROM knowledge ORDER BY id DESC"
    ).fetchall()
    conn.close()

    matches: list[dict] = []
    for row in rows:
        haystack = f"{row['title']} {row['text']}".lower()
        score = sum(1 for term in terms if term in haystack)
        if score:
            matches.append(
                {
                    "id": row["id"],
                    "source": row["source"],
                    "title": row["title"],
                    "text": row["text"],
                    "created_at": row["created_at"],
                    "score": score,
                }
            )

    matches.sort(key=lambda item: item["score"], reverse=True)
    return matches[:limit]


def get_documents(limit: int = 10) -> list[dict]:
    ensure_schema()
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, source, title, text, created_at FROM knowledge ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]
