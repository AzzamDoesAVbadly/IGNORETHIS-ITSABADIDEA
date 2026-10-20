#!/usr/bin/env node
// The learning loop: fetch engagement for everything the machine has posted, then
// aggregate it into "arms" (caption style per network, section, format, Shorts kind)
// that promote.mjs, generate.mjs and shorts.mjs use to pick what to do next.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { engagementScore } from "./lib/bandit.mjs";
import { xReady, xAccessToken } from "./lib/x.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);
const promoLog = readJson(join(root, "src/data/promo-log.json"), []);
const shortsLog = readJson(join(root, "src/data/shorts-log.json"), []);
const OUT = join(root, "src/data/engagement.json");
const prev = readJson(OUT, { posts: {} });
const HOUR = 3600e3;

async function blueskyMetrics(uris) {
  const out = {};
  for (let i = 0; i < uris.length; i += 25) {
    const q = uris.slice(i, i + 25).map((u) => `uris=${encodeURIComponent(u)}`).join("&");
    const data = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?${q}`).then((r) => r.json()).catch(() => ({}));
    for (const p of data.posts || []) out[p.uri] = { likes: p.likeCount, reposts: p.repostCount, replies: p.replyCount, quotes: p.quoteCount };
  }
  return out;
}

async function mastodonMetrics(ids) {
  const out = {};
  if (!env.MASTODON_INSTANCE) return out;
  const base = env.MASTODON_INSTANCE.replace(/\/$/, "");
  for (const id of ids) {
    const s = await fetch(`${base}/api/v1/statuses/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (s) out[id] = { likes: s.favourites_count, reposts: s.reblogs_count, replies: s.replies_count };
  }
  return out;
}

async function xMetrics(ids) {
  const out = {};
  if (!xReady(env) || !ids.length) return out;
  try {
    const token = await xAccessToken(env);
    const data = await fetch(`https://api.x.com/2/tweets?ids=${ids.slice(0, 50).join(",")}&tweet.fields=public_metrics`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    for (const t of data.data || []) {
      const m = t.public_metrics || {};
      out[t.id] = { likes: m.like_count, reposts: m.retweet_count, replies: m.reply_count, quotes: m.quote_count, views: m.impression_count };
    }
  } catch (err) {
    console.log(`X metrics unavailable: ${err.message}`);
  }
  return out;
}

async function youtubeMetrics(ids) {
  const out = {};
  if (!env.YOUTUBE_REFRESH_TOKEN || !ids.length) return out;
  const token = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.YOUTUBE_CLIENT_ID, client_secret: env.YOUTUBE_CLIENT_SECRET, refresh_token: env.YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token" }),
  }).then((r) => r.json());
  if (!token.access_token) return out;
  for (let i = 0; i < ids.length; i += 50) {
    const data = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(i, i + 50).join(",")}`, { headers: { Authorization: `Bearer ${token.access_token}` } }).then((r) => r.json());
    for (const v of data.items || []) out[v.id] = { likes: Number(v.statistics.likeCount || 0), replies: Number(v.statistics.commentCount || 0), views: Number(v.statistics.viewCount || 0) };
  }
  return out;
}

async function main() {
  // Only judge posts that have had time to perform (6h) but are recent enough to matter (21d).
  const now = Date.now();
  const fresh = (e) => now - new Date(e.at).getTime() > 6 * HOUR && now - new Date(e.at).getTime() < 21 * 24 * HOUR;
  const promos = promoLog.filter((e) => e.ok && fresh(e) && e.network !== "indexnow");
  const shorts = shortsLog.filter((e) => e.youtubeId && fresh(e));

  const [bsky, masto, x, yt] = await Promise.all([
    blueskyMetrics(promos.filter((e) => e.network === "bluesky" && e.uri).map((e) => e.uri)),
    mastodonMetrics(promos.filter((e) => e.network === "mastodon" && e.id).map((e) => e.id)),
    xMetrics(promos.filter((e) => e.network === "x" && e.id).map((e) => e.id)),
    youtubeMetrics(shorts.map((e) => e.youtubeId)),
  ]);

  const posts = { ...prev.posts };
  for (const e of promos) {
    const m = e.network === "bluesky" ? bsky[e.uri] : e.network === "mastodon" ? masto[e.id] : e.network === "x" ? x[e.id] : null;
    if (m) posts[`${e.network}:${e.uri || e.id}`] = { network: e.network, slug: e.slug, style: e.style, category: e.category, format: e.format, at: e.at, metrics: m, score: engagementScore(m) };
  }
  for (const e of shorts) {
    const m = yt[e.youtubeId];
    if (m) posts[`youtube:${e.youtubeId}`] = { network: "youtube", kind: e.kind, at: e.at, metrics: m, score: engagementScore(m) };
  }

  const arms = {};
  const add = (key, score) => {
    if (!key || key.includes("undefined")) return;
    arms[key] ||= { n: 0, total: 0 };
    arms[key].n++;
    arms[key].total += score;
  };
  for (const p of Object.values(posts)) {
    if (p.network === "youtube") { add(`shorts:${p.kind}`, p.score); continue; }
    add(`${p.network}:${p.style}`, p.score);
    add(`category:${p.category}`, p.score);
    add(`format:${p.format}`, p.score);
  }
  const top = Object.entries(posts).sort((a, b) => b[1].score - a[1].score).slice(0, 10).map(([k, p]) => ({ key: k, ...p }));
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), arms, top, posts }, null, 2) + "\n");
  console.log(`Learned from ${Object.keys(posts).length} post(s). ${Object.keys(arms).length} signal(s).`);
  for (const [k, s] of Object.entries(arms).sort((a, b) => b[1].total / b[1].n - a[1].total / a[1].n).slice(0, 8)) console.log(`  ${k}: avg ${(s.total / s.n).toFixed(1)} over ${s.n}`);
}

main().catch((err) => console.log(`Learning skipped: ${err.message}`));
