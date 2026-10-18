// Control panel API (Netlify Function). Everything here requires the CONTROL_PASSWORD.
//
// Netlify environment variables:
//   CONTROL_PASSWORD   (required, 12+ characters) the panel password
//   GITHUB_TOKEN       (required for controls) fine-grained token for this repo:
//                      Actions R/W, Contents R/W, Variables R/W, Metadata R
//   GITHUB_REPO        (optional) owner/name, defaults to the repo below
//   GEMINI_API_KEY, GROQ_API_KEY, ... (optional) enable those providers in the playground

import { createHmac, timingSafeEqual } from "node:crypto";
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
