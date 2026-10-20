// X (Twitter) posting via API v2 with OAuth 2.0 user tokens.
// Pricing is pay-per-use: plain posts are cheap, posts containing a URL cost much more,
// so by default the machine posts text and video without links.
import { readFileSync } from "node:fs";
import { saveSecret } from "./secrets.mjs";

export const xReady = (env = process.env) => Boolean(env.X_CLIENT_ID && env.X_REFRESH_TOKEN);

let cached = null;
export async function xAccessToken(env = process.env) {
  if (cached) return cached;
  const basic = env.X_CLIENT_SECRET ? { Authorization: `Basic ${Buffer.from(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`).toString("base64")}` } : {};
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...basic },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: env.X_REFRESH_TOKEN, client_id: env.X_CLIENT_ID }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`X auth failed: ${data.error_description || data.error || res.status}`);
  // X rotates refresh tokens on every use: save the new one or the next run will fail.
  if (data.refresh_token && data.refresh_token !== env.X_REFRESH_TOKEN) {
    env.X_REFRESH_TOKEN = data.refresh_token;
    await saveSecret("X_REFRESH_TOKEN", data.refresh_token, env);
  }
  cached = data.access_token;
  return cached;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function xUploadMedia(file, mediaType, category, env = process.env) {
  const token = await xAccessToken(env);
  const bytes = readFileSync(file);
  const auth = { Authorization: `Bearer ${token}` };
  const init = await fetch("https://api.x.com/2/media/upload/initialize", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: mediaType, total_bytes: bytes.length, media_category: category }),
  }).then((r) => r.json());
  const id = init.data?.id;
  if (!id) throw new Error(`X media init failed: ${JSON.stringify(init).slice(0, 200)}`);
  const CHUNK = 4 * 1024 * 1024;
  for (let i = 0, seg = 0; i < bytes.length; i += CHUNK, seg++) {
    const form = new FormData();
    form.append("segment_index", String(seg));
    form.append("media", new Blob([bytes.subarray(i, i + CHUNK)]), "chunk");
    const r = await fetch(`https://api.x.com/2/media/upload/${id}/append`, { method: "POST", headers: auth, body: form });
    if (!r.ok) throw new Error(`X media append failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  let info = (await fetch(`https://api.x.com/2/media/upload/${id}/finalize`, { method: "POST", headers: auth }).then((r) => r.json())).data?.processing_info;
  for (let tries = 0; info && info.state !== "succeeded" && tries < 40; tries++) {
    if (info.state === "failed") throw new Error(`X media processing failed: ${JSON.stringify(info.error || {})}`);
    await wait((info.check_after_secs || 3) * 1000);
    info = (await fetch(`https://api.x.com/2/media/upload?command=STATUS&media_id=${id}`, { headers: auth }).then((r) => r.json())).data?.processing_info;
  }
  return id;
}

export async function xPost({ text, mediaId, replyTo }, env = process.env) {
  const token = await xAccessToken(env);
  const body = { text: text.slice(0, 280) };
  if (mediaId) body.media = { media_ids: [String(mediaId)] };
  if (replyTo) body.reply = { in_reply_to_tweet_id: String(replyTo) };
  const res = await fetch("https://api.x.com/2/tweets", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || !data.data?.id) throw new Error(`X post failed: HTTP ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return { id: data.data.id, url: `https://x.com/i/status/${data.data.id}` };
}
