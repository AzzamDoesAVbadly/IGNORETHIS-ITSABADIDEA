// Meaning-based memory for THE MACHINE, using a local embedding model through Ollama
// (embeddinggemma by default). Every published piece gets a short vector saved in
// src/data/embeddings.json, keyed by its URL. The generator uses them to reject new
// pieces that retell an old joke in different words, and the site build uses them
// for "More Like This". If Ollama isn't reachable, callers fall back to word matching.

import { createHash } from "node:crypto";
import { cosine } from "../../src/lib/schema.mjs";

// EmbeddingGemma expects a task prefix; title + dek carry the joke.
export const embedText = ({ title, dek }) => `task: sentence similarity | query: ${title}. ${dek || ""}`.trim();

const hashOf = (text) => createHash("sha256").update(text).digest("hex").slice(0, 12);

// Truncate to `dims` (the model is trained so the leading dimensions stand alone),
// re-normalize so a dot product is the cosine, and round to keep the JSON small.
function shrink(vector, dims) {
  const v = vector.slice(0, dims);
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => Math.round((x / norm) * 1e4) / 1e4);
}

export async function embed(texts, { host, model, dims, timeoutSeconds = 120 }) {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const res = await fetch(`${host}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: texts.slice(i, i + 32), truncate: true }),
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
    if (!res.ok) throw new Error(`embed HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { embeddings } = await res.json();
    out.push(...embeddings.map((v) => shrink(v, dims)));
  }
  return out;
}

// Bring the store in line with `pieces` ([{ url, title, dek }]): embed new or edited
// pieces, drop deleted ones. A store made with another model or size starts over.
export async function syncStore(store, pieces, opts) {
  const fresh = store?.model === opts.model && store?.dims === opts.dims ? store : { model: opts.model, dims: opts.dims, vectors: {} };
  const vectors = {};
  const todo = [];
  for (const p of pieces) {
    const hash = hashOf(embedText(p));
    const old = fresh.vectors[p.url];
    if (old?.hash === hash) vectors[p.url] = old;
    else todo.push({ url: p.url, hash, text: embedText(p) });
  }
  const made = await embed(todo.map((t) => t.text), opts);
  todo.forEach((t, i) => (vectors[t.url] = { hash: t.hash, v: made[i] }));
  return { store: { model: opts.model, dims: opts.dims, vectors }, added: todo.length };
}

// One piece per line, so the file stays small and git diffs show which pieces changed.
export function serializeStore({ model, dims, vectors }) {
  const lines = Object.entries(vectors).map(([url, entry]) => `    ${JSON.stringify(url)}: ${JSON.stringify(entry)}`);
  return `{\n  "model": ${JSON.stringify(model)},\n  "dims": ${dims},\n  "vectors": {\n${lines.join(",\n")}\n  }\n}\n`;
}

// The closest stored piece at or above `threshold`, or null.
export function nearestAbove(vector, vectors, threshold) {
  let best = null;
  for (const [url, entry] of Object.entries(vectors)) {
    const score = cosine(vector, entry.v);
    if (score >= threshold && (!best || score > best.score)) best = { url, score };
  }
  return best;
}
