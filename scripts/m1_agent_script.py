#!/usr/bin/env python3
"""Milestone 1 agent script.

This script validates the required autonomous workflow: it writes notes,
reads them back, inserts a row into the SQLite database, and logs the
expected success markers.
"""

import sqlite3
from datetime import datetime
from pathlib import Path

HOME = Path.home() / "AI-Business"
DB = HOME / "data" / "database" / "business.db"
NOTES = HOME / "agent" / "memory" / "m1_notes.md"
RUN_LOG = HOME / "logs" / "m1_run.log"


def iso_now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def append_run_marker(marker: str) -> None:
    RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    with RUN_LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"{marker} {iso_now()}\n")


def main() -> None:
    NOTES.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "Milestone 1 status: working inside the project directory.",
        "I am creating the local script, writing notes, and checking the SQLite database.",
        "I will record the file read/write and database results before finishing the summary.",
    ]
    NOTES.write_text("\n".join(lines) + "\n", encoding="utf-8")
    saved = NOTES.read_text(encoding="utf-8")
    if len([line for line in saved.splitlines() if line.strip()]) < 3:
        raise RuntimeError("Notes file did not contain enough content.")

    append_run_marker("M1_FILE_RW_OK")

    conn = sqlite3.connect(DB)
    conn.execute(
        "INSERT INTO decisions (decision, reason) VALUES (?, ?)",
        ("m1: db_roundtrip", "milestone 1 test"),
    )
    row = conn.execute(
        "SELECT decision, reason FROM decisions WHERE decision = ? ORDER BY id DESC LIMIT 1",
        ("m1: db_roundtrip",),
    ).fetchone()
    conn.commit()
    conn.close()
    if row is None:
        raise RuntimeError("Database roundtrip failed")

    append_run_marker("M1_DB_OK")
    append_run_marker("M1_SCRIPT_OK")


if __name__ == "__main__":
    main()
