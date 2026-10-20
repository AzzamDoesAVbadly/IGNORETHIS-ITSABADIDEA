// Mission Control API, shared by every host:
//   Cloudflare Pages  → functions/api/control/[[path]].js
//   Netlify           → netlify/functions/control.mjs
//   local             → scripts/control-server.mjs
// Uses only web-standard APIs (fetch, Web Crypto) so it runs on Node and Cloudflare Workers.
//
// Environment (host settings → environment variables / secrets):
//   CONTROL_PASSWORD   (required, 12+ characters) the panel password
//   GITHUB_TOKEN       (required for controls) fine-grained token for this repo:
//                      Actions R/W, Contents R/W, Variables R/W, Secrets R/W, Metadata R
//   GITHUB_REPO        (optional) owner/name, defaults to the repo below
//   GEMINI_API_KEY, GROQ_API_KEY, ... (optional) enable those providers in the playground

import nacl from "tweetnacl";
import { blake2b } from "@noble/hashes/blake2.js";
import machineConfig from "../machine.config.json" with { type: "json" };
import categories from "../src/data/categories.json" with { type: "json" };
import siteData from "../src/data/site.json" with { type: "json" };
import { availableProviders, rouletteOrder, chatProvider } from "../scripts/lib/roulette.mjs";

let ENV = {};
const repo = () => ENV.GITHUB_REPO || "AzzamDoesAVbadly/IGNORETHIS-ITSABADIDEA";
const BASE = "machine-made-god";
const SESSION_DAYS = 14;

// ---------- helpers ----------

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const password = () => ENV.CONTROL_PASSWORD || "";
const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const b64ToBytes = (b64) => Uint8Array.from(atob(String(b64).replace(/\s/g, "")), (c) => c.charCodeAt(0));
const b64url = (bytes) => bytesToB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => b64ToBytes(String(s).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(s).length + 3) % 4));

