#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path

ROOT = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = ROOT / "data" / "database" / "business.db"
LOGS = ROOT / "logs"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_task_table() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            output_path TEXT,
            model TEXT,
            details TEXT
        )
        """
    )
    conn.commit()
    return conn


def append_log(message: str) -> None:
    LOGS.mkdir(parents=True, exist_ok=True)
    log_path = LOGS / "agent_cycle.log"
    with log_path.open("a", encoding="utf-8") as fh:
        fh.write(f"{now_iso()} {message}\n")


def run(report: dict, content: dict, qa: dict) -> dict:
    conn = ensure_task_table()
    conn.execute(
        "INSERT INTO tasks (name, status, output_path, model, details) VALUES (?, ?, ?, ?, ?)",
        (
            "autonomous_cycle",
            "SUCCESS" if qa.get("ok") else "FAILED",
            str(report.get("path", "")),
            "qwen2.5-coder:7b-instruct-q4_K_M",
            f"research={report.get('topic')} qa_ok={qa.get('ok')}",
        ),
    )
    conn.commit()
    conn.close()

    append_log(f"autonomous cycle complete - research_ok={report.get('topic')} qa_ok={qa.get('ok')}")
    return {
        "status": "SUCCESS" if qa.get("ok") else "FAILED",
        "content": content,
        "qa": qa,
    }
