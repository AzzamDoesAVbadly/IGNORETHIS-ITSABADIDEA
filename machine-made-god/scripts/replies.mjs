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
import { readFileSync as readBytes } from "node:fs";
import { renderReactionGif } from "./lib/gif.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const DRY = process.argv.includes("--dry-run");
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

const config = readJson(join(root, "machine.config.json"));
const cfg = { enabled: true, maxPerRun: 5, maxPerDay: 25, clapbacks: true, maxClapbacksPerDay: 10, ...(config.replies || {}) };
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

Choose ONE action:

"skip" if ANY of these apply: hateful slurs or attacks on identity (race, religion, gender, sexuality, disability, body); threats or violence; sexual content; self-harm, tragedy, crime, war, real politics or real named people; spam, scams, crypto or self-promotion; asks for personal info, money, or a business deal (a human handles those); a reply would feel creepy, unwelcome or pointless.

"clapback" if they're trolling or insulting us or our content (rude, dismissive, "this is garbage", "AI slop", picking a fight) and nothing above applies. We answer trolls ONLY with a reaction GIF. Write "roast": a short caption for the GIF (max 45 characters) that roasts their take or their energy. Savage but playful, the way a brand account claps back: no profanity, no slurs, nothing about identity, looks, body, intelligence or disability, no threats.

"reply" for everyone else (fans, jokes, questions, harmless comments). Write "reply": deadpan, warm and genuinely funny, under 200 characters. Never mock the person. No links, no hashtags, at most one emoji. Never claim to be human; if asked whether you're a bot, cheerfully confirm it in character.

Return ONLY JSON: {"action": "reply" | "clapback" | "skip", "reason": "short reason", "reply": "reply text or empty", "roast": "GIF caption or empty"}`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["action", "reason", "reply", "roast"],
      properties: { action: { type: "string", enum: ["reply", "clapback", "skip"] }, reason: { type: "string" }, reply: { type: "string" }, roast: { type: "string" } },
    },
    schemaName: "reply",
  };
}

const ROAST_BLOCK = /\b(fuck|shit|bitch|cunt|whore|slut|dick|stupid|idiot|moron|ugly|fat|dumb|kill|die|cancer)\w*\b/i;

export function checkReply(json) {
  const action = json.action || (json.skip === true ? "skip" : "reply");
  if (action === "skip") return { skip: true, reason: String(json.reason || "model chose to skip") };
  const bad = (m) => {
    throw new ProviderError(m, { kind: "bad_output" });
  };
  if (action === "clapback") {
    const roast = String(json.roast || "").trim().replace(/^["“]|["”]$/g, "");
    if (roast.length < 3 || roast.length > 60) bad("roast length out of range");
    if (ROAST_BLOCK.test(roast) || SKIP_WORDS.test(roast)) bad("roast crossed the line");
    if (/https?:\/\/|#\w|@\w/.test(roast)) bad("roast contains links, tags or handles");
    return { skip: false, clapback: true, roast, reason: String(json.reason || "troll") };
  }
  const reply = String(json.reply || "").trim().replace(/^["“]|["”]$/g, "");
  if (reply.length < 2 || reply.length > 240) bad("reply length out of range");
  if (/https?:\/\/|www\.|#\w/.test(reply)) bad("reply contains links or hashtags");
  if (SKIP_WORDS.test(reply)) bad("reply contains a blocked word");
  if (BANNED_PHRASES.some((p) => reply.toLowerCase().includes(p))) bad("reply contains a banned phrase");
  return { skip: false, reply };
}

// Clapbacks: one per person per week, and a daily cap, so it never turns into a feud.
function clapbackAllowed(network, from) {
  if (!cfg.clapbacks) return false;
  const week = Date.now() - 7 * 86400e3;
  if (log.some((e) => e.clapback && e.network === network && e.from === from && new Date(e.at).getTime() > week)) return false;
  return log.filter((e) => e.clapback && e.at.startsWith(today)).length < cfg.maxClapbacksPerDay;
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
      if (d.clapback && !clapbackAllowed("bluesky", n.author.handle)) {
        console.log(`  – no clapback for @${n.author.handle} (weekly/daily limit)`);
        record({ network: "bluesky", from: n.author.handle, text: text.slice(0, 280), replied: false, reason: "troll (clapback limit reached)" });
        continue;
      }
      console.log(`  → @${n.author.handle}: "${text.slice(0, 80)}"\n    ↳ ${d.clapback ? `[GIF] ${d.roast}` : d.reply}`);
      if (DRY) continue;
      const parent = { uri: n.uri, cid: n.cid };
      const rootRef = n.record?.reply?.root || parent;
      const postRecord = { $type: "app.bsky.feed.post", text: d.clapback ? "" : d.reply, createdAt: new Date().toISOString(), reply: { root: rootRef, parent } };
      if (d.clapback) {
        const gif = renderReactionGif(d.roast);
        const blobRes = await fetch(`${service}/xrpc/com.atproto.repo.uploadBlob`, { method: "POST", headers: { ...auth, "Content-Type": "video/mp4" }, body: readBytes(gif.mp4) });
        if (!blobRes.ok) throw new Error(`GIF upload failed: HTTP ${blobRes.status}`);
        const { blob } = await blobRes.json();
        postRecord.embed = { $type: "app.bsky.embed.video", video: blob, alt: d.roast, aspectRatio: { width: gif.width, height: gif.height }, presentation: "gif" };
      }
      const res = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ repo: session.did, collection: "app.bsky.feed.post", record: postRecord }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const { uri } = await res.json();
      budget--;
      record({ network: "bluesky", from: n.author.handle, text: text.slice(0, 280), replied: true, reply: d.clapback ? `[GIF] ${d.roast}` : d.reply, clapback: Boolean(d.clapback), url: `https://bsky.app/profile/${session.handle}/post/${uri.split("/").pop()}` });
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