async function hmacHex(message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string comparison.
function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export async function makeToken(env, now = Date.now()) {
  if (env) ENV = env;
  const exp = now + SESSION_DAYS * 86400000;
  return `${exp}.${await hmacHex(`mmg-control:${exp}`)}`;
}

export async function checkToken(env, token, now = Date.now()) {
  if (env) ENV = env;
  const [exp, sig] = String(token || "").split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  return safeEqual(sig, await hmacHex(`mmg-control:${exp}`));
}

// libsodium-compatible sealed box (what GitHub requires for secrets).
export function sealedBox(message, publicKeyB64) {
  const pk = b64ToBytes(publicKeyB64);
  const eph = nacl.box.keyPair();
  const both = new Uint8Array(64);
  both.set(eph.publicKey);
  both.set(pk, 32);
  const nonce = blake2b(both, { dkLen: 24 });
  const boxed = nacl.box(enc.encode(String(message)), nonce, pk, eph.secretKey);
  const out = new Uint8Array(32 + boxed.length);
  out.set(eph.publicKey);
  out.set(boxed, 32);
  return bytesToB64(out);
}

async function gh(path, init = {}) {
  if (!ENV.GITHUB_TOKEN) throw Object.assign(new Error("GITHUB_TOKEN is not set in your hosting environment variables."), { status: 503 });
  const res = await fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "machine-made-god-control",
      ...(init.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
  return text ? JSON.parse(text) : null;
}

async function ghFile(path) {
  const file = await gh(`/contents/${BASE}/${path}?ref=main`);
  return { sha: file.sha, text: dec.decode(b64ToBytes(file.content)) };
}

// Read-only fallbacks for public repos, so status works before GITHUB_TOKEN is set.
async function readRepoFile(path) {
  if (ENV.GITHUB_TOKEN) return (await ghFile(path)).text;
  const res = await fetch(`https://raw.githubusercontent.com/${repo()}/main/${BASE}/${path}`);
  if (!res.ok) throw new Error(`could not read ${path} (HTTP ${res.status}); add GITHUB_TOKEN if the repo is private`);
  return res.text();
}

async function listRuns() {
  if (ENV.GITHUB_TOKEN) return gh("/actions/runs?per_page=12");
  const res = await fetch(`https://api.github.com/repos/${repo()}/actions/runs?per_page=12`, { headers: { "User-Agent": "machine-made-god-control" } });
  if (!res.ok) throw new Error(`could not list runs (HTTP ${res.status}); add GITHUB_TOKEN`);
  return res.json();
}

async function ghPut(path, text, sha, message) {
  return gh(`/contents/${BASE}/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: bytesToB64(enc.encode(text)), sha, branch: "main" }),
  });
}

const settle = async (promise) => {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

// ---------- handlers ----------

async function status(origin) {
  const [runs, state, variable, promoLog, index] = await Promise.all([
    settle(listRuns()),
    settle(readRepoFile("src/data/machine-state.json").then(JSON.parse)),
    settle(ENV.GITHUB_TOKEN ? gh("/actions/variables/MACHINE_ENABLED").catch((err) => (err.status === 404 ? null : Promise.reject(err))) : Promise.resolve(null)),
    settle(readRepoFile("src/data/promo-log.json").then((t) => JSON.parse(t).slice(0, 40))),
    settle(fetch(`${origin}/search.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`search.json HTTP ${r.status}`))))),
  ]);
  const [shortsLog, repliesLog] = await Promise.all([
    settle(readRepoFile("src/data/shorts-log.json").then((t) => JSON.parse(t).slice(0, 30))),
    settle(readRepoFile("src/data/replies-log.json").then((t) => JSON.parse(t).slice(0, 60))),
  ]);
  const engagement = await settle(readRepoFile("src/data/engagement.json").then((t) => { const e = JSON.parse(t); return { updatedAt: e.updatedAt, arms: e.arms, top: (e.top || []).slice(0, 8) }; }));

  const machineState = state.ok ? state.value : { providers: {}, runs: [] };
  const counts = {};
  if (index.ok) for (const item of index.value) counts[item.c] = (counts[item.c] || 0) + 1;

  return {
    github: ENV.GITHUB_TOKEN ? (runs.ok ? "ok" : runs.error) : "read-only (add GITHUB_TOKEN to enable Run/Pause/Hide/Delete)",
    enabled: machineConfig.enabled !== false && !(variable.ok && variable.value && String(variable.value.value).toLowerCase() === "false"),
    schedule: ["13:17", "01:47"],
    runs: runs.ok
      ? runs.value.workflow_runs.map((r) => ({
          id: r.id,
          name: r.name,
          title: r.display_title,
          event: r.event,
          status: r.status,
          conclusion: r.conclusion,
          at: r.created_at,
          url: r.html_url,
        }))
      : [],
    lastRuns: (machineState.runs || []).slice(0, 8),
    providers: machineConfig.providers.map((p) => ({
      id: p.id,
      tier: p.tier || "free",
      model: machineState.providers?.[p.id]?.model || p.model,
      inPanel: !p.keyEnv ? false : Boolean(ENV[p.keyEnv]),
      ...(machineState.providers?.[p.id] || {}),
    })),
    content: { total: index.ok ? index.value.length : null, counts, error: index.ok ? undefined : index.error },
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, color: c.color })),
    promoLog: promoLog.ok ? promoLog.value : [],
    shortsLog: shortsLog.ok ? shortsLog.value : [],
    repliesLog: repliesLog.ok ? repliesLog.value : [],
    engagement: engagement.ok ? engagement.value : { arms: {}, top: [] },
    errors: [runs, state, promoLog, index].filter((r) => !r.ok).map((r) => r.error),
  };
}

async function posts(origin) {
  const [index, articleFiles, quizFiles] = await Promise.all([
    fetch(`${origin}/search.json`).then((r) => r.json()),
    settle(gh(`/contents/${BASE}/src/content/articles?ref=main`)),
    settle(gh(`/contents/${BASE}/src/content/quizzes?ref=main`)),
  ]);
  const published = index.map((e) => ({ title: e.t, url: e.u, category: e.cn, kind: e.k, at: e.ts, slug: e.u.split("/").filter(Boolean).pop() }));
  const live = new Set(published.map((p) => `${p.kind}:${p.slug}`));
  const hidden = [
    ...(articleFiles.ok ? articleFiles.value : []).filter((f) => f.name.endsWith(".md")).map((f) => ({ kind: "article", slug: f.name.replace(/\.md$/, "") })),
    ...(quizFiles.ok ? quizFiles.value : []).filter((f) => f.name.endsWith(".json")).map((f) => ({ kind: "quiz", slug: f.name.replace(/\.json$/, "") })),
  ].filter((f) => !live.has(`${f.kind}:${f.slug}`));
  return { published, hidden, note: "Hidden = in the repo but not on the live site (unpublished, or not deployed yet)." };
}

