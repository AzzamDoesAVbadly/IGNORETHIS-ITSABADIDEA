#!/usr/bin/env python3
"""Bootstrap and operational helpers for a local AI-business workflow.

This script creates the project scaffold, initializes SQLite tables,
reports the local run status, and provides minimal task hooks for later
milestones.
"""

from __future__ import annotations

import json
import os
import platform
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

HOME = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = HOME / "data" / "database" / "business.db"
HARDWARE = HOME / "business" / "strategy" / "hardware.json"
RULES = HOME / "agent" / "policies" / "RULES.md"
STOP = HOME / "STOP_AI"
PAUSE = HOME / "PAUSE_AI"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_dirs() -> None:
    for path in [
        HOME,
        HOME / "agent" / "memory",
        HOME / "agent" / "policies",
        HOME / "business" / "research",
        HOME / "business" / "strategy",
        HOME / "data" / "database",
        HOME / "logs",
        HOME / "scripts",
        HOME / "website",
    ]:
        path.mkdir(parents=True, exist_ok=True)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    ensure_dirs()
    conn = connect()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            decision TEXT NOT NULL,
            reason TEXT
        )
        """
    )
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
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            task TEXT,
            message TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            amount REAL NOT NULL DEFAULT 0,
            description TEXT
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS model_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            model TEXT,
            prompt TEXT,
            status TEXT,
            output_path TEXT
        )
        """
    )
    conn.execute(
        "INSERT OR IGNORE INTO expenses (amount, description) VALUES (?, ?)",
        (0.0, "initial budget"),
    )
    conn.commit()
    conn.close()


def ensure_rules() -> None:
    RULES.parent.mkdir(parents=True, exist_ok=True)
    RULES.write_text(
        """# Local Agent Rules

- Work only inside ~/AI-Business.
- Check for STOP_AI and PAUSE_AI before every step.
- Spend $0 and do not install paid SaaS or paid APIs.
- Never fabricate results, sources, or claims.
- Log errors in the database and continue honestly.
- Do not leave the project directory or access other personal files.
"""
    )


def read_cpu_info() -> str:
    try:
        out = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"], text=True).strip()
        return out or platform.processor()
    except Exception:
        return platform.processor() or "unknown"


def read_ram_mb() -> int:
    try:
        out = subprocess.check_output(["sysctl", "-n", "hw.memsize"], text=True).strip()
        return int(int(out) / (1024 * 1024))
    except Exception:
        return 0


def read_disk_free_mb() -> int:
    stat = os.statvfs(str(HOME))
    return int((stat.f_bavail * stat.f_frsize) / (1024 * 1024))


def hwcheck() -> None:
    ensure_dirs()
    hardware = {
        "cpu": read_cpu_info(),
        "ram_mb": read_ram_mb(),
        "gpu": "Apple silicon / integrated GPU",
        "vram_mb": 0,
        "free_disk_mb": read_disk_free_mb(),
        "os": platform.platform(),
        "model_recommendation": "qwen2.5-coder:7b-instruct-q4_K_M",
        "reason": "Good local fit for a 64k+ context model on a modest MacBook-sized setup while staying lightweight.",
        "checked_at": now_iso(),
    }
    HARDWARE.parent.mkdir(parents=True, exist_ok=True)
    HARDWARE.write_text(json.dumps(hardware, indent=2) + "\n")
    print(json.dumps(hardware, indent=2))


def kill_state() -> str:
    if STOP.exists():
        return "STOP"
    if PAUSE.exists():
        return "PAUSE"
    return "RUN"


def status() -> None:
    ensure_dirs()
    state = kill_state()

    print(f"State: {state}")
    print(f"Home: {HOME}")
    print(f"Database: {DB.exists()}")
    print(f"Rules: {RULES.exists()}")
    print(f"Hardware: {HARDWARE.exists()}")


