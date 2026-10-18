// Provider roulette: shuffle the free AI providers, try one, fall through to the
// next on any failure. Remembers cooldowns and working models between runs.
import Anthropic from "@anthropic-ai/sdk";

export class ProviderError extends Error {
  constructor(message, { kind = "error", status } = {}) {
    super(message);
    this.kind = kind; // "rate_limit" | "auth" | "model" | "bad_output" | "refusal" | "error"
    this.status = status;
  }
}

// Which providers can be used right now (key present, not cooling down).
export function availableProviders(config, state, env = process.env, now = Date.now()) {
  return config.providers.filter((p) => {
    if (p.enableEnv && !env[p.enableEnv]) return false;
    if (p.keyEnv && !env[p.keyEnv]) return false;
    const until = state.providers?.[p.id]?.cooldownUntil;
    return !until || new Date(until).getTime() <= now;
  });
}

// Weighted shuffle of free providers; paid providers always go last.
export function rouletteOrder(providers, random = Math.random) {
  const free = providers.filter((p) => p.tier !== "paid");
  const paid = providers.filter((p) => p.tier === "paid");
  const order = [];
  const pool = [...free];
  while (pool.length) {
    const total = pool.reduce((t, p) => t + (p.weight || 1), 0);
    let roll = random() * total;
    const idx = pool.findIndex((p) => (roll -= p.weight || 1) < 0);
    order.push(...pool.splice(idx === -1 ? 0 : idx, 1));
  }
  return [...order, ...paid];
}

// Pull a JSON object out of a model reply that may include fences or chatter.
export function extractJson(text) {
  if (typeof text !== "string" || !text.trim()) throw new ProviderError("empty reply", { kind: "bad_output" });
  let t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(t);
  } catch {}
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) throw new ProviderError("reply contained no JSON object", { kind: "bad_output" });
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (err) {
    throw new ProviderError(`reply JSON did not parse: ${err.message}`, { kind: "bad_output" });
  }
}