async function postAction({ action, slug, kind }) {
  if (!/^[a-z0-9-]{3,120}$/.test(String(slug))) throw Object.assign(new Error("bad slug"), { status: 400 });
  const path = kind === "quiz" ? `src/content/quizzes/${slug}.json` : `src/content/articles/${slug}.md`;
  const file = await ghFile(path);

  if (action === "delete") {
    await gh(`/contents/${BASE}/${path}`, { method: "DELETE", body: JSON.stringify({ message: `Delete ${slug} (control panel)`, sha: file.sha, branch: "main" }) });
    return { ok: true, message: "Deleted. The site redeploys in about a minute." };
  }

  const hide = action === "hide";
  let text;
  if (kind === "quiz") {
    const q = JSON.parse(file.text);
    if (hide) q.draft = true;
    else delete q.draft;
    text = JSON.stringify(q, null, 2) + "\n";
  } else {
    const without = file.text.replace(/^draft:.*\n/m, "");
    text = hide ? without.replace(/^---\n/, "---\ndraft: true\n") : without;
  }
  if (text === file.text) return { ok: true, message: "Nothing to change." };
  await ghPut(path, text, file.sha, `${hide ? "Hide" : "Show"} ${slug} (control panel)`);
  return { ok: true, message: `${hide ? "Hidden" : "Visible again"}. The site redeploys in about a minute.` };
}

async function setEnabled(enabled) {
  if (enabled) {
    await gh("/actions/variables/MACHINE_ENABLED", { method: "DELETE" }).catch((err) => (err.status === 404 ? null : Promise.reject(err)));
    return { ok: true, message: "The machine is ON. It runs on schedule again." };
  }
  try {
    await gh("/actions/variables/MACHINE_ENABLED", { method: "PATCH", body: JSON.stringify({ name: "MACHINE_ENABLED", value: "false" }) });
  } catch (err) {
    if (err.status !== 404) throw err;
    await gh("/actions/variables", { method: "POST", body: JSON.stringify({ name: "MACHINE_ENABLED", value: "false" }) });
  }
  return { ok: true, message: "The machine is PAUSED. Scheduled runs will do nothing until you turn it back on." };
}

async function dispatch(workflow, inputs) {
  const clean = Object.fromEntries(Object.entries(inputs || {}).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "").map(([k, v]) => [k, String(v).slice(0, 600)]));
  await gh(`/actions/workflows/${workflow}/dispatches`, { method: "POST", body: JSON.stringify({ ref: "main", inputs: clean }) });
  return { ok: true };
}

