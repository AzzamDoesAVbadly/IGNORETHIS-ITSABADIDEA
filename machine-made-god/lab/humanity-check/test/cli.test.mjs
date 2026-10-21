import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/humanity-check.js", import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const run = (args, input, env = {}) =>
  spawnSync(process.execPath, [bin, ...args], { input, encoding: "utf8", env: { ...process.env, NO_COLOR: "1", GITHUB_ACTIONS: "", ...env } });

test("--max-score fails only when a file is over the limit", () => {
  assert.equal(run(["--quiet", "--max-score", "50", fixture("human.txt")]).status, 0);
  const bad = run(["--quiet", "--max-score", "50", fixture("human.txt"), fixture("slop.txt")]);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /slop\.txt/);
});

test("reads stdin and prints JSON", () => {
  const out = run(["--json"], "In today's fast-paced world, let's delve into synergy.");
  assert.equal(out.status, 0);
  const json = JSON.parse(out.stdout);
  assert.ok(json.score > 50);
  assert.ok(json.findings.length >= 3);
});

test("emits GitHub annotations inside Actions", () => {
  const out = run([fixture("slop.txt")], undefined, { GITHUB_ACTIONS: "true" });
  assert.match(out.stdout, /^::warning file=.*slop\.txt,line=1,col=1,title=Humanity Check - /m);
  // GitHub's workflow-command format requires % to be written as %25.
  assert.match(out.stdout, /^::notice .*100%25 SLOP/m);
});

test("bad options exit 2 with a message", () => {
  const out = run(["--max-score", "lots", fixture("human.txt")]);
  assert.equal(out.status, 2);
  assert.match(out.stderr, /--max-score/);
});
