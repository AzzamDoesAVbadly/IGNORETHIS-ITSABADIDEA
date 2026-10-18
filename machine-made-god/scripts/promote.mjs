#!/usr/bin/env node
// Auto-promotion: posts new articles to Bluesky and Mastodon with an AI-written
// caption, and pings IndexNow so search engines index new pages quickly.
// Every network is optional; missing credentials just skip that network.
//
//   node scripts/promote.mjs --new [--wait]   promote everything from the latest machine run
//   node scripts/promote.mjs --latest         promote the newest article not yet promoted
//   node scripts/promote.mjs --slug <slug>    promote one article (or quiz)
//   add --dry-run to print instead of posting

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spin } from "./lib/roulette.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const DRY = has("--dry-run");
const SITE = (env.SITE_URL || "https://machinemadegod.netlify.app").replace(/\/$/, "");
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

const config = readJson(join(root, "machine.config.json"));
const state = readJson(join(root, "src/data/machine-state.json"), { providers: {}, runs: [] });
const logPath = join(root, "src/data/promo-log.json");
const promoLog = readJson(logPath, []);
const voice = readFileSync(join(root, "prompts/voice.md"), "utf8");
const promo = config.promotion || {};

// ---------- what to promote ----------

function loadItem(slug) {
  const md = join(root, "src/content/articles", `${slug}.md`);
  if (existsSync(md)) {
    const text = readFileSync(md, "utf8");
    const fm = {};
    for (const line of (text.match(/^---\n([\s\S]*?)\n---/)?.[1] || "").split("\n")) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (!m) continue;
      try { fm[m[1]] = JSON.parse(m[2]); } catch { fm[m[1]] = m[2].replace(/^"|"$/g, ""); }
    }
    if (fm.draft === true) return null;
    return { slug, kind: "article", title: fm.title, dek: fm.dek, quote: fm.pullquote, url: `${SITE}/a/${slug}/` };
  }
  const qz = join(root, "src/content/quizzes", `${slug}.json`);
  if (existsSync(qz)) {
    const q = readJson(qz);
    if (q.draft) return null;
    return { slug, kind: "quiz", title: q.title, dek: q.dek, url: `${SITE}/quiz/${slug}/` };
  }
  return null;
}

const promoted = new Set(promoLog.filter((e) => e.ok && e.network !== "indexnow").map((e) => e.slug));

function targets() {
  if (arg("--slug")) return [arg("--slug")];
  if (has("--latest")) {
    for (const run of state.runs || []) for (const a of run.articles || []) if (!promoted.has(a.slug)) return [a.slug];
    return [];
  }
  const run = (state.runs || [])[0];
  if (!run) return [];
  return [...(run.articles || []).map((a) => a.slug), ...(run.quiz ? [run.quiz.slug] : [])].filter((s) => !promoted.has(s));
}

// ---------- helpers ----------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntilLive(url, maxMinutes = 8) {
  const until = Date.now() + maxMinutes * 60000;
  while (Date.now() < until) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch {}
    await wait(15000);
  }
  return false;
}

export function templateCaption(item) {
  const hook = item.kind === "quiz" ? `New quiz: ${item.title}` : item.title;
  const extra = item.quote && item.quote.length < 120 ? `\n\n“${item.quote}”` : "";
  return `${hook}${extra}`.slice(0, 240);
}