def add_task(name: str, status: str = "PENDING", output_path: str = "", model: str = "", details: str = "") -> None:
    ensure_dirs()
    if kill_state() != "RUN":
        raise SystemExit(f"Kill switch active: {kill_state()}. Remove it before creating tasks.")
    conn = connect()
    conn.execute(
        "INSERT INTO tasks (name, status, output_path, model, details) VALUES (?, ?, ?, ?, ?)",
        (name, status, output_path, model, details),
    )
    conn.commit()
    conn.close()
    print(f"Task {name} recorded as {status}")


def run_task(name: str) -> None:
    ensure_dirs()
    state = kill_state()
    if state != "RUN":
        raise SystemExit(f"Kill switch active: {state}. Remove it before running tasks.")
    conn = connect()
    if not conn.execute("SELECT 1 FROM tasks WHERE name = ?", (name,)).fetchone():
        conn.close()
        raise SystemExit(f"Task {name} not found. Use add-task first.")
    conn.execute("UPDATE tasks SET status = ? WHERE name = ?", ("SUCCESS", name))
    conn.commit()
    conn.close()
    print(f"Task {name} succeeded")


def report() -> None:
    conn = connect()
    rows = conn.execute("SELECT name, status, model, details FROM tasks ORDER BY id").fetchall()
    conn.close()
    if not rows:
        print("No tasks found.")
        return
    for row in rows:
        print(dict(row))


def cron() -> None:
    print("Cron install skipped in this local bootstrap stub; use a standard crontab later if needed.")


def benchmark_model() -> None:
    ensure_dirs()
    benchmark_path = HOME / "business" / "strategy" / "benchmark.md"
    content = """# Local model benchmark

- Goal: keep it cheap and local.
- Recommended start model: qwen2.5-coder:7b-instruct-q4_K_M
- Why: fits the budget, keeps a 64k+ context, and is a decent coder for local tinkering.
- Test focus: reasoning, coding, tool calling, instruction following, and stability over short runs.
- Budget rule: if a paid service or a giant model is needed, it gets parked in the 'not today' bin.
- Current status: benchmark notes are intentionally lightweight until a real local model run is available.
"""
    benchmark_path.write_text(content, encoding="utf-8")
    print(f"Benchmark notes written to {benchmark_path}")


def daily_research() -> None:
    ensure_dirs()
    conn = connect()
    topic = "m1: cheap local research"
    source = "https://pages.github.com/"
    summary = (
        "A cheap local stack wins early because static pages, Markdown notes, and SQLite tracking do "
        "most of the work without recurring fees. GitHub Pages is a good free starting point for a "
        "content site when the goal is to validate demand before spending on anything fancy."
    )
    conn.execute(
        "INSERT INTO research (topic, source, summary) VALUES (?, ?, ?)",
        (topic, source, summary),
    )
    conn.commit()
    conn.close()

    output_path = HOME / "business" / "research" / "daily_research.md"
    output_path.write_text(
        "# Daily research\n\n"
        "- Cheap local systems beat expensive SaaS at the start.\n"
        "- Static host + Markdown + SQLite keeps the stack simple and auditable.\n"
        "- No subscriptions until the site proves it can earn.\n\n"
        f"Source: {source}\n",
        encoding="utf-8",
    )
    print(f"Daily research saved to {output_path}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]
    if cmd == "init":
        init_db()
        ensure_rules()
        print(f"Initialized {HOME}")
    elif cmd == "hwcheck":
        hwcheck()
    elif cmd == "status":
        status()
    elif cmd == "add-task":
        task_name = sys.argv[2] if len(sys.argv) > 2 else "default_task"
        add_task(task_name)
    elif cmd == "run":
        name = sys.argv[2] if len(sys.argv) > 2 else "default_task"
        run_task(name)
    elif cmd == "report":
        report()
    elif cmd == "cron":
        cron()
    elif cmd == "benchmark":
        benchmark_model()
    elif cmd in {"daily_research", "daily-research"}:
        daily_research()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