async function chat({ providers = [], system = "", useVoice = false, messages = [] }) {
  const state = { providers: {} };
  const ctx = {
    config: machineConfig,
    state,
    env: ENV,
    random: Math.random,
    log: () => {},
    siteUrl: ENV.SITE_URL || siteData.url,
    remember: (id, patch) => (state.providers[id] = { ...(state.providers[id] || {}), ...patch }),
    record: () => {},
  };

  const history = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
  if (!history.length || history.at(-1).role !== "user") throw Object.assign(new Error("send a user message"), { status: 400 });

  let sys = String(system || "").slice(0, 8000);
  if (useVoice) {
    const voice = await readRepoFile("prompts/voice.md").catch(() => "");
    sys = [voice, sys].filter(Boolean).join("\n\n");
  }

  const ready = availableProviders(machineConfig, ctx.state, ENV);
  const timed = (p) =>
    Promise.race([
      chatProvider(p, { system: sys, messages: history }, { ...ctx, config: { ...machineConfig, requestTimeoutSeconds: 50 } }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 50s")), 52000)),
    ]);

  if (providers.includes("roulette")) {
    const tried = [];
    for (const p of rouletteOrder(ready).slice(0, 4)) {
      const t0 = Date.now();
      try {
        const { text, model } = await timed(p);
        return { results: [{ provider: p.id, model, text, ms: Date.now() - t0, tried }] };
      } catch (err) {
        tried.push(`${p.id}: ${err.message}`);
      }
    }
    return { results: [{ provider: "roulette", error: `every provider failed: ${tried.join("; ") || "no providers have keys in your hosting settings"}` }] };
  }

  const chosen = ready.filter((p) => providers.includes(p.id));
  if (!chosen.length) throw Object.assign(new Error("none of those providers have API keys in your hosting environment variables"), { status: 400 });
  const results = await Promise.all(
    chosen.map(async (p) => {
      const t0 = Date.now();
      try {
        const { text, model } = await timed(p);
        return { provider: p.id, model, text, ms: Date.now() - t0 };
      } catch (err) {
        return { provider: p.id, error: err.message, ms: Date.now() - t0 };
      }
    })
  );
  return { results };
}

// ---------- socials (credentials live in GitHub secrets; values never come back) ----------

const SOCIAL_SECRETS = {
  bluesky: ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"],
  mastodon: ["MASTODON_INSTANCE", "MASTODON_TOKEN"],
  youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
  tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN"],
  x: ["X_CLIENT_ID", "X_REFRESH_TOKEN"],
};

async function secretNames() {
  try {
    const { secrets } = await gh("/actions/secrets?per_page=100");
    return { ok: true, names: secrets.map((x) => x.name) };
  } catch (err) {
    return { ok: false, names: [], error: err.status === 403 ? "Your GitHub token can't see secrets. Edit the token and add Repository permission “Secrets: Read and write”." : err.message };
  }
}

async function setSecret(name, value) {
  const { key, key_id } = await gh("/actions/secrets/public-key");
  await gh(`/actions/secrets/${name}`, { method: "PUT", body: JSON.stringify({ encrypted_value: sealedBox(value, key), key_id }) });
}

async function socials() {
  const s = await secretNames();
  const connected = Object.fromEntries(Object.entries(SOCIAL_SECRETS).map(([net, names]) => [net, names.every((n) => s.names.includes(n))]));
  return { canManage: s.ok, error: s.error, connected, aiKeys: ["GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY", "CEREBRAS_API_KEY", "DASHSCOPE_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"].filter((n) => s.names.includes(n)) };
}

async function connectSocial({ network, fields = {} }) {
  const f = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v || "").trim()]));
  if (network === "bluesky") {
    const handle = f.handle.replace(/^@/, "");
    const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: handle, password: f.appPassword }),
    });
    if (!res.ok) throw Object.assign(new Error("Bluesky rejected that handle/app password. Use an App Password (Settings → Privacy and security → App passwords), not your login password."), { status: 400 });
    await setSecret("BLUESKY_HANDLE", handle);
    await setSecret("BLUESKY_APP_PASSWORD", f.appPassword);
    return { ok: true, message: `Bluesky connected as @${handle}. New posts will be shared there automatically.` };
  }
  if (network === "mastodon") {
    const instance = (f.instance.startsWith("http") ? f.instance : `https://${f.instance}`).replace(/\/$/, "");
    const res = await fetch(`${instance}/api/v1/accounts/verify_credentials`, { headers: { Authorization: `Bearer ${f.token}` } });
    if (!res.ok) throw Object.assign(new Error(`Mastodon rejected that token (HTTP ${res.status}). Create it under Preferences → Development with the write:statuses scope.`), { status: 400 });
    const acct = await res.json();
    await setSecret("MASTODON_INSTANCE", instance);
    await setSecret("MASTODON_TOKEN", f.token);
    return { ok: true, message: `Mastodon connected as @${acct.acct}.` };
  }
  throw Object.assign(new Error("unknown network"), { status: 400 });
}

async function disconnectSocial({ network }) {
  for (const name of SOCIAL_SECRETS[network] || []) {
    await gh(`/actions/secrets/${name}`, { method: "DELETE" }).catch((err) => (err.status === 404 ? null : Promise.reject(err)));
  }
  return { ok: true, message: `${network} disconnected.` };
}