// Pick a replacement model from a provider's /models list.
export function chooseModel(ids, p, exclude = []) {
  const skip = new Set(exclude.map((id) => id.replace(/^models\//, "")));
  const clean = ids.map((id) => id.replace(/^models\//, "")).filter((id) => !skip.has(id));
  const avoid = (p.avoid || []).map((s) => s.toLowerCase());
  const usable = clean.filter((id) => {
    const l = id.toLowerCase();
    if (p.require && !l.includes(p.require.toLowerCase())) return false;
    return !avoid.some((a) => l.includes(a));
  });
  for (const pref of p.prefer || []) {
    const hit = usable.find((id) => id.toLowerCase().includes(pref.toLowerCase()));
    if (hit) return hit;
  }
  return usable[0] || null;
}

// Raw chat call to an OpenAI-compatible endpoint. Returns { text, model }.
async function openAIChat(p, messages, ctx, { json = false, maxTokens = 8000 } = {}) {
  const key = p.keyEnv ? ctx.env[p.keyEnv] : "ollama";
  const model = ctx.state.providers?.[p.id]?.model || p.model;
  const jsonMode = json && (ctx.state.providers?.[p.id]?.jsonMode ?? p.jsonMode);
  const body = { model, [p.maxTokensParam || "max_tokens"]: maxTokens, messages };
  if (!p.noTemperature) body.temperature = ctx.config.temperature ?? 0.9;
  if (jsonMode) body.response_format = { type: "json_object" };

  let res;
  try {
    res = await fetch(`${p.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": ctx.siteUrl,
        "X-Title": "Machine Made God",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout((ctx.config.requestTimeoutSeconds || 120) * 1000),
    });
  } catch (err) {
    throw new ProviderError(`network error: ${err.message}`, { kind: "error" });
  }

  const text = await res.text();
  if (!res.ok) {
    const lower = text.toLowerCase();
    // Out of credits / quota: bench for a day rather than retrying every run.
    if (/insufficient_quota|credit_balance|billing|no credits/.test(lower)) throw new ProviderError("out of credits", { kind: "auth", status: res.status });
    if (res.status === 429) throw new ProviderError("rate limited", { kind: "rate_limit", status: 429 });
    if (res.status === 401 || res.status === 403) throw new ProviderError("key rejected", { kind: "auth", status: res.status });
    if (jsonMode && res.status === 400 && lower.includes("response_format")) {
      ctx.remember(p.id, { jsonMode: false });
      return openAIChat(p, messages, ctx, { json, maxTokens });
    }
    if (res.status === 404 || /model.*(not found|does not exist|decommission|deprecated|not supported|invalid|no longer available)|no endpoints found/.test(lower)) {
      throw new ProviderError(`model "${model}" unavailable`, { kind: "model", status: res.status });
    }
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 200)}`, { kind: "error", status: res.status });
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProviderError("provider returned non-JSON response", { kind: "error" });
  }
  const content = data.choices?.[0]?.message?.content;
  return { text: Array.isArray(content) ? content.map((c) => c.text || "").join("") : content || "", model: data.model || model };
}

async function callOpenAICompatible(p, { system, user }, ctx) {
  const { text, model } = await openAIChat(
    p,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    ctx,
    { json: true }
  );
  return { json: extractJson(text), model };
}

async function discoverModel(p, ctx, exclude = []) {
  if (p.type !== "openai") return null;
  const key = p.keyEnv ? ctx.env[p.keyEnv] : "ollama";
  try {
    const res = await fetch(`${p.baseUrl.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ids = (data.data || data.models || []).map((m) => m.id || m.name).filter(Boolean);
    return chooseModel(ids, p, exclude);
  } catch {
    return null;
  }
}

// Claude via the official SDK. `format` (a JSON schema) switches on structured output.
async function anthropicMessage(p, { system, messages, schema, maxTokens = 16000 }, ctx) {
  const client = new Anthropic({ apiKey: ctx.env[p.keyEnv], maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: p.model,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      ...(system ? { system } : {}),
      messages,
      output_config: schema ? { effort: "medium", format: { type: "json_schema", schema } } : { effort: "low" },
    });
    if (response.stop_reason === "refusal") throw new ProviderError("model declined the request", { kind: "refusal" });
    if (response.stop_reason === "max_tokens") throw new ProviderError("reply was cut off", { kind: "bad_output" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { text, model: response.model || p.model };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new ProviderError("rate limited", { kind: "rate_limit", status: 429 });
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
      throw new ProviderError("key rejected", { kind: "auth", status: err.status });
    if (err instanceof Anthropic.NotFoundError) throw new ProviderError(`model "${p.model}" unavailable`, { kind: "model", status: 404 });
    if (err instanceof Anthropic.APIStatusError) throw new ProviderError(`HTTP ${err.status}: ${err.message}`, { kind: "error", status: err.status });
    if (err instanceof Anthropic.APIConnectionError) throw new ProviderError(`network error: ${err.message}`, { kind: "error" });
    throw new ProviderError(err.message || String(err), { kind: "error" });
  }
}

async function callAnthropic(p, { system, user, schema }, ctx) {
  const { text, model } = await anthropicMessage(p, { system, messages: [{ role: "user", content: user }], schema }, ctx);
  return { json: extractJson(text), model };
}

async function callMock(p, request, ctx) {
  return { json: ctx.mock(request), model: "mock" };
}

// Retry once on a replacement model if the configured one has been retired.
async function withModelRepair(p, ctx, fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.kind !== "model") throw err;
    const current = ctx.state.providers?.[p.id]?.model || p.model;
    // Providers sometimes still list retired models, so never re-pick the one that just failed.
    const replacement = await discoverModel(p, ctx, [current, p.model]);
    if (!replacement || replacement === current) throw err;
    ctx.log(`  ↻ ${p.id}: "${current}" is gone, switching to "${replacement}"`);
    ctx.remember(p.id, { model: replacement });
    return fn();
  }
}

export async function callProvider(p, request, ctx) {
  if (p.type === "mock") return callMock(p, request, ctx);
  if (p.type === "anthropic") return callAnthropic(p, request, ctx);
  return withModelRepair(p, ctx, () => callOpenAICompatible(p, request, ctx));
}

// Plain conversation (used by the control panel playground). Returns { text, model }.
export async function chatProvider(p, { system, messages }, ctx) {
  if (p.type === "mock") return { text: "mock reply", model: "mock" };
  if (p.type === "anthropic") return anthropicMessage(p, { system, messages, maxTokens: 4000 }, ctx);
  const full = system ? [{ role: "system", content: system }, ...messages] : messages;
  return withModelRepair(p, ctx, () => openAIChat(p, full, ctx, { maxTokens: 4000 }));
}

// Spin the wheel: try providers in roulette order until `accept` returns a value.
// `accept(json)` must return the finished item or throw a ProviderError("bad_output").
export async function spin(request, accept, ctx) {
  const tried = [];
  let order = rouletteOrder(availableProviders(ctx.config, ctx.state, ctx.env), ctx.random);
  if (ctx.preferNot) order = [...order.filter((p) => p.id !== ctx.preferNot), ...order.filter((p) => p.id === ctx.preferNot)];
  const max = ctx.config.maxAttemptsPerPiece || 6;
  for (const p of order.slice(0, max)) {
    // A provider can be benched mid-run (rate limit), so re-check.
    if (!availableProviders(ctx.config, ctx.state, ctx.env).some((x) => x.id === p.id)) continue;
    try {
      const { json, model } = await callProvider(p, request, ctx);
      const item = accept(json, { provider: p.id, model });
      ctx.record(p.id, true);
      return { item, provider: p.id, model, tried };
    } catch (err) {
      const kind = err.kind || "error";
      tried.push(`${p.id}: ${err.message}`);
      ctx.record(p.id, false);
      ctx.log(`  ✗ ${p.id} (${kind}): ${err.message}`);
      if (kind === "rate_limit" || kind === "auth" || kind === "model") {
        const minutes = kind === "auth" ? 24 * 60 : ctx.config.cooldownMinutes || 360;
        ctx.remember(p.id, { cooldownUntil: new Date(Date.now() + minutes * 60000).toISOString(), lastError: err.message });
      }
    }
  }
  const reason = tried.length ? tried.join("; ") : "no providers available";
  throw new ProviderError(`every provider failed: ${reason}`);
}
