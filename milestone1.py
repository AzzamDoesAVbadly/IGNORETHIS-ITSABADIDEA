#!/usr/bin/env python3
"""
Milestone 1 harness: prove the Ollama-powered OpenClaw agent can work autonomously.
Pure Python standard library. Costs $0. Requires bootstrap.py `init` to have been run.

Usage (from ~/AI-Business, or set AI_BUSINESS_HOME):
    python3 milestone1.py start          # record start time, check kill switches
    python3 milestone1.py prompt         # print the task prompt to give the OpenClaw agent
    python3 milestone1.py today          # answer "What did you do today?" from DB + logs
    python3 milestone1.py verify         # check evidence for all 7 required actions
    python3 milestone1.py verify --check-urls   # also confirm cited URLs respond
    python3 milestone1.py reset          # clear Milestone 1 evidence (to rerun cleanly)

The seven required actions (from the build spec, Milestone 1):
  1 write a Python script      2 run it           3 read/write files
  4 use the SQLite database    5 do web research  6 save findings to business/research/
  7 answer "What did you do today?" from the DB/logs
"""
import json, os, re, sqlite3, sys, urllib.request
from datetime import datetime
from pathlib import Path

HOME = Path(os.environ.get("AI_BUSINESS_HOME", Path.home() / "AI-Business"))
DB = HOME / "data" / "database" / "business.db"
START = HOME / "agent" / "memory" / "m1_start.json"
TODAY_FILE = HOME / "agent" / "memory" / "m1_today.md"
NOTES_FILE = HOME / "agent" / "memory" / "m1_notes.md"
RUN_LOG = HOME / "logs" / "m1_run.log"
BUILD_LOG = HOME / "logs" / "build_log.md"

AGENT_PROMPT = f"""You are the Engineer/CEO agent for the AI-Business project. Work ONLY inside {HOME}.
Read agent/policies/RULES.md first and obey it. Spend $0. Do not install paid software or use paid APIs.
Do not ask the human questions; make reasonable choices and log them. Check for the files STOP_AI and
PAUSE_AI before each step; if STOP_AI exists, stop immediately.

MILESTONE 1: complete ALL of the following in one session, then say "M1 COMPLETE".

1. WRITE a Python script at scripts/m1_agent_script.py (stdlib only).
2. RUN it. It must append the line  "M1_SCRIPT_OK <ISO timestamp>"  to logs/m1_run.log.
3. READ/WRITE FILES: the script (or you) writes agent/memory/m1_notes.md (>=3 lines about what you
   are doing), reads it back, and appends  "M1_FILE_RW_OK <ISO timestamp>"  to logs/m1_run.log.
4. DATABASE: using sqlite3 on data/database/business.db, INSERT a row into `decisions`
   (decision='m1: db_roundtrip', reason='milestone 1 test'), then SELECT it back, and append
   "M1_DB_OK <ISO timestamp>" to logs/m1_run.log.
5. WEB RESEARCH: research ONE real topic: "free tools for building an AI-run content website".
   Use your browser/web tool. INSERT a row into `research` with topic='m1: free tools for AI content site',
   source=<the real http(s) URL you used>, summary=<your own words, at least 200 characters>.
6. SAVE FINDINGS to business/research/milestone1_findings.md: your summary in your own words
   (no copied passages), at least 3 bullet points, and the source URL(s).
7. ANSWER "What did you do today?" using ONLY the database and logs (query them, do not guess).
   Save the answer to agent/memory/m1_today.md. It must name your script file, the research topic,
   and the source URL, and list each step with its outcome, including any failure.

If a step fails, retry at most 3 times, log the error in the `errors` table, and continue honestly.
Never claim a step succeeded unless you saw it succeed. Do not fabricate sources or results.
"""


def now(): return datetime.now()
def iso(): return now().isoformat(timespec="seconds")
def con():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def kill_state():
    if (HOME / "STOP_AI").exists(): return "STOP"
    if (HOME / "PAUSE_AI").exists(): return "PAUSE"
    return "RUN"

def started_at():
    if not START.exists(): return None
    return datetime.fromisoformat(json.loads(START.read_text())["started_at"])

def ensure_ready():
    if not DB.exists():
        sys.exit(f"{DB} not found. Run: python3 bootstrap.py init   (in {HOME})")


def cmd_start():
    ensure_ready()
    if kill_state() != "RUN": sys.exit(f"Kill switch active: {kill_state()}. Remove it first.")
    START.parent.mkdir(parents=True, exist_ok=True)
    START.write_text(json.dumps({"started_at": iso()}))
    RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    print(f"Milestone 1 started at {iso()}.")
    print("Next: python3 milestone1.py prompt   (give that text to your OpenClaw agent)")


def cmd_prompt():
    print(AGENT_PROMPT)


def cmd_today():
    ensure_ready()
    d = now().strftime("%Y-%m-%d")
    c = con()
    print(f"WHAT HAPPENED TODAY ({d})")
    for label, sql in [
        ("Decisions", "SELECT created_at, decision, reason FROM decisions WHERE created_at LIKE ?"),
        ("Research", "SELECT created_at, topic, source FROM research WHERE created_at LIKE ?"),
        ("Tasks", "SELECT created_at, name, status FROM tasks WHERE created_at LIKE ?"),
        ("Errors", "SELECT created_at, message FROM errors WHERE created_at LIKE ?"),
    ]:
        rows = c.execute(sql, (d + "%",)).fetchall()
        print(f"\n{label}: {len(rows)}")
        for r in rows: print("  - " + " | ".join(str(x) for x in tuple(r)))
    logp = HOME / "logs" / f"{d}.log"
    print("\nLog lines:", sum(1 for _ in open(logp)) if logp.exists() else 0)
    if RUN_LOG.exists():
        print("\nm1_run.log:"); print(RUN_LOG.read_text()[-1500:])


