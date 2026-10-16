#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

from research_agent import run as research_run
from content_agent import run as content_run
from creative_agent import run as creative_run
from qa_agent import run as qa_run
from ops_agent import run as ops_run

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
LOGS = ROOT / "logs"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_tables() -> None:
    conn = sqlite3.connect(ROOT / "data" / "database" / "business.db")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cycles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            phase TEXT NOT NULL,
            status TEXT NOT NULL,
            details TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def log_cycle(phase: str, status: str, details: str) -> None:
    LOGS.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(ROOT / "data" / "database" / "business.db")
    conn.execute(
        "INSERT INTO cycles (phase, status, details) VALUES (?, ?, ?)",
        (phase, status, details),
    )
    conn.commit()
    conn.close()

    log_path = LOGS / "orchestrator.log"
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(f"{now_iso()} | {phase} | {status} | {details}\n")


def run_cycle() -> dict:
    ensure_tables()
    log_cycle("start", "RUNNING", "infrastructure ready")

    research = research_run()
    log_cycle("research", "SUCCESS", research["topic"])

    content = content_run()
    log_cycle("content", "SUCCESS", content["title"])

    creative = creative_run()
    log_cycle("creative", "SUCCESS", creative["title"])

    qa = qa_run(research)
    log_cycle("qa", "SUCCESS" if qa["ok"] else "FAILED", str(qa["errors"]))

    ops = ops_run(research, content, qa)
    log_cycle("ops", ops["status"], "cycle complete")

    return {
        "research": research,
        "content": content,
        "creative": creative,
        "qa": qa,
        "ops": ops,
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
