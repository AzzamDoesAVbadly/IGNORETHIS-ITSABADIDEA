#!/usr/bin/env python3
from __future__ import annotations

import json
import sqlite3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from agent.orchestrator import run_cycle, ensure_schema

ROOT = Path(__file__).resolve().parent
WEBROOT = ROOT / "website"
DB = ROOT / "data" / "database" / "business.db"
PORT = 8000


def connect_db() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_dashboard() -> dict:
    conn = connect_db()
    total_leads = conn.execute("SELECT COUNT(*) AS c FROM leads").fetchone()["c"]
    total_sales = conn.execute("SELECT COUNT(*) AS c FROM sales").fetchone()["c"]
    article_rows = conn.execute("SELECT title, topic, body FROM articles ORDER BY id DESC LIMIT 6").fetchall()
    topic_rows = conn.execute("SELECT topic, score FROM topic_metrics ORDER BY score DESC LIMIT 6").fetchall()
    merch_rows = conn.execute("SELECT name, topic, price FROM merch ORDER BY id DESC LIMIT 4").fetchall()
    conn.close()

    return {
        "total_leads": int(total_leads),
        "total_sales": int(total_sales),
        "total_articles": len(article_rows),
        "topic_summary": [
            {"topic": row["topic"], "score": int(row["score"])}
            for row in topic_rows
        ],
        "articles": [
            {"title": row["title"], "topic": row["topic"], "summary": row["body"]}
            for row in article_rows
        ],
        "merch": [
            {"name": row["name"], "topic": row["topic"], "price": float(row["price"])}
            for row in merch_rows
        ],
        "gate": {
            "met": (int(total_leads) > 0) or (int(total_sales) > 0),
            "status": "open" if (int(total_leads) > 0) or (int(total_sales) > 0) else "locked",
        },
    }


def fetch_home() -> dict:
    conn = connect_db()
    article_rows = conn.execute(
        "SELECT title, topic, body FROM articles ORDER BY id DESC LIMIT 6"
    ).fetchall()
    merch_rows = conn.execute(
        "SELECT name, topic, price FROM merch ORDER BY id DESC LIMIT 4"
    ).fetchall()
    topic_rows = conn.execute(
        "SELECT topic, score FROM topic_metrics ORDER BY score DESC LIMIT 5"
    ).fetchall()
    conn.close()

    return {
        "hero": {
            "title": "The internet is a machine and it has a pulse.",
            "subtitle": "AI-made weird media built to pull attention, feed the feed, and turn cultural chaos into revenue.",
        },
        "topics": [{"topic": row["topic"], "score": int(row["score"])} for row in topic_rows],
        "articles": [
            {"title": row["title"], "topic": row["topic"], "summary": row["body"]}
            for row in article_rows
        ],
        "merch": [
            {"name": row["name"], "topic": row["topic"], "price": float(row["price"])}
            for row in merch_rows
        ],
    }


class BusinessHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEBROOT), **kwargs)

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self._send_json({"ok": True, "service": "signalcorp"})
            return

        if path == "/api/home":
            self._send_json(fetch_home())
            return

        if path == "/api/dashboard":
            self._send_json(fetch_dashboard())
            return

        if path == "/api/flow":
            self._send_json(run_cycle())
            return

        if path == "/api/agents/run":
            self._send_json(run_cycle())
            return

        if path == "/api/agents/status":
            self._send_json({"ok": True, "status": "live"})
            return

        if path in ["/", "/index.html"]:
            page = WEBROOT / "index.html"
            if page.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(page.read_bytes())
                return
            self.send_error(404, "index.html not found")
            return

        if path in ["/dashboard", "/dashboard.html"]:
            page = WEBROOT / "dashboard.html"
            if page.exists():
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(page.read_bytes())
                return
            self.send_error(404, "dashboard.html not found")
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/lead":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8")) if raw else {}
            email = data.get("email")
            company = data.get("company")
            if email:
                conn = connect_db()
                conn.execute("INSERT INTO leads (email, company) VALUES (?, ?)", (email, company or ""))
                conn.commit()
                conn.close()
                self._send_json({"ok": True, "message": "lead captured"})
                return

        if path == "/api/checkout":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8")) if raw else {}
            amount = float(data.get("amount", 0) or 0)
            conn = connect_db()
            conn.execute("INSERT INTO sales (amount) VALUES (?)", (amount,))
            conn.commit()
            conn.close()
            self._send_json({"ok": True, "message": "sale recorded"})
            return

        self.send_error(404, "Not Found")


if __name__ == "__main__":
    ensure_schema()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), BusinessHandler)
    print(f"Serving {WEBROOT} on http://127.0.0.1:{PORT}")
    httpd.serve_forever()