// YouTube OAuth: the client id/secret ride along in an encrypted, expiring `state`.
async function stateKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`mmg-state:${password()}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealState(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await stateKey(), enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(12 + data.length);
  out.set(iv);
  out.set(data, 12);
  return b64url(out);
}
export async function openState(token) {
  const buf = fromB64url(token);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, await stateKey(), buf.subarray(12));
  const obj = JSON.parse(dec.decode(plain));
  if (obj.exp < Date.now()) throw new Error("This connect link expired. Start again from Mission Control.");
  return obj;
}

async function youtubeStart({ clientId, clientSecret }, origin) {
  if (!/\.apps\.googleusercontent\.com$/.test(String(clientId).trim())) throw Object.assign(new Error("That doesn't look like a Google OAuth client ID (it ends in .apps.googleusercontent.com)."), { status: 400 });
  if (!String(clientSecret).trim()) throw Object.assign(new Error("Paste the client secret too."), { status: 400 });
  const state = await sealState({ cid: clientId.trim(), cs: clientSecret.trim(), exp: Date.now() + 15 * 60000 });
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: `${origin}/api/control/youtube/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
}

async function youtubeCallback(url) {
  const back = (q) => new Response(null, { status: 302, headers: { Location: `/control/?${new URLSearchParams(q)}` } });
  try {
    if (url.searchParams.get("error")) throw new Error(`Google said: ${url.searchParams.get("error")}`);
    const { cid, cs } = await openState(url.searchParams.get("state"));
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: url.searchParams.get("code"), client_id: cid, client_secret: cs, redirect_uri: `${url.origin}/api/control/youtube/callback`, grant_type: "authorization_code" }),
    });
    const token = await tokenRes.json();
    if (!token.refresh_token) throw new Error(token.error_description || token.error || "Google didn't return a refresh token. Remove the app's access at myaccount.google.com/permissions and try again.");
    const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token.access_token}` } }).then((r) => r.json());
    const channel = ch.items?.[0]?.snippet?.title;
    if (!channel) throw new Error("That Google account has no YouTube channel yet. Create one at youtube.com first, then connect again.");
    await setSecret("YOUTUBE_CLIENT_ID", cid);
    await setSecret("YOUTUBE_CLIENT_SECRET", cs);
    await setSecret("YOUTUBE_REFRESH_TOKEN", token.refresh_token);
    return back({ yt: "ok", channel });
  } catch (err) {
    return back({ yt: "error", msg: err.message.slice(0, 300) });
  }
}

// TikTok and X connect flows. Their refresh tokens rotate on use, so we also store this
// panel's GitHub token as MACHINE_GH_TOKEN, letting the machine save rotated tokens itself.
const sha256b64url = async (text) => b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text))));

async function oauthStart(network, { clientId, clientSecret }, origin) {
  const cid = String(clientId || "").trim();
  const cs = String(clientSecret || "").trim();
  if (!cid || !cs) throw Object.assign(new Error("Paste both the client ID/key and the client secret."), { status: 400 });
  const redirect = `${origin}/api/control/${network}/callback`;
  if (network === "tiktok") {
    const state = await sealState({ net: "tiktok", cid, cs, exp: Date.now() + 15 * 60000 });
    const q = new URLSearchParams({ client_key: cid, scope: "user.info.basic,video.publish", response_type: "code", redirect_uri: redirect, state });
    return { url: `https://www.tiktok.com/v2/auth/authorize/?${q}` };
  }
  if (network === "x") {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const state = await sealState({ net: "x", cid, cs, verifier, exp: Date.now() + 15 * 60000 });
    const q = new URLSearchParams({
      response_type: "code",
      client_id: cid,
      redirect_uri: redirect,
      scope: "tweet.read tweet.write users.read media.write offline.access",
      state,
      code_challenge: await sha256b64url(verifier),
      code_challenge_method: "S256",
    });
    return { url: `https://x.com/i/oauth2/authorize?${q}` };
  }
  throw Object.assign(new Error("unknown network"), { status: 400 });
}

