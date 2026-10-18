import { test } from "node:test";
import assert from "node:assert/strict";
import { availableProviders, rouletteOrder, extractJson, chooseModel, spin, ProviderError } from "../scripts/lib/roulette.mjs";

const providers = [
  { id: "a", type: "mock", keyEnv: "A_KEY", weight: 1 },
  { id: "b", type: "mock", keyEnv: "B_KEY", weight: 1 },
  { id: "local", type: "mock", keyEnv: null, enableEnv: "LOCAL_ON", weight: 1 },
  { id: "paid", type: "mock", keyEnv: "PAID_KEY", tier: "paid", weight: 9 },
];

test("only providers with keys (or enabled locally) and no cooldown are available", () => {
  const env = { A_KEY: "x", PAID_KEY: "y" };
  const later = new Date(Date.now() + 3600e3).toISOString();
  const ids = availableProviders({ providers }, { providers: {} }, env).map((p) => p.id);
  assert.deepEqual(ids, ["a", "paid"]);
  const cooled = availableProviders({ providers }, { providers: { a: { cooldownUntil: later } } }, env).map((p) => p.id);
  assert.deepEqual(cooled, ["paid"]);
  assert.ok(availableProviders({ providers }, { providers: {} }, { LOCAL_ON: "1" }).some((p) => p.id === "local"));
});

test("roulette always puts paid providers last, whatever their weight", () => {
  for (let i = 0; i < 50; i++) {
    const order = rouletteOrder(providers).map((p) => p.id);
    assert.equal(order.at(-1), "paid");
    assert.equal(order.length, 4);
  }
});

test("extractJson survives code fences and chatter", () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! Here you go: {"a": {"b": 2}} Hope that helps'), { a: { b: 2 } });
  assert.throws(() => extractJson("no json here"), ProviderError);
});

test("chooseModel respects require/avoid/prefer", () => {
  const p = { prefer: ["70b", "qwen"], avoid: ["guard"], require: ":free" };
  assert.equal(chooseModel(["llama-guard:free", "qwen-32b:free", "llama-70b:free", "llama-70b"], p), "llama-70b:free");
  assert.equal(chooseModel(["models/gemini-2.5-flash"], { prefer: ["flash"] }), "gemini-2.5-flash");
  assert.equal(chooseModel(["whisper"], { avoid: ["whisper"] }), null);
});

test("spin falls through to the next provider and benches rate-limited ones", async () => {
  const state = { providers: {} };
  const calls = [];
  const ctx = {
    config: { providers: providers.slice(0, 2), maxAttemptsPerPiece: 5, cooldownMinutes: 60 },
    state,
    env: { A_KEY: "x", B_KEY: "y" },
    random: () => 0, // always pick first in pool → order a, b
    log: () => {},
    remember: (id, patch) => (state.providers[id] = { ...(state.providers[id] || {}), ...patch }),
    record: () => {},
    mock: () => {
      calls.push(calls.length === 0 ? "a" : "b");
      if (calls.length === 1) throw new ProviderError("slow down", { kind: "rate_limit" });
      return { ok: true };
    },
  };
  const result = await spin({ schemaName: "x" }, (json) => json, ctx);
  assert.equal(result.provider, "b");
  assert.deepEqual(calls, ["a", "b"]);
  assert.ok(state.providers.a.cooldownUntil, "rate-limited provider gets a cooldown");
});

test("spin rejects bad output and reports every failure when all providers fail", async () => {
  const ctx = {
    config: { providers: providers.slice(0, 2) },
    state: { providers: {} },
    env: { A_KEY: "x", B_KEY: "y" },
    random: Math.random,
    log: () => {},
    remember: () => {},
    record: () => {},
    mock: () => ({ junk: true }),
  };
  await assert.rejects(
    spin({}, () => { throw new ProviderError("not funny enough", { kind: "bad_output" }); }, ctx),
    /every provider failed: .*not funny enough/
  );
});