async function aiCaption(item) {
  if (!promo.aiCaptions) return templateCaption(item);
  const ctx = {
    config: { ...config, maxAttemptsPerPiece: 3 },
    state,
    env,
    random: Math.random,
    log: () => {},
    siteUrl: SITE,
    remember: (id, patch) => (state.providers[id] = { ...(state.providers[id] || {}), ...patch }),
    record: () => {},
  };
  try {
    const { item: caption } = await spin(
      {
        system: voice,
        user: `Write one social media post promoting this ${item.kind} from our satirical site. Deadpan, specific, and funny on its own; make people want to click. Under 200 characters. At most one hashtag. No links, no "click here", no emojis at the start.\n\nHeadline: ${item.title}\nSubhead: ${item.dek}\n\nReturn ONLY JSON: {"post": "..."}`,
        schema: { type: "object", additionalProperties: false, required: ["post"], properties: { post: { type: "string" } } },
        schemaName: "caption",
      },
      (json) => {
        const post = String(json.post || "").trim().replace(/^["“]|["”]$/g, "");
        if (post.length < 20 || post.length > 240 || /https?:\/\//.test(post)) throw Object.assign(new Error("bad caption"), { kind: "bad_output" });
        return post;
      },
      ctx
    );
    return caption;
  } catch {
    return templateCaption(item);
  }
}

// ---------- networks ----------

async function postBluesky(item, caption) {
  const service = (env.BLUESKY_SERVICE || "https://bsky.social").replace(/\/$/, "");
  const session = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
  }).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(`login failed: HTTP ${r.status} ${await r.text()}`))));
  const res = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessJwt}` },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: caption.slice(0, 290),
        createdAt: new Date().toISOString(),
        embed: { $type: "app.bsky.embed.external", external: { uri: item.url, title: item.title, description: item.dek || "" } },
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const { uri } = await res.json();
  return `https://bsky.app/profile/${session.handle || env.BLUESKY_HANDLE}/post/${uri.split("/").pop()}`;
}

async function postMastodon(item, caption) {
  const instance = env.MASTODON_INSTANCE.replace(/\/$/, "");
  const res = await fetch(`${instance}/api/v1/statuses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.MASTODON_TOKEN}`, "Idempotency-Key": `mmg-${item.slug}` },
    body: JSON.stringify({ status: `${caption}\n\n${item.url}`.slice(0, 495), visibility: "public" }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).url;
}

async function pingIndexNow(urls) {
  const key = promo.indexNowKey;
  const host = new URL(SITE).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
  });
  if (![200, 202].includes(res.status)) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return `${urls.length} URL(s) submitted`;
}

export const networks = {
  bluesky: { ready: () => Boolean(env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD), post: postBluesky },
  mastodon: { ready: () => Boolean(env.MASTODON_INSTANCE && env.MASTODON_TOKEN), post: postMastodon },
};

// ---------- main ----------

async function main() {
  if (promo.enabled === false || String(env.PROMOTION_ENABLED).toLowerCase() === "false") {
    console.log("Promotion is switched off.");
    return;
  }
  const items = targets().map(loadItem).filter(Boolean);
  if (!items.length) {
    console.log("Nothing new to promote.");
    return;
  }
  const live = Object.entries(networks).filter(([, n]) => n.ready());
  console.log(`Promoting ${items.length} item(s) to: ${[...live.map(([k]) => k), promo.indexNowKey ? "indexnow" : null].filter(Boolean).join(", ") || "nothing configured"}${DRY ? " (dry run)" : ""}`);

  if (has("--wait") && !DRY) {
    const ok = await waitUntilLive(items[0].url);
    if (!ok) {
      console.log(`Gave up waiting for ${items[0].url} to go live; will not post broken links.`);
      return;
    }
  }

  const at = new Date().toISOString();
  for (const item of items) {
    const caption = await aiCaption(item);
    console.log(`\n• ${item.title}\n  caption: ${caption}`);
    for (const [name, net] of live) {
      if (DRY) { console.log(`  [dry] would post to ${name}`); continue; }
      try {
        const url = await net.post(item, caption);
        promoLog.unshift({ at, slug: item.slug, network: name, ok: true, url, caption });
        console.log(`  ✓ ${name}: ${url}`);
      } catch (err) {
        promoLog.unshift({ at, slug: item.slug, network: name, ok: false, error: String(err.message).slice(0, 200) });
        console.log(`  ✗ ${name}: ${err.message}`);
      }
    }
  }

  if (promo.indexNowKey && !DRY) {
    try {
      const detail = await pingIndexNow([...items.map((i) => i.url), `${SITE}/`]);
      promoLog.unshift({ at, slug: items.map((i) => i.slug).join(","), network: "indexnow", ok: true, detail });
      console.log(`  ✓ indexnow: ${detail}`);
    } catch (err) {
      promoLog.unshift({ at, slug: items.map((i) => i.slug).join(","), network: "indexnow", ok: false, error: String(err.message).slice(0, 200) });
      console.log(`  ✗ indexnow: ${err.message}`);
    }
  }

  if (!DRY) writeFileSync(logPath, JSON.stringify(promoLog.slice(0, 200), null, 2) + "\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    // Promotion is best-effort; never fail the pipeline over it.
    console.log(`Promotion error (ignored): ${err.message}`);
  });
}
