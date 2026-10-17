#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from random import choice

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "database" / "business.db"


def connect_db() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema() -> None:
    conn = connect_db()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS topic_metrics (
        topic TEXT PRIMARY KEY,
        score INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        topic TEXT,
        body TEXT,
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS video_briefs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        topic TEXT,
        hook TEXT,
        runtime TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS merch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        topic TEXT,
        price REAL DEFAULT 29.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        company TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.commit()
    conn.close()


def seed_topics() -> None:
    topics = [
        "internet chaos",
        "midnight weirdness",
        "AI hype burnout",
        "memes that should not exist",
        "toxic productivity",
        "brand rot",
        "tiny cults online",
        "adolescent internet folklore",
        "post-viral absurdity",
        "the office is a simulation",
    ]

    conn = connect_db()
    for topic in topics:
        conn.execute(
            "INSERT OR IGNORE INTO topic_metrics (topic, score, updated_at) VALUES (?, 0, CURRENT_TIMESTAMP)",
            (topic,),
        )
    conn.commit()
    conn.close()


def select_topic() -> str:
    conn = connect_db()
    row = conn.execute(
        "SELECT topic FROM topic_metrics ORDER BY score DESC, topic ASC LIMIT 1"
    ).fetchone()
    conn.close()

    if row:
        return row["topic"]

    seed_topics()
    return "internet chaos"


def score_topic(topic: str) -> int:
    weights = {
        "internet chaos": 96,
        "midnight weirdness": 91,
        "AI hype burnout": 88,
        "memes that should not exist": 94,
        "toxic productivity": 82,
        "brand rot": 79,
        "tiny cults online": 85,
        "adolescent internet folklore": 90,
        "post-viral absurdity": 92,
        "the office is a simulation": 87,
    }
    return weights.get(topic, 70)


def generate_article(topic: str) -> dict:
    title_map = {
        "internet chaos": "The Internet Is Running a Ritual and We All Pretended It Was Just a Meme",
        "midnight weirdness": "At 2:13 AM, the Algorithm Finally Admitted It Was Built by Sleep-Deprived Goblins",
        "AI hype burnout": "Everyone Is Talking About the Future of AI Like It Isn’t Just a Really Loud Intern",
        "memes that should not exist": "This Meme Should Have Died in 2017, But It Found a New Tax Shelter",
        "toxic productivity": "The Productivity Guru Is Selling a Dream That Runs Entirely on Guilt and Coffee",
        "brand rot": "Your Favorite Brand Is Not Trying to Be Good. It’s Trying to Be Memorable for 12 Seconds",
        "tiny cults online": "There Is a Very Small Internet Cult Built Entirely Around One Very Specific Font",
        "adolescent internet folklore": "Teen Internet Lore Is Getting More Elaborate Than the Last Six Civilizations",
        "post-viral absurdity": "The Timeline Has Become a Repeating Hallucination with Better Lighting",
        "the office is a simulation": "The Office Was Never a Place. It Was Just a System for Producing White Noise and Bad Decisions",
    }

    title = title_map.get(topic, f"{topic.title()} Is Getting Extremely Weird Again")
    body = (
        f"This is the story of {topic}: not a trend, not a phase, but a low-level operating system for the internet. "
        "It moves in little bursts, gets memoized by attention, and keeps returning with a new headline and a slightly "
        "more expensive pair of sunglasses. The result is not just content. It is a feedback loop of weirdness, metrics, "
        "and a bunch of people pretending they are making culture instead of just reacting to it."
    )

    return {
        "title": title,
        "topic": topic,
        "body": body,
    }


def generate_video_brief(topic: str, title: str) -> dict:
    hooks = [
        "POV: the internet is a haunted office",
        "this thing should not be this viral",
        "the brand is dead, but the meme survived",
        "we watched one weird trend turn into a religion",
        "this is what happens when the internet grows teeth",
        "you are not ready for how unserious this is",
    ]

    return {
        "title": title,
        "topic": topic,
        "hook": choice(hooks),
        "runtime": "00:46",
    }


def generate_merch(topic: str) -> dict:
    merch_map = {
        "internet chaos": ("The Internet Is A Cult", 29),
        "midnight weirdness": ("We Watched the Feed Die", 32),
        "AI hype burnout": ("The Future Is Still a Raccoon", 34),
        "memes that should not exist": ("This Was Never A Good Idea", 28),
        "toxic productivity": ("Guilt Is the Business Model", 30),
        "brand rot": ("Brand Rot Sticker Pack", 24),
        "tiny cults online": ("I Believe in the Font", 26),
        "adolescent internet folklore": ("Teen Lore T-shirt", 31),
        "post-viral absurdity": ("We Survived the Feed", 33),
        "the office is a simulation": ("Office Simulation Crewneck", 42),
    }

    name, price = merch_map.get(topic, ("Weird Signal Club", 29))
    return {"name": name, "topic": topic, "price": price}


def run_cycle() -> dict:
    ensure_schema()
    seed_topics()

    topic = select_topic()
    score = score_topic(topic)
    article = generate_article(topic)
    video = generate_video_brief(topic, article["title"])
    merch = generate_merch(topic)

    conn = connect_db()
    conn.execute(
        """
        INSERT INTO articles (title, topic, body, status)
        VALUES (?, ?, ?, 'published')
        """,
        (article["title"], article["topic"], article["body"]),
    )
    conn.execute(
        """
        INSERT INTO video_briefs (title, topic, hook, runtime)
        VALUES (?, ?, ?, ?)
        """,
        (video["title"], video["topic"], video["hook"], video["runtime"]),
    )
    conn.execute(
        """
        INSERT INTO merch (name, topic, price)
        VALUES (?, ?, ?)
        """,
        (merch["name"], merch["topic"], merch["price"]),
    )
    conn.execute(
        """
        INSERT INTO topic_metrics (topic, score, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(topic) DO UPDATE SET score = excluded.score, updated_at = CURRENT_TIMESTAMP
        """,
        (topic, score),
    )
    conn.commit()
    conn.close()

    return {
        "topic": topic,
        "score": score,
        "article": article,
        "video": video,
        "merch": merch,
        "status": {
            "label": "ready",
            "updated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        },
    }


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: orchestrator.py run")
        return
    if sys.argv[1] != "run":
        print("Usage: orchestrator.py run")
        return

    result = run_cycle()
    print("Autonomous cycle complete")
    print(f"research topic: {result['research']['topic']}")
    print(f"content title: {result['content']['title']}")
    print(f"creative title: {result['creative']['title']}")
    print(f"qa ok: {result['qa']['ok']}")
    print(f"ops status: {result['ops']['status']}")


if __name__ == "__main__":
    main()
