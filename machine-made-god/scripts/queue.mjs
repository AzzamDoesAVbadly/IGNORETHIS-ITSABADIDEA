#!/usr/bin/env node
// Download queue for reference videos and GitHub Actions artifacts.
//   npm run queue -- sync            enqueue every unexpired shorts-* artifact from GitHub
//   npm run queue -- add <url...>    enqueue video URLs (YouTube etc.)
//   npm run queue -- list            show status
//   npm run queue -- run             download everything pending (failed items are retried)
// State: queue/queue.json. Files: queue/downloads/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const FILE = join(root, "queue/queue.json");
const DL = join(root, "queue/downloads");
const REPO = "AzzamDoesAVbadly/IGNORETHIS-ITSABADIDEA";
const [cmd, ...rest] = process.argv.slice(2);

const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : []);
const save = (q) => { mkdirSync(join(root, "queue"), { recursive: true }); writeFileSync(FILE, JSON.stringify(q, null, 2) + "\n"); };
const enqueue = (q, item) => {
  if (q.some((i) => i.id === item.id)) return false;
  q.push({ status: "pending", added: new Date().toISOString(), ...item });
  return true;
};

if (cmd === "sync") {
  const q = load();
  const out = execFileSync("gh", ["api", `repos/${REPO}/actions/artifacts`, "--paginate", "--jq", ".artifacts[]|select(.expired==false)|select(.name|startswith(\"shorts-\"))|[.id,.name]|@tsv"], { encoding: "utf8" });
  let n = 0;
  for (const line of out.trim().split("\n").filter(Boolean)) {
    const [id, name] = line.split("\t");
    n += enqueue(q, { id: `gh:${id}`, type: "artifact", name, ref: name }) ? 1 : 0;
  }
  save(q);
  console.log(`queued ${n} new artifacts`);
} else if (cmd === "add") {
  const q = load();
  for (const raw of rest) {
    const url = raw.trim().replace(/[|\s]+$/, "");
    const added = enqueue(q, { id: `url:${url}`, type: "url", ref: url });
    console.log(`${added ? "queued " : "already"} ${url}`);
  }
  save(q);
} else if (cmd === "list") {
  for (const i of load()) console.log(`${i.status.padEnd(8)} ${i.type.padEnd(8)} ${i.ref}${i.error ? `  !! ${i.error}` : ""}`);
} else if (cmd === "run") {
  const q = load();
  mkdirSync(DL, { recursive: true });
  for (const item of q.filter((i) => i.status !== "done")) {
    console.log(`→ ${item.ref}`);
    try {
      if (item.type === "artifact") {
        const runId = item.name.replace("shorts-", "");
        execFileSync("gh", ["run", "download", runId, "-R", REPO, "-n", item.name, "-D", join(DL, item.name)], { stdio: "pipe" });
      } else {
        execFileSync("python3", ["-m", "yt_dlp", "-f", "mp4/bestvideo*+bestaudio/best", "--no-playlist", "-o", join(DL, "%(id)s.%(ext)s"), item.ref], { stdio: "pipe" });
      }
      Object.assign(item, { status: "done", error: undefined, finished: new Date().toISOString() });
      console.log("  ✓ done");
    } catch (e) {
      const msg = String(e.stderr || e.message).trim().split("\n").filter((l) => /error/i.test(l)).pop() || String(e.message);
      Object.assign(item, { status: "failed", error: msg.slice(0, 200) });
      console.log(`  ✗ ${item.error}`);
    }
    save(q);
  }
} else {
  console.log("usage: queue.mjs sync | add <url...> | list | run");
  process.exit(1);
}