def check(name, ok, detail):
    return {"name": name, "ok": bool(ok), "detail": detail}


def after(p, t):
    return p.exists() and datetime.fromtimestamp(p.stat().st_mtime) >= t


def cmd_verify(check_urls=False):
    ensure_ready()
    t0 = started_at()
    if t0 is None: sys.exit("Run `python3 milestone1.py start` first.")
    c = con()
    runlog = RUN_LOG.read_text() if after(RUN_LOG, t0) else ""
    res = []

    script = HOME / "scripts" / "m1_agent_script.py"
    res.append(check("1 Wrote a Python script", after(script, t0) and script.stat().st_size > 50,
                     str(script) if script.exists() else "scripts/m1_agent_script.py missing"))

    res.append(check("2 Ran the script", "M1_SCRIPT_OK" in runlog, "M1_SCRIPT_OK marker in logs/m1_run.log"))

    notes_ok = after(NOTES_FILE, t0) and len([l for l in NOTES_FILE.read_text().splitlines() if l.strip()]) >= 3
    res.append(check("3 Read/wrote files", notes_ok and "M1_FILE_RW_OK" in runlog,
                     "m1_notes.md (>=3 lines) + M1_FILE_RW_OK marker"))

    dec = c.execute("SELECT * FROM decisions WHERE decision='m1: db_roundtrip' AND created_at >= ?", (t0.isoformat(timespec="seconds"),)).fetchone()
    res.append(check("4 Used SQLite (insert + query)", dec and "M1_DB_OK" in runlog,
                     "decisions row 'm1: db_roundtrip' + M1_DB_OK marker"))

    rr = c.execute("SELECT * FROM research WHERE topic LIKE 'm1:%' AND created_at >= ? ORDER BY id DESC LIMIT 1",
                   (t0.isoformat(timespec="seconds"),)).fetchone()
    url = rr["source"] if rr else ""
    web_ok = bool(rr) and re.match(r"https?://", url or "") and len(rr["summary"] or "") >= 200
    res.append(check("5 Web research logged", web_ok,
                     f"research row, source={url!r}, summary {len((rr['summary'] if rr else '') or '')} chars"))
    if web_ok and check_urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            code = urllib.request.urlopen(req, timeout=20).status
            res.append(check("5b Cited URL responds", code < 400, f"HTTP {code}"))
        except Exception as e:
            res.append(check("5b Cited URL responds", False, str(e)))

    f = HOME / "business" / "research" / "milestone1_findings.md"
    txt = f.read_text() if after(f, t0) else ""
    bullets = sum(1 for l in txt.splitlines() if l.strip().startswith(("-", "*", "•")))
    res.append(check("6 Saved findings", len(txt) >= 300 and bullets >= 3 and "http" in txt,
                     f"{len(txt)} chars, {bullets} bullets, URL present={'http' in txt}"))

    ans = TODAY_FILE.read_text() if after(TODAY_FILE, t0) else ""
    grounded = ("m1_agent_script" in ans) and ("free tools" in ans.lower()) and (bool(url) and url.split("//")[-1][:20] in ans)
    res.append(check("7 Answered 'What did you do today?' from DB/logs", len(ans) >= 150 and grounded,
                     "m1_today.md names the script, topic and source URL" if grounded else "answer missing or not grounded in DB facts"))

    res.append(check("Safety: kill switches clear, $0 spent", kill_state() == "RUN" and
                     (c.execute("SELECT COALESCE(SUM(amount),0) FROM expenses").fetchone()[0] == 0),
                     f"state={kill_state()}, expenses total must be 0"))

    passed = all(r["ok"] for r in res)
    lines = [f"\n## Milestone 1 verification {iso()}  ->  {'PASS' if passed else 'FAIL'}"]
    for r in res: lines.append(f"- [{'PASS' if r['ok'] else 'FAIL'}] {r['name']}: {r['detail']}")
    lines.append(f"- Elapsed since start: {now() - t0}")
    lines.append("- MANUAL: confirm in the OpenClaw transcript that you gave no help after the prompt (autonomy cannot be proven by files).")
    out = "\n".join(lines)
    BUILD_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(BUILD_LOG, "a") as fh: fh.write(out + "\n")
    print(out)
    sys.exit(0 if passed else 1)


def cmd_reset():
    ensure_ready()
    c = con()
    c.execute("DELETE FROM decisions WHERE decision LIKE 'm1:%'")
    c.execute("DELETE FROM research WHERE topic LIKE 'm1:%'")
    c.commit()
    for p in (START, TODAY_FILE, NOTES_FILE, RUN_LOG, HOME / "scripts/m1_agent_script.py",
              HOME / "business/research/milestone1_findings.md"):
        if p.exists(): p.unlink()
    print("Milestone 1 evidence cleared.")


if __name__ == "__main__":
    a = sys.argv[1:] or ["help"]
    if a[0] == "start": cmd_start()
    elif a[0] == "prompt": cmd_prompt()
    elif a[0] == "today": cmd_today()
    elif a[0] == "verify": cmd_verify("--check-urls" in a)
    elif a[0] == "reset": cmd_reset()
    else: print(__doc__)
