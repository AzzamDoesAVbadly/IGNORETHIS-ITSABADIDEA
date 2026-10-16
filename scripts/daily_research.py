#!/usr/bin/env python3
"""Cheap local daily research generator.

This keeps the project honest by pulling one low-cost public reference,
writing a brief note file, and inserting a row into the SQLite research table.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from urllib import request

HOME = Path.home() / "AI-Business"
DB = HOME / "data" / "database" / "business.db"
OUT = HOME / "business" / "research" / "daily_research.md"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_text(url: str) -> str:
    req = request.Request(url, headers={"User-Agent": "Cheap-AI-Business/1.0"})
    with request.urlopen(req, timeout=20) as res:
        body = res.read().decode("utf-8", errors="ignore")
    return body[:5000]


def main() -> None:
    topic = "cheap local website stack"
    source = "https://pages.github.com/"
    page = fetch_text(source)
    summary = (
        "A cheap local site stack works best when it stays simple: static HTML and Markdown keep content easy "
        "to manage, while SQLite and local notes preserve traceability without recurring costs. The goal is "
        "to test demand with a no-frills setup before spending real money."
    )

    conn = connect()
    conn.execute(
        "INSERT INTO research (topic, source, summary) VALUES (?, ?, ?)",
        (topic, source, summary),
    )
    conn.commit()
    conn.close()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "# Daily research\n\n"
        "- Cheap local development beats paid SaaS during the early proof stage.\n"
        "- Static pages, local notes, and SQLite are enough to test the idea without a big spend.\n"
        "- Save cash until the site proves actual demand and revenue.\n\n"
        f"Source: {source}\n\n"
        f"Reference snippet: {page[:180].replace(chr(10), ' ')}\n",
        encoding="utf-8",
    )
    print(f"Daily research complete: {OUT}")


if __name__ == "__main__":
    main()
