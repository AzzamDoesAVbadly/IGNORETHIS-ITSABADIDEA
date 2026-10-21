import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate, company, ipsum, logoSvg, TYPES } from "../src/index.js";
import { BANKS, SENTENCES, HEADLINES, MEMO_SUBJECTS, MISSIONS } from "../src/banks.js";

const seeds = Array.from({ length: 40 }, (_, i) => `seed-${i}`);

test("same seed, same output; different seed, different output", () => {
  for (const type of TYPES) {
    assert.equal(generate(type, { seed: "a" }), generate(type, { seed: "a" }), type);
  }
  assert.notEqual(ipsum({ seed: "a" }), ipsum({ seed: "b" }));
  assert.deepEqual(company({ seed: "a" }), company({ seed: "a" }));
});

test("every template slot resolves, for every type, across many seeds", () => {
  for (const seed of seeds) {
    for (const type of TYPES) {
      const text = generate(type, { seed, count: 6 });
      assert.doesNotMatch(text, /\{\^?\w+\}/, `${type}/${seed}: ${text}`);
      assert.doesNotMatch(text, /undefined|NaN|\s{3,}\S/, `${type}/${seed}`);
    }
  }
});

test("every slot named in a template exists", () => {
  const vars = new Set(["company", "name", "domain", "industry", "slogan"]);
  const templates = [...SENTENCES, ...HEADLINES, ...MEMO_SUBJECTS, ...MISSIONS, ...Object.values(BANKS).flat()];
  for (const t of templates) {
    for (const [, name] of t.matchAll(/\{\^?(\w+)\}/g)) assert.ok(name in BANKS || vars.has(name), `{${name}} in "${t}"`);
  }
});

test("count controls length", () => {
  assert.equal(generate("paragraphs", { seed: "c", count: 4 }).split("\n\n").length, 4);
  assert.equal(generate("headlines", { seed: "c", count: 7 }).split("\n").length, 7);
  assert.equal(generate("words", { seed: "c", count: 9 }).split(" ").length, 9);
  assert.equal((generate("terms", { seed: "c", count: 2 }).match(/^• /gm) || []).length, 2);
});

test("documents stay consistent with the company they're written for", () => {
  const co = company({ seed: "acme" });
  const memo = generate("memo", { seed: "acme", company: co });
  assert.ok(memo.includes(co.ceo) && memo.includes(co.ceoTitle));
  assert.ok(generate("terms", { seed: "acme", company: co }).includes(co.name));
});

test("company looks like a company", () => {
  for (const seed of seeds) {
    const co = company({ seed });
    assert.match(co.ticker, /^[A-Z]{4}$/);
    assert.match(co.domain, /^[a-z]+\.ai$/);
    assert.ok(co.founded >= 2009 && co.founded <= 2025);
    assert.ok(co.name.startsWith(co.shortName));
  }
});

test("logo is a standalone, escaped SVG", () => {
  const svg = logoSvg(company({ seed: "logo" }));
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 480 120"/);
  assert.match(svg, /<\/svg>$/);
  assert.doesNotMatch(svg, /href=|<script/);
  assert.ok(logoSvg({ ...company({ seed: "x" }), shortName: "<b>&", name: '"x"' }).includes("&lt;B&gt;&amp;"));
});

test("unknown types are rejected", () => {
  assert.throws(() => generate("sonnet"), /Unknown type/);
});

test("CLI prints text, JSON and logos, and rejects bad input", () => {
  const bin = fileURLToPath(new URL("../bin/synergy-ipsum.js", import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: "utf8" });
  assert.equal(run("memo", "--seed", "x").stdout.trim(), generate("memo", { seed: "x" }));
  assert.equal(JSON.parse(run("headlines", "-n", "2", "-s", "y", "--json").stdout).text.split("\n").length, 2);
  assert.match(run("logo", "--seed=z").stdout, /^<svg/);
  assert.equal(run("sonnet").status, 2);
  assert.equal(run("-n", "0").status, 2);
});

test("articles agree with the next word", () => {
  for (const seed of seeds) {
    for (const type of TYPES) assert.doesNotMatch(generate(type, { seed, count: 6 }), /\b[Aa] [aeiouAEIO]/, `${type}/${seed}`);
  }
});
