#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
WEBROOT = ROOT / "website"
DB = ROOT / "data" / "database" / "business.db"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def save_article(title: str, topic: str, summary: str) -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                topic TEXT NOT NULL,
                summary TEXT NOT NULL,
                published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'published'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS topic_metrics (
                topic TEXT PRIMARY KEY,
                score INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            "INSERT INTO articles (title, topic, summary) VALUES (?, ?, ?)",
            (title, topic, summary),
        )
        conn.execute(
            "INSERT INTO topic_metrics (topic, score, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP) "
            "ON CONFLICT(topic) DO UPDATE SET score = score + 1, updated_at = CURRENT_TIMESTAMP",
            (topic,),
        )
        conn.commit()


def build_content() -> dict:
    title = "Local AI business, no ads, no hype"
    topic = "local-stack"
    headline = "A free-value business starts with useful output, not expensive software."
    deck = (
        "This project turns local research into a repeatable publishing loop: scan, summarize, publish, "
        "learn, and improve. The goal is trust and a useful asset, not a flashy launch."
    )
    bullets = [
        "Keep the stack local and the budget near zero.",
        "Turn research notes into helpful articles and tiny offers.",
        "Let the website become a visible evidence trail.",
        "Record every step so the system can improve without guesswork.",
    ]

    content = {
        "title": title,
        "topic": topic,
        "headline": headline,
        "deck": deck,
        "bullets": bullets,
        "updated_at": now_iso(),
    }

    out_file = WEBROOT / "agent_business_loop.md"
    out_file.write_text(
        "# Local AI Business Loop\n\n"
        f"## {content['title']}\n\n"
        f"{content['headline']}\n\n"
        f"{content['deck']}\n\n"
        + "\n".join(f"- {b}" for b in content["bullets"]) + "\n",
        encoding="utf-8",
    )

    save_article(title, topic, deck)
    return content


def run() -> dict:
    content = build_content()
    return content
