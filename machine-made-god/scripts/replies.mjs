#!/usr/bin/env node
// Reply bot: answers mentions/replies on Bluesky and Mastodon in the site's voice.
// Safety first: a keyword skip-list, an AI "should we even reply?" check, per-run and
// per-day caps, and every handled notification is marked read so nobody gets two replies.
//
//   npm run replies               reply for real
//   npm run replies -- --dry-run  show what it would say, post nothing, mark nothing

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spin, ProviderError } from "./lib/roulette.mjs";
import { BANNED_PHRASES } from "../src/lib/schema.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const DRY = process.argv.includes("--dry-run");
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

const config = readJson(join(root, "machine.config.json"));
const cfg = { enabled: true, maxPerRun: 5, maxPerDay: 25, ...(config.replies || {}) };
const state = readJson(join(root, "src/data/machine-state.json"), { providers: {} });
const SITE = (env.SITE_URL || readJson(join(root, "src/data/site.json")).url).replace(/\/$/, "");
const LOG = join(root, "src/data/replies-log.json");
const log = readJson(LOG, []);
const voice = readFileSync(join(root, "prompts/voice.md"), "utf8");

// Never engage with these, whatever the AI thinks.
const SKIP_WORDS = /\b(suicid\w*|kill (?:my|your)self|self[- ]harm|rape\w*|nazi\w*|genocide|terroris\w*|shooting|pedo\w*|n[i1]gg\w*|f[a4]gg\w*|retard\w*|tr[a4]nn\w*)\b/i;

const today = new Date().toISOString().slice(0, 10);
let budget = Math.min(cfg.maxPerRun, cfg.maxPerDay - log.filter((e) => e.at.startsWith(today) && e.replied).length);

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

export function decidePrompt({ network, from, text, isReplyToUs }) {
  return {
    system: voice,
    user: `You run the social account for MACHINE MADE GOD, an openly AI-written satirical media site. Someone on ${network} ${isReplyToUs ? "replied to our post" : "mentioned us"}.

From: @${from}
Their message: """${text.slice(0, 1000)}"""

Decide whether to reply. Set "skip": true if ANY of these apply: hostile, harassing or trolling; hateful or sexual; about self-harm, tragedy, crime, war, real politics or real named people; spam, scams, crypto or self-promotion; asks for personal info, money, or a business deal (a human handles those); a reply would feel creepy, unwelcome or pointless.

Otherwise write a reply: deadpan, warm and genuinely funny, in the site's voice. Under 200 characters. Never mock the person. No links, no hashtags, at most one emoji. Never claim to be human; if they ask whether you're a bot, cheerfully confirm it in character. Don't invent facts about real people or events.

Return ONLY JSON: {"skip": true|false, "reason": "short reason", "reply": "the reply, or empty string if skipping"}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["skip", "reason", "reply"],
      properties: { skip: { type: "boolean" }, reason: { type: "string" }, reply: { type: "string" } },
    },
    schemaName: "reply",
  };
}

export function checkReply(json) {
  if (json.skip === true) return { skip: true, reason: String(json.reason || "model chose to skip") };
  const reply = String(json.reply || "").trim().replace(/^["“]|["”]$/g, "");
  const bad = (m) => {
    throw new ProviderError(m, { kind: "bad_output" });
  };
  if (reply.length < 2 || reply.length > 240) bad("reply length out of range");
  if (/https?:\/\/|www\.|#\w/.test(reply)) bad("reply contains links or hashtags");
  if (SKIP_WORDS.test(reply)) bad("reply contains a blocked word");
  if (BANNED_PHRASES.some((p) => reply.toLowerCase().includes(p))) bad("reply contains a banned phrase");
  return { skip: false, reply };
}

async function decide(input) {
  if (SKIP_WORDS.test(input.text)) return { skip: true, reason: "blocked keyword" };
  const { item } = await spin(decidePrompt(input), checkReply, ctx);
  return item;
}

// Business/money/press messages get flagged for a human in Mission Control.
export const needsHuman = (reason) => /business|deal|sponsor|partner|collab|advertis|press|interview|money|pay|hire|licens/i.test(String(reason));
const postUrl = (n) => `https://bsky.app/profile/${n.author.handle}/post/${String(n.uri).split("/").pop()}`;

function record(entry) {
  log.unshift({ at: new Date().toISOString(), ...entry });
}

// ---------- Bluesky ----------

async function bluesky() {
  if (!env.BLUESKY_HANDLE || !env.BLUESKY_APP_PASSWORD) return console.log("Bluesky: not connected, skipping.");
  const service = (env.BLUESKY_SERVICE || "https://bsky.social").replace(/\/$/, "");
  const session = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD }),
  }).then(async (r) => (r.ok ? r.json() : Promise.reject(new Error(`Bluesky login failed: HTTP ${r.status}`))));
  const auth = { Authorization: `Bearer ${session.accessJwt}` };
  const { notifications = [] } = await fetch(`${service}/xrpc/app.bsky.notification.listNotifications?limit=50`, { headers: auth }).then((r) => r.json());
  const todo = notifications.filter((n) => !n.isRead && ["mention", "reply", "quote"].includes(n.reason) && n.author?.did !== session.did).reverse();
  console.log(`Bluesky: ${todo.length} new mention(s)/reply(s).`);

  for (const n of todo) {
    if (budget <= 0) break;
    const text = n.record?.text || "";
    try {
      const d = await decide({ network: "Bluesky", from: n.author.handle, text, isReplyToUs: n.reason === "reply" });
      if (d.skip) {
        console.log(`  – skip @${n.author.handle}: ${d.reason}`);
        record({ network: "bluesky", from: n.author.handle, text: text.slice(0, 280), replied: false, reason: d.reason, needsYou: needsHuman(d.reason), url: postUrl(n) });
        continue;
      }
      console.log(`  → @${n.author.handle}: "${text.slice(0, 80)}"\n    ↳ ${d.reply}`);
      if (DRY) continue;
      const parent = { uri: n.uri, cid: n.cid };
      const rootRef = n.record?.reply?.root || parent;
      const res = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record: { $type: "app.bsky.feed.post", text: d.reply, createdAt: new Date().toISOString(), reply: { root: rootRef, parent } },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const { uri } = await res.json();
      budget--;
      record({ network: "bluesky", from: n.author.handle, text: text.slice(0, 280), replied: true, reply: d.reply, url: `https://bsky.app/profile/${session.handle}/post/${uri.split("/").pop()}` });
    } catch (err) {
      console.log(`  ✗ @${n.author.handle}: ${err.message}`);
      record({ network: "bluesky", from: n.author.handle, text: text.slice(0, 280), replied: false, error: err.message.slice(0, 200) });
    }
  }
  // Mark everything we looked at as seen so it's never answered twice.
  if (!DRY && todo.length && budget >= 0) {
    await fetch(`${service}/xrpc/app.bsky.notification.updateSeen`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ seenAt: new Date().toISOString() }),
    });
  }
}

