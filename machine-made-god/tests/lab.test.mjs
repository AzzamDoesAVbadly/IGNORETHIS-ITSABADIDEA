// The Lab products vouch for each other: everything SYNERGY ENGINE writes
// should be caught by HUMANITY CHECK. If this fails, one of them got worse.
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../lab/synergy-ipsum/src/index.js";
import { analyze } from "../lab/humanity-check/src/index.js";
import lab from "../src/data/lab.json" with { type: "json" };

test("Synergy Engine's corporate prose reads as synthetic", () => {
  // Terms updates are deadpan legalese with no AI habits, so they are exempt.
  for (const type of ["memo", "paragraphs"]) {
    const scores = Array.from({ length: 20 }, (_, i) => analyze(generate(type, { seed: `x${i}` })).score);
    const median = scores.sort((a, b) => a - b)[10];
    assert.ok(median >= 35, `${type} median slop index ${median}: ${scores.join(",")}`);
  }
});

test("every live Lab product has a page and a repo", async () => {
  const { existsSync } = await import("node:fs");
  for (const p of lab.filter((p) => p.status === "live")) {
    assert.ok(existsSync(new URL(`../src/pages/lab/${p.slug}.astro`, import.meta.url)), p.slug);
    assert.match(p.repo, /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/, p.slug);
  }
});
