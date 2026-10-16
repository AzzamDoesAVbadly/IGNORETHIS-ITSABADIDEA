#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sqlite3
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from agent import brand_voice, rag_store

ROOT = Path(__file__).resolve().parent
WEBROOT = ROOT / "website"
DB = ROOT / "data" / "database" / "business.db"
PORT = 8000


def connect_db() -> sqlite3.Connection:
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema() -> None:
    conn = connect_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            topic TEXT NOT NULL DEFAULT 'general',
            source TEXT NOT NULL DEFAULT 'website',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            product TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'captured',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            consent TEXT NOT NULL DEFAULT 'declined',
            interests TEXT NOT NULL DEFAULT '[]',
            last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS seo_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            queued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT,
            summary TEXT NOT NULL DEFAULT 'pending'
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_articles_topic ON articles(topic)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at)"
    )
    conn.commit()
    conn.close()


def save_lead(email: str, topic: str = "general", source: str = "website") -> dict:
    email = (email or "").strip().lower()
    topic = (topic or "general").strip() or "general"
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("invalid_email")

    conn = connect_db()
    conn.execute(
        "INSERT INTO leads (email, topic, source) VALUES (?, ?, ?)",
        (email, topic, source),
    )
    row = conn.execute(
        "SELECT score FROM topic_metrics WHERE topic = ?",
        (topic,),
    ).fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO topic_metrics (topic, score, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP)",
            (topic,),
        )
    else:
        conn.execute(
            "UPDATE topic_metrics SET score = score + 1, updated_at = CURRENT_TIMESTAMP WHERE topic = ?",
            (topic,),
        )
    conn.commit()
    conn.close()
    return {"ok": True, "email": email, "topic": topic, "source": source}


def fetch_topics() -> list[dict]:
    conn = connect_db()
    rows = conn.execute(
        "SELECT topic, score FROM topic_metrics ORDER BY score DESC, topic ASC"
    ).fetchall()
    conn.close()
    return [{"topic": row["topic"], "score": row["score"]} for row in rows]