async function mastodonUploadGif(base, auth, file, alt) {
  const form = new FormData();
  form.append("file", new Blob([readBytes(file)], { type: "image/gif" }), "reaction.gif");
  form.append("description", alt);
  let media = await fetch(`${base}/api/v2/media`, { method: "POST", headers: auth, body: form }).then((r) => r.json());
  for (let i = 0; i < 20 && media.id && !media.url; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    media = await fetch(`${base}/api/v1/media/${media.id}`, { headers: auth }).then((r) => r.json());
  }
  if (!media.id) throw new Error(`GIF upload failed: ${JSON.stringify(media).slice(0, 200)}`);
  return media.id;
}

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
      if (d.clapback && !clapbackAllowed("mastodon", n.account.acct)) {
        console.log(`  – no clapback for @${n.account.acct} (weekly/daily limit)`);
        record({ network: "mastodon", from: n.account.acct, text: text.slice(0, 280), replied: false, reason: "troll (clapback limit reached)" });
        await dismiss();
        continue;
      }
      console.log(`  → @${n.account.acct}: "${text.slice(0, 80)}"\n    ↳ ${d.clapback ? `[GIF] ${d.roast}` : d.reply}`);
      if (DRY) continue;
      const payload = { status: d.clapback ? `@${n.account.acct}` : `@${n.account.acct} ${d.reply}`, in_reply_to_id: status.id, visibility: status.visibility === "direct" ? "direct" : "unlisted" };
      if (d.clapback) payload.media_ids = [await mastodonUploadGif(base, auth, renderReactionGif(d.roast).gif, d.roast)];
      const res = await fetch(`${base}/api/v1/statuses`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json", "Idempotency-Key": `mmg-reply-${status.id}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      budget--;
      record({ network: "mastodon", from: n.account.acct, text: text.slice(0, 280), replied: true, reply: d.clapback ? `[GIF] ${d.roast}` : d.reply, clapback: Boolean(d.clapback), url: (await res.json()).url });
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
