#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = ROOT / "data" / "database" / "business.db"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def generate_buzzfeed_style(topic: str = "local-stack") -> dict:
    prefix = [
        "We tested the impossible",
        "A corporate clown car of ideas",
        "The algorithm wanted this to be weirder",
        "Nobody asked for this, which is why it worked",
        "The office ghost approved",
    ]
    mid = [
        "7 reasons your startup is secretly a haunted Slack channel",
        "11 anti-portfolio ideas that only a bored CFO would love",
        "9 weird AI products no one asked for but every investor pretends to understand",
        "12 corporate rituals that feel like a campfire for MBAs",
        "8 local build hacks for a business that looks fake but prints actual trust",
    ]
    tone = {
        "title": f"{prefix[0]}: {mid[0]}",
        "topic": topic,
        "summary": (
            "This is the sort of weird-corporate content that feels like a quarterly report written by a haunted intern. "
            "It is structured enough to be useful, absurd enough to be shareable, and precise enough to drive attention."
        ),
    }
    tone["title"] = f"{prefix[0]}: {mid[1]}" if topic == "local-stack" else f"{prefix[1]}: {mid[2]}"
    return tone


def generate_quiz() -> dict:
    return {
        "type": "quiz",
        "title": "Which weird corporate AI persona are you?",
        "questions": [
            "You wake up in a startup office and the air smells like optimism and stale coffee. What do you do?",
            "Your product pitch is rejected because it is too honest. Which move do you make?",
            "The audience loves your chaos. What is the next step?",
        ],
        "cta": "Take the quiz and discover the exact level of nonsense your brand should be shipping."
    }


def generate_brainrot_video_prompt() -> dict:
    return {
        "type": "brainrot-video",
        "title": "Left-leaning moonbase intern teaches the economy to dance",
        "outline": [
            "A slow close-up of beige office furniture in a fluorescent haze.",
            "A narrator explains why public goods are the only sustainable form of joy.",
            "The camera cuts to a swinging mascot made of spreadsheets and leaves.",
            "Final frame: everyone wins because the algorithm is tired of greed.",
        ],
    }


def generate_drop_items() -> list[str]:
    return [
        "ceramic moon-soup bowl",
        "half-finished desktop zen garden",
        "tiny tinfoil toaster",
        "portable public library booth",
        "startup incense for suspiciously calm meetings",
    ]


def generate_print_to_order_timeline() -> list[str]:
    return [
        "1998: almanac of futuristic office furniture",
        "2004: dreamy apartment brochure for communists with trust funds",
        "2011: overcaffeinated startup deck become museum artifact",
        "2026: absurdly luxurious print-on-demand objects marked as civic art",
    ]


def store_creative_piece(piece: dict) -> None:
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS creative_pieces (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, type TEXT, summary TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        conn.execute(
            "INSERT INTO creative_pieces (title, type, summary) VALUES (?, ?, ?)",
            (piece.get("title", "Weird corporate idea"), piece.get("type", "article"), piece.get("summary", "")),
        )
        conn.commit()


def run() -> dict:
    buzz = generate_buzzfeed_style()
    quiz = generate_quiz()
    video = generate_brainrot_video_prompt()
    items = generate_drop_items()
    timeline = generate_print_to_order_timeline()

    piece = {
        "type": "buzzfeed-listicle",
        "title": buzz["title"],
        "summary": buzz["summary"],
        "quiz": quiz,
        "video": video,
        "dropsell_items": items,
        "timeline": timeline,
        "taste": "The copy is weird, sharp, and emotionally specific without becoming corporate sludge.",
    }
    store_creative_piece(piece)
    return piece
