import { test } from "node:test";
import assert from "node:assert/strict";
import { embed, embedText, syncStore, nearestAbove, serializeStore } from "../scripts/lib/embeddings.mjs";
import { cosine } from "../src/lib/schema.mjs";
import { spin } from "../scripts/lib/roulette.mjs";

const opts = { host: "http://ollama.test", model: "embeddinggemma", dims: 2 };

// Fake Ollama: each text gets a 3-number vector from its length, and every call is counted.
function fakeOllama(t) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const { input } = JSON.parse(init.body);
    calls.push({ url, input });
    return new Response(JSON.stringify({ embeddings: input.map((s) => [s.length, 1, 99]) }));
  });
  return calls;
}

test("embed truncates to dims and returns unit-length vectors", async (t) => {
  const calls = fakeOllama(t);
  const [v] = await embed(["abc"], opts);
  assert.equal(calls[0].url, "http://ollama.test/api/embed");
  assert.equal(v.length, 2);
  assert.ok(Math.abs(cosine(v, v) - 1) < 1e-3);
});

test("syncStore embeds only new or edited pieces and drops deleted ones", async (t) => {
  const calls = fakeOllama(t);
  const pieces = [
    { url: "/a/one/", title: "One", dek: "first" },
    { url: "/a/two/", title: "Two", dek: "second" },
  ];
  const { store, added } = await syncStore(null, pieces, opts);
  assert.equal(added, 2);

  const edited = [{ ...pieces[0], dek: "first, but funnier" }];
  const next = await syncStore(store, edited, opts);
  assert.equal(next.added, 1);
  assert.deepEqual(Object.keys(next.store.vectors), ["/a/one/"]);
  assert.deepEqual(calls.at(-1).input, [embedText(edited[0])]);

  const again = await syncStore(next.store, edited, opts);
  assert.equal(again.added, 0);
  assert.equal(calls.length, 2);
});

test("syncStore starts over when the model or size changes", async (t) => {
  fakeOllama(t);
  const pieces = [{ url: "/a/one/", title: "One", dek: "first" }];
  const { store } = await syncStore(null, pieces, opts);
  const { added } = await syncStore(store, pieces, { ...opts, model: "other-embedder" });
  assert.equal(added, 1);
});

test("nearestAbove returns the closest piece over the threshold, or null", () => {
  const vectors = { "/a/same/": { v: [1, 0] }, "/a/close/": { v: [0.8, 0.6] }, "/a/far/": { v: [0, 1] } };
  assert.deepEqual(nearestAbove([1, 0], vectors, 0.7), { url: "/a/same/", score: 1 });
  assert.equal(nearestAbove([0.6, -0.8], vectors, 0.7), null);
});

test("serializeStore writes valid JSON with one piece per line", () => {
  const store = { model: "m", dims: 2, vectors: { "/a/x/": { hash: "h1", v: [0.6, 0.8] }, "/quiz/y/": { hash: "h2", v: [1, 0] } } };
  const text = serializeStore(store);
  assert.deepEqual(JSON.parse(text), store);
  assert.equal(text.split("\n").filter((l) => l.includes('"hash"')).length, 2);
});

test("spin waits for an async accept (the embedding check is async)", async () => {
  const ctx = {
    config: { providers: [{ id: "m", type: "mock", keyEnv: null, weight: 1 }], maxAttemptsPerPiece: 1 },
    state: { providers: {} },
    env: {},
    random: Math.random,
    log: () => {},
    mock: () => ({ title: "x" }),
    remember() {},
    record() {},
  };
  const result = await spin({ schemaName: "x" }, async (json) => ({ ...json, checked: true }), ctx);
  assert.equal(result.item.checked, true);
});