def fetch_leads() -> list[dict]:
    conn = connect_db()
    rows = conn.execute(
        "SELECT email, topic, source, created_at FROM leads ORDER BY created_at DESC LIMIT 100"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def fetch_articles() -> list[dict]:
    conn = connect_db()
    rows = conn.execute(
        "SELECT title, topic, summary, published_at FROM articles ORDER BY published_at DESC LIMIT 10"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def monetization_gate() -> dict:
    topics = fetch_topics()
    leads = fetch_leads()
    total_leads = len(leads)
    top_score = max((item["score"] for item in topics), default=0)
    threshold = 10
    met = total_leads >= threshold or top_score >= threshold
    return {
        "threshold": threshold,
        "met": met,
        "status": "open" if met else "locked",
        "total_leads": total_leads,
        "top_topic": topics[0]["topic"] if topics else "n/a",
    }


def fetch_dashboard() -> dict:
    topics = fetch_topics()
    articles = fetch_articles()
    gate = monetization_gate()
    total_leads = gate["total_leads"]
    return {
        "total_leads": total_leads,
        "top_topic": gate["top_topic"],
        "topic_summary": topics,
        "articles": articles,
        "gate": gate,
    }


def generate_offer_set() -> dict:
    gate = monetization_gate()
    offers = [
        {
            "id": "ghost-brief",
            "name": "The Ghost Brief",
            "price": 49,
            "currency": "USD",
            "description": "A brief of hidden demand, weird signals, and the next move the market is almost ready to reward.",
        },
        {
            "id": "backroom-kit",
            "name": "Backroom Growth Kit",
            "price": 149,
            "currency": "USD",
            "description": "A compact toolkit for local marketing, lead loops, repeatable offers, and observation-driven campaigns.",
        },
        {
            "id": "traction-lab",
            "name": "Traction Lab",
            "price": 299,
            "currency": "USD",
            "description": "The full local-growth package: landing page, lead flow, dashboard, and an actionable growth brief.",
        },
    ]
    return {
        "items": offers,
        "gate": {
            "threshold": gate["threshold"],
            "met": gate["met"],
            "status": gate["status"],
        },
        "cta": "The offer unlocks after real traction, never before.",
    }


def build_journey_room(room_id: str = "drift-01") -> dict:
    room_id = (room_id or "drift-01").strip() or "drift-01"
    rooms = {
        "drift-01": {
            "headline": "The hallway smells like old optimism and static.",
            "vibe": "neon memory / corporate fog",
            "copy": "You open the next corridor and the product pitch feels half-remembered, half-divinely timed.",
            "signals": ["lead velocity is rising", "content is sticking", "the audience is curious"],
            "cta": "Enter the next room and keep the momentum alive.",
        },
        "drift-02": {
            "headline": "A quiet boardroom appears in the middle of the rain.",
            "vibe": "backroom luxury / cool panic",
            "copy": "The numbers are clean, the mood is strange, and the offer suddenly feels exactly expensive enough.",
            "signals": ["traction crossed a real threshold", "the offer is now credible", "interest is converting"],
            "cta": "Unlock the offer and start the next conversion cycle.",
        },
        "drift-03": {
            "headline": "The dashboard starts speaking in soft neon.",
            "vibe": "david lynch / crm dreamstate",
            "copy": "Every click reads like a forecast. Every page feels like a clue. The machine is beginning to behave like a business.",
            "signals": ["repeat visits are increasing", "audience intent is clear", "distribution has legs"],
            "cta": "Keep moving deeper into the offer stack.",
        },
    }
    room = rooms.get(room_id, rooms["drift-01"])
    return {
        "room_id": room_id,
        "headline": room["headline"],
        "vibe": room["vibe"],
        "copy": room["copy"],
        "signals": room["signals"],
        "cta": room["cta"],
    }


def send_outbound_webhook(payload: dict) -> bool:
    webhook = os.environ.get("OUTBOUND_WEBHOOK_URL")
    if not webhook:
        return False
    try:
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(webhook, data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status in (200, 201, 202, 204)
    except Exception:
        return False


def send_purchase_email(email: str, product: str, amount: float) -> bool:
    provider = os.environ.get("EMAIL_PROVIDER", "").lower()
    api_key = os.environ.get("RESEND_API_KEY") or os.environ.get("SMTP_SERVER")
    if provider not in {"resend", "smtp"} or not api_key:
        return False
    try:
        payload = {
            "from": os.environ.get("EMAIL_FROM", "noreply@example.com"),
            "to": [email],
            "subject": f"Your {product} is ready",
            "html": f"<p>Thanks for buying {product}. Your order total was ${amount}.</p><p>Included: {customer_delivery_bundle(product)['title']}.</p>",
        }
        if provider == "resend":
            request = urllib.request.Request(
                "https://api.resend.com/emails",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status in (200, 201, 202)
        return True
    except Exception:
        return False


def create_stripe_checkout_session(email: str, product: str, amount: float) -> dict:
    api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not api_key:
        return {"provider": "local-only", "status": "skipped"}
    try:
        payload = {
            "mode": "payment",
            "line_items": [{"price_data": {"currency": "usd", "product_data": {"name": product}, "unit_amount": int(float(amount) * 100)}, "quantity": 1}],
            "success_url": "http://127.0.0.1:8000/thanks",
            "cancel_url": "http://127.0.0.1:8000/",
            "customer_email": email,
        }
        request = urllib.request.Request(
            "https://api.stripe.com/v1/checkout/sessions",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8"))
            return {"provider": "stripe", "status": "created", "checkout_url": body.get("url")}
    except Exception:
        return {"provider": "stripe", "status": "error"}


def save_sale(email: str, product: str, amount: float = 0.0) -> dict:
    email = (email or "").strip().lower()
    product = (product or "ghost-brief").strip() or "ghost-brief"
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("invalid_email")
    conn = connect_db()
    conn.execute(
        "INSERT INTO sales (email, product, amount, status) VALUES (?, ?, ?, 'captured')",
        (email, product, float(amount or 0.0)),
    )
    conn.commit()
    conn.close()
    payload = {"event": "sale_captured", "email": email, "product": product, "amount": float(amount or 0.0)}
    send_outbound_webhook(payload)
    send_purchase_email(email, product, float(amount or 0.0))
    return {"ok": True, "email": email, "product": product, "amount": float(amount or 0.0), "delivery": customer_delivery_bundle(product)}


def customer_delivery_bundle(product: str) -> dict:
    bundles = {
        "ghost-brief": {
            "title": "The Ghost Brief",
            "format": "PDF + update note",
            "value": "A strange but actionable briefing on hidden demand, weird signals, and your next move.",
        },
        "backroom-kit": {
            "title": "Backroom Growth Kit",
            "format": "Zip package + slide deck",
            "value": "Templates, prompts, and a brief that turns weird attention into actual traction.",
        },
        "traction-lab": {
            "title": "Traction Lab",
            "format": "Full workshop bundle",
            "value": "The entire growth loop packaged as a useful but intentionally odd product bundle.",
        },
    }
    selected = bundles.get(product, bundles["ghost-brief"])
    return {
        "product": product,
        "title": selected["title"],
        "format": selected["format"],
        "value": selected["value"],
    }


def save_article(title: str, topic: str, summary: str) -> dict:
    conn = connect_db()
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
    conn.close()
    return {"title": title, "topic": topic, "summary": summary}


def generate_seo_pages() -> list[dict]:
    articles = fetch_articles()
    items = [
        {"title": "Local AI business playbook", "slug": "local-ai-business-playbook"},
        {"title": "AI traction and weird corporate content", "slug": "ai-traction-weird-corporate-content"},
        {"title": "Lead capture without the bullshit", "slug": "lead-capture-without-the-bullshit"},
    ]
    for article in articles:
        title = article.get("title", "piece")
        slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in title).strip("-")
        items.append({"title": title, "slug": slug})
    return items


def queue_seo_refresh(topic: str) -> dict:
    topic = (topic or "local-ai-business").strip() or "local-ai-business"
    conn = connect_db()
    conn.execute(
        "INSERT INTO seo_jobs (topic, status, summary) VALUES (?, 'queued', ?)",
        (topic, f"Queued refresh for {topic}"),
    )
    conn.commit()
    job_id = conn.execute("SELECT id FROM seo_jobs WHERE topic = ? ORDER BY id DESC LIMIT 1", (topic,)).fetchone()
    conn.close()
    return {"ok": True, "id": job_id[0] if job_id else None, "topic": topic, "status": "queued"}


def fetch_seo_jobs() -> list[dict]:
    conn = connect_db()
    rows = conn.execute(
        "SELECT id, topic, status, queued_at, resolved_at, summary FROM seo_jobs ORDER BY queued_at DESC LIMIT 10"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def run_seo_queue() -> list[dict]:
    conn = connect_db()
    rows = conn.execute(
        "SELECT id, topic FROM seo_jobs WHERE status = 'queued' ORDER BY queued_at ASC LIMIT 5"
    ).fetchall()
    out = []
    for row in rows:
        topic = row["topic"]
        summary = f"Refreshed SEO page bundle around {topic}"
        conn.execute(
            "UPDATE seo_jobs SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, summary = ? WHERE id = ?",
            (summary, row["id"]),
        )
        out.append({"id": row["id"], "topic": topic, "status": "resolved", "summary": summary})
    conn.commit()
    conn.close()
    return out


def build_seo_feed_bundle() -> dict:
    feed_urls = [value.strip() for value in os.environ.get("SEO_FEED_URLS", "").split(",") if value.strip()]
    pages = generate_seo_pages()
    queue = fetch_seo_jobs()
    if not feed_urls:
        return {"pages": pages, "feeds": [], "queue": queue}

    entries = []
    for feed_url in feed_urls:
        try:
            with urllib.request.urlopen(feed_url, timeout=10) as resp:
                xml = resp.read().decode("utf-8", errors="ignore")
            if "<rss" in xml.lower() or "<feed" in xml.lower():
                for match in re.findall(r"<title>(.*?)</title>", xml, flags=re.DOTALL | re.IGNORECASE):
                    cleaned = re.sub(r"<.*?>", "", match).strip()
                    if cleaned:
                        entries.append(cleaned)
        except Exception:
            continue
    return {"pages": pages, "feeds": entries[:12], "queue": queue}


def generate_sitemap() -> str:
    pages = generate_seo_pages()
    urls = [
        "http://127.0.0.1:8000/",
        "http://127.0.0.1:8000/dashboard",
        "http://127.0.0.1:8000/leads",
    ]
    for page in pages:
        urls.append(f"http://127.0.0.1:8000/{page['slug']}")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in urls:
        lines.append(f"  <url><loc>{url}</loc></url>")
    lines.append("</urlset>")
    return "\n".join(lines)


def fetch_brand_voice() -> dict:
    return brand_voice.get_voice_reference()


def fetch_mood_states() -> list[dict]:
    return brand_voice.get_mood_states()


def search_rag(query: str, limit: int = 5) -> list[dict]:
    rag_store.seed_default_documents()
    return rag_store.search(query, limit=limit)


class BusinessHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEBROOT), **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"ok": True, "service": "ai-business-local"})
            return
        if parsed.path == "/api/topics":
            self._send_json({"items": fetch_topics()})
            return
        if parsed.path == "/api/articles":
            self._send_json({"items": fetch_articles()})
            return
        if parsed.path == "/api/leads":
            self._send_json({"items": fetch_leads()})
            return
        if parsed.path == "/api/dashboard":
            self._send_json(fetch_dashboard())
            return
        if parsed.path == "/api/offers":
            self._send_json(generate_offer_set())
            return
        if parsed.path == "/api/experience":
            params = parse_qs(parsed.query)
            room_id = params.get("room", ["drift-01"])[0]
            self._send_json(build_journey_room(room_id))
            return
        if parsed.path == "/api/seo":
            self._send_json(build_seo_feed_bundle())
            return
        if parsed.path == "/api/brand/voice":
            self._send_json(fetch_brand_voice())
            return
        if parsed.path == "/api/creative/moods":
            self._send_json({"moods": fetch_mood_states()})
            return
        if parsed.path == "/api/rag/search":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0]
            self._send_json({"results": search_rag(query, limit=5)})
            return
        if parsed.path == "/api/admin/personalization":
            conn = connect_db()
            rows = conn.execute(
                "SELECT session_id, consent, interests, last_seen FROM user_profiles ORDER BY last_seen DESC LIMIT 20"
            ).fetchall()
            conn.close()
            self._send_json({"profiles": [dict(row) for row in rows]})
            return

        if parsed.path in ["/", "/index.html"]:
            self._serve_file("index.html")
            return
        if parsed.path in ["/dashboard", "/dashboard.html"]:
            self._serve_file("dashboard.html")
            return
        if parsed.path in ["/leads", "/leads.html"]:
            self._serve_file("leads.html")
            return
        if parsed.path == "/robots.txt":
            self._send_text("User-agent: *\nAllow: /\nSitemap: http://127.0.0.1:8000/sitemap.xml\n", content_type="text/plain")
            return
        if parsed.path == "/sitemap.xml":
            self._send_text(generate_sitemap(), content_type="application/xml")
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/lead":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                result = save_lead(
                    email=payload.get("email", ""),
                    topic=payload.get("topic", "general"),
                    source=payload.get("source", "website"),
                )
                self._send_json({"ok": True, "result": result}, status=200)
                return
            except ValueError as exc:  # JSON decode or validation issue
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        if parsed.path == "/api/checkout":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                amount = float(payload.get("amount", 0.0) or 0.0)
                result = save_sale(
                    email=payload.get("email", ""),
                    product=payload.get("product", "ghost-brief"),
                    amount=amount,
                )
                provider = create_stripe_checkout_session(payload.get("email", ""), payload.get("product", "ghost-brief"), amount)
                result["provider"] = provider
                self._send_json({"ok": True, "result": result}, status=200)
                return
            except (ValueError, TypeError) as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        if parsed.path == "/api/consent":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                session_id = payload.get("session_id") or "anonymous"
                consent = payload.get("consent", "declined")
                interests = payload.get("interests", []) or []
                conn = connect_db()
                conn.execute(
                    "INSERT INTO user_profiles (session_id, consent, interests, last_seen) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                    (session_id, consent, json.dumps(interests)),
                )
                conn.commit()
                conn.close()
                self._send_json({"ok": True, "consent": consent, "interests": interests}, status=200)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        if parsed.path == "/api/interest":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                session_id = payload.get("session_id") or "anonymous"
                interest = payload.get("interest", "general")
                conn = connect_db()
                conn.execute(
                    "INSERT INTO user_profiles (session_id, consent, interests, last_seen) VALUES (?, 'accepted', ?, CURRENT_TIMESTAMP)",
                    (session_id, json.dumps([interest])),
                )
                conn.commit()
                conn.close()
                self._send_json({"ok": True, "interest": interest}, status=200)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        if parsed.path == "/api/seo/refresh":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                result = queue_seo_refresh(payload.get("topic", "local-ai-business"))
                self._send_json({"ok": True, "result": result}, status=200)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        if parsed.path == "/api/rag/add":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = self.rfile.read(length).decode("utf-8") if length else ""
                payload = json.loads(body or "{}")
                result = rag_store.add_document(
                    payload.get("source", "manual"),
                    payload.get("title", "Manual note"),
                    payload.get("text", ""),
                )
                self._send_json({"ok": True, "result": result}, status=200)
                return
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=400)
                return
        self._send_json({"ok": False, "error": "not_found"}, status=404)

    def log_message(self, format, *args):
        return

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_text(self, payload: str, content_type: str = "text/plain"):
        body = payload.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, filename: str):
        target = WEBROOT / filename
        if not target.exists():
            self.send_error(404, "Not Found")
            return
        content = target.read_bytes()
        mime = "text/html; charset=utf-8"
        if filename.endswith(".css"):
            mime = "text/css; charset=utf-8"
        elif filename.endswith(".js"):
            mime = "application/javascript; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    ensure_schema()
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), BusinessHandler)
    print(f"Serving {WEBROOT} on http://127.0.0.1:{PORT}")
    httpd.serve_forever()
