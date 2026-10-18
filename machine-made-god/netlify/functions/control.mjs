// Control panel API (Netlify Function). Everything here requires the CONTROL_PASSWORD.
//
// Netlify environment variables:
//   CONTROL_PASSWORD   (required, 12+ characters) the panel password
//   GITHUB_TOKEN       (required for controls) fine-grained token for this repo:
//                      Actions R/W, Contents R/W, Variables R/W, Metadata R
//   GITHUB_REPO        (optional) owner/name, defaults to the repo below
//   GEMINI_API_KEY, GROQ_API_KEY, ... (optional) enable those providers in the playground

import { createHmac, timingSafeEqual, createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import sodium from "libsodium-wrappers";
import machineConfig from "../../machine.config.json" with { type: "json" };
import categories from "../../src/data/categories.json" with { type: "json" };
import { availableProviders, rouletteOrder, chatProvider } from "../../scripts/lib/roulette.mjs";

const REPO = process.env.GITHUB_REPO || "AzzamDoesAVbadly/IGNORETHIS-ITSABADIDEA";
const BASE = "machine-made-god";
const SESSION_DAYS = 14;

// ---------- helpers ----------

const json = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const password = () => process.env.CONTROL_PASSWORD || "";
const sign = (exp) => createHmac("sha256", password()).update(`mmg-control:${exp}`).digest("hex");

export function makeToken(now = Date.now()) {
  const exp = now + SESSION_DAYS * 86400000;
  return `${exp}.${sign(exp)}`;
}

export function checkToken(token, now = Date.now()) {
  const [exp, sig] = String(token || "").split(".");
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

async function gh(path, init = {}) {
  if (!process.env.GITHUB_TOKEN) throw Object.assign(new Error("GITHUB_TOKEN is not set in Netlify environment variables."), { status: 503 });
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
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
  return { sha: file.sha, text: Buffer.from(file.content, "base64").toString("utf8") };
}

// Read-only fallbacks for public repos, so status works before GITHUB_TOKEN is set.
async function readRepoFile(path) {
  if (process.env.GITHUB_TOKEN) return (await ghFile(path)).text;
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${BASE}/${path}`);
  if (!res.ok) throw new Error(`could not read ${path} (HTTP ${res.status}); add GITHUB_TOKEN if the repo is private`);
  return res.text();
}

async function listRuns() {
  if (process.env.GITHUB_TOKEN) return gh("/actions/runs?per_page=12");
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=12`, { headers: { "User-Agent": "machine-made-god-control" } });
  if (!res.ok) throw new Error(`could not list runs (HTTP ${res.status}); add GITHUB_TOKEN`);
  return res.json();
}

async function ghPut(path, text, sha, message) {
  return gh(`/contents/${BASE}/${path}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: Buffer.from(text, "utf8").toString("base64"), sha, branch: "main" }),
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
    settle(process.env.GITHUB_TOKEN ? gh("/actions/variables/MACHINE_ENABLED").catch((err) => (err.status === 404 ? null : Promise.reject(err))) : Promise.resolve(null)),
    settle(readRepoFile("src/data/promo-log.json").then((t) => JSON.parse(t).slice(0, 40))),
    settle(fetch(`${origin}/search.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`search.json HTTP ${r.status}`))))),
  ]);
  const shortsLog = await settle(readRepoFile("src/data/shorts-log.json").then((t) => JSON.parse(t).slice(0, 30)));

  const machineState = state.ok ? state.value : { providers: {}, runs: [] };
  const counts = {};
  if (index.ok) for (const item of index.value) counts[item.c] = (counts[item.c] || 0) + 1;

  return {
    github: process.env.GITHUB_TOKEN ? (runs.ok ? "ok" : runs.error) : "read-only (add GITHUB_TOKEN in Netlify to enable Run/Pause/Hide/Delete)",
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
      inPanel: !p.keyEnv ? false : Boolean(process.env[p.keyEnv]),
      ...(machineState.providers?.[p.id] || {}),
    })),
    content: { total: index.ok ? index.value.length : null, counts, error: index.ok ? undefined : index.error },
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, color: c.color })),
    promoLog: promoLog.ok ? promoLog.value : [],
    shortsLog: shortsLog.ok ? shortsLog.value : [],
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
    env: process.env,
    random: Math.random,
    log: () => {},
    siteUrl: "https://machinemadegod.netlify.app",
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

  const ready = availableProviders(machineConfig, ctx.state, process.env);
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
    return { results: [{ provider: "roulette", error: `every provider failed: ${tried.join("; ") || "no providers have keys in Netlify"}` }] };
  }

  const chosen = ready.filter((p) => providers.includes(p.id));
  if (!chosen.length) throw Object.assign(new Error("none of those providers have API keys in Netlify environment variables"), { status: 400 });
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
  await sodium.ready;
  const { key, key_id } = await gh("/actions/secrets/public-key");
  const sealed = sodium.crypto_box_seal(sodium.from_string(String(value)), sodium.from_base64(key, sodium.base64_variants.ORIGINAL));
  await gh(`/actions/secrets/${name}`, { method: "PUT", body: JSON.stringify({ encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL), key_id }) });
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
const stateKey = () => createHash("sha256").update(`mmg-state:${password()}`).digest();
function sealState(obj) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", stateKey(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj)), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64url");
}
function openState(token) {
  const buf = Buffer.from(String(token), "base64url");
  const d = createDecipheriv("aes-256-gcm", stateKey(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  const obj = JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString());
  if (obj.exp < Date.now()) throw new Error("This connect link expired. Start again from Mission Control.");
  return obj;
}

function youtubeStart({ clientId, clientSecret }, origin) {
  if (!/\.apps\.googleusercontent\.com$/.test(String(clientId).trim())) throw Object.assign(new Error("That doesn't look like a Google OAuth client ID (it ends in .apps.googleusercontent.com)."), { status: 400 });
  if (!String(clientSecret).trim()) throw Object.assign(new Error("Paste the client secret too."), { status: 400 });
  const state = sealState({ cid: clientId.trim(), cs: clientSecret.trim(), exp: Date.now() + 15 * 60000 });
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
    const { cid, cs } = openState(url.searchParams.get("state"));
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

// ---------- router ----------

export default async (req) => {
  if (password().length < 12) return json(503, { error: "Set CONTROL_PASSWORD (12+ characters) in Netlify → Site configuration → Environment variables, then redeploy." });

  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/control\/?/, "").replace(/\/$/, "");
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  if (route === "login" && req.method === "POST") {
    if (!safeEqual(body.password || "", password())) {
      await new Promise((r) => setTimeout(r, 900));
      return json(401, { error: "Wrong password." });
    }
    return json(200, { token: makeToken() });
  }

  // Google redirects here without our session header; the encrypted state authenticates it.
  if (route === "youtube/callback" && req.method === "GET") return youtubeCallback(url);

  if (!checkToken((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""))) return json(401, { error: "Not logged in." });

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
      case "POST youtube/start":
        return json(200, youtubeStart(body, url.origin));
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
};

export const config = { path: "/api/control/*" };