// ---------- Mastodon ----------

const stripHtml = (html) =>
  String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

async function mastodon() {
  if (!env.MASTODON_INSTANCE || !env.MASTODON_TOKEN) return console.log("Mastodon: not connected, skipping.");
  const base = env.MASTODON_INSTANCE.replace(/\/$/, "");
  const auth = { Authorization: `Bearer ${env.MASTODON_TOKEN}` };
  const notes = await fetch(`${base}/api/v1/notifications?types[]=mention&limit=30`, { headers: auth }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Mastodon HTTP ${r.status}`))));
  console.log(`Mastodon: ${notes.length} new mention(s).`);

  for (const n of notes.reverse()) {
    if (budget <= 0) break;
    const status = n.status;
    if (!status) continue;
    const text = stripHtml(status.content).replace(/(^|\s)@\S+/g, " ").trim();
    const dismiss = () => !DRY && fetch(`${base}/api/v1/notifications/${n.id}/dismiss`, { method: "POST", headers: auth });
    try {
      const d = await decide({ network: "Mastodon", from: n.account.acct, text, isReplyToUs: Boolean(status.in_reply_to_id) });
      if (d.skip) {
        console.log(`  – skip @${n.account.acct}: ${d.reason}`);
        record({ network: "mastodon", from: n.account.acct, text: text.slice(0, 280), replied: false, reason: d.reason, needsYou: needsHuman(d.reason), url: status.url });
        await dismiss();
        continue;
      }
      console.log(`  → @${n.account.acct}: "${text.slice(0, 80)}"\n    ↳ ${d.reply}`);
      if (DRY) continue;
      const res = await fetch(`${base}/api/v1/statuses`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", "Idempotency-Key": `mmg-reply-${status.id}` },
        body: JSON.stringify({ status: `@${n.account.acct} ${d.reply}`, in_reply_to_id: status.id, visibility: status.visibility === "direct" ? "direct" : "unlisted" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      budget--;
      record({ network: "mastodon", from: n.account.acct, text: text.slice(0, 280), replied: true, reply: d.reply, url: (await res.json()).url });
      await dismiss();
    } catch (err) {
      console.log(`  ✗ @${n.account.acct}: ${err.message}`);
      record({ network: "mastodon", from: n.account.acct, text: text.slice(0, 280), replied: false, error: err.message.slice(0, 200) });
    }
  }
}

async function main() {
  if (cfg.enabled === false || String(env.MACHINE_ENABLED).toLowerCase() === "false" || String(env.REPLIES_ENABLED).toLowerCase() === "false") {
    console.log("Reply bot is switched off.");
    return;
  }
  if (budget <= 0) {
    console.log(`Daily reply cap (${cfg.maxPerDay}) reached. Back tomorrow.`);
    return;
  }
  const before = log.length;
  for (const net of [bluesky, mastodon]) {
    try {
      await net();
    } catch (err) {
      console.log(`${net.name}: ${err.message}`);
    }
  }
  if (!DRY && log.length !== before) writeFileSync(LOG, JSON.stringify(log.slice(0, 300), null, 2) + "\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