async function oauthCallback(network, url) {
  const back = (q) => new Response(null, { status: 302, headers: { Location: `/control/?${new URLSearchParams(q)}` } });
  try {
    if (url.searchParams.get("error")) throw new Error(`${network} said: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`);
    const st = await openState(url.searchParams.get("state"));
    if (st.net !== network) throw new Error("state mismatch");
    const redirect = `${url.origin}/api/control/${network}/callback`;
    let refresh;
    let name = network;
    if (network === "tiktok") {
      const tok = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_key: st.cid, client_secret: st.cs, code: url.searchParams.get("code"), grant_type: "authorization_code", redirect_uri: redirect }),
      }).then((r) => r.json());
      if (!tok.refresh_token) throw new Error(tok.error_description || tok.error || "TikTok didn't return a refresh token");
      refresh = tok.refresh_token;
      const me = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()).catch(() => ({}));
      name = me.data?.user?.display_name || "TikTok";
      await setSecret("TIKTOK_CLIENT_KEY", st.cid);
      await setSecret("TIKTOK_CLIENT_SECRET", st.cs);
      await setSecret("TIKTOK_REFRESH_TOKEN", refresh);
    } else {
      const tok = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${st.cid}:${st.cs}`)}` },
        body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: redirect, code_verifier: st.verifier, client_id: st.cid }),
      }).then((r) => r.json());
      if (!tok.refresh_token) throw new Error(tok.error_description || tok.error || "X didn't return a refresh token (is offline.access enabled?)");
      refresh = tok.refresh_token;
      const me = await fetch("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()).catch(() => ({}));
      name = me.data?.username ? `@${me.data.username}` : "X";
      await setSecret("X_CLIENT_ID", st.cid);
      await setSecret("X_CLIENT_SECRET", st.cs);
      await setSecret("X_REFRESH_TOKEN", refresh);
    }
    if (ENV.GITHUB_TOKEN) await setSecret("MACHINE_GH_TOKEN", ENV.GITHUB_TOKEN);
    return back({ connected: network, name });
  } catch (err) {
    return back({ connectError: network, msg: err.message.slice(0, 300) });
  }
}

// ---------- router ----------

export async function handle(req, env = {}) {
  ENV = env;
  if (password().length < 12) return json(503, { error: "Set CONTROL_PASSWORD (12+ characters) in your hosting settings (Cloudflare Pages → Settings → Variables and Secrets), then redeploy." });

  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/control\/?/, "").replace(/\/$/, "");
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  if (route === "login" && req.method === "POST") {
    if (!safeEqual(body.password || "", password())) {
      await new Promise((r) => setTimeout(r, 900));
      return json(401, { error: "Wrong password." });
    }
    return json(200, { token: await makeToken() });
  }

  // Google redirects here without our session header; the encrypted state authenticates it.
  if (route === "youtube/callback" && req.method === "GET") return youtubeCallback(url);
  if ((route === "tiktok/callback" || route === "x/callback") && req.method === "GET") return oauthCallback(route.split("/")[0], url);

  if (!(await checkToken(null, (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")))) return json(401, { error: "Not logged in." });

  try {
    switch (`${req.method} ${route}`) {
      case "GET status":
        return json(200, await status(url.origin));
      case "GET posts":
        return json(200, await posts(url.origin));
      case "POST post":
        return json(200, await postAction(body));
      case "POST machine":
        return json(200, await setEnabled(Boolean(body.enabled)));
      case "POST run":
        await dispatch("machine.yml", { idea: body.idea, category: body.category, format: body.format });
        return json(200, { ok: true, message: body.idea ? "The machine is writing your idea. It should be live in about 3–5 minutes." : "Run started. New content should be live in about 3–6 minutes." });
      case "POST promote":
        await dispatch("promote.yml", { slug: body.slug });
        return json(200, { ok: true, message: "Promotion started. Check the promotion log in a couple of minutes." });
      case "GET socials":
        return json(200, await socials());
      case "POST socials/connect":
        return json(200, await connectSocial(body));
      case "POST socials/disconnect":
        return json(200, await disconnectSocial(body));
      case "POST tiktok/start":
        return json(200, await oauthStart("tiktok", body, url.origin));
      case "POST x/start":
        return json(200, await oauthStart("x", body, url.origin));
      case "POST youtube/start":
        return json(200, await youtubeStart(body, url.origin));
      case "POST shorts":
        await dispatch("shorts.yml", { slug: body.slug });
        return json(200, { ok: true, message: "Making Shorts now. They'll appear in the Shorts log (and on YouTube, if connected) in about 3–5 minutes." });
      case "POST chat":
        return json(200, await chat(body));
      default:
        return json(404, { error: `Unknown endpoint: ${req.method} ${route}` });
    }
  } catch (err) {
    return json(err.status && err.status < 600 ? err.status : 500, { error: err.message });
  }
}
