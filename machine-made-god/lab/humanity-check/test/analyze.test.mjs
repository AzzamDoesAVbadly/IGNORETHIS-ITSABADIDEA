import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, RULES, GRADES, lineCol, mask } from "../src/index.js";

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("human writing grades as human", () => {
  for (const name of ["human.txt", "human-work.txt", "human-essay.txt"]) {
    const r = analyze(fixture(name));
    assert.ok(r.score < 15, `${name} scored ${r.score}`);
    assert.equal(r.grade.id, "human", name);
  }
});

test("chatbot writing grades as slop", () => {
  for (const name of ["slop.txt", "chatbot-plain.txt", "corporate-apology.txt"]) {
    const r = analyze(fixture(name));
    assert.ok(r.score >= 80, `${name} scored ${r.score}`);
    assert.equal(r.grade.id, "slop", name);
  }
});

test("findings point at the exact text in the original string", () => {
  const text = fixture("slop.txt");
  for (const f of analyze(text).findings) {
    if (f.index < 0) continue;
    assert.equal(text.slice(f.index, f.index + f.length), f.match);
  }
});

test("findings never overlap", () => {
  const spans = analyze(fixture("slop.txt")).findings.filter((f) => f.index >= 0);
  for (let i = 1; i < spans.length; i++) {
    assert.ok(spans[i].index >= spans[i - 1].index + spans[i - 1].length, `${spans[i - 1].match} overlaps ${spans[i].match}`);
  }
});

test("a phrase outranks the word inside it", () => {
  const r = analyze("In today's fast-paced digital landscape, we ship.");
  assert.deepEqual(r.findings.map((f) => f.rule), ["todays-world"]);
});

test("chatbot residue is caught", () => {
  for (const line of ["As an AI language model, I can't.", "Here's a comprehensive overview of the plan.", "I hope this helps!", "Feel free to reach out with questions."]) {
    assert.ok(analyze(line).findings.some((f) => f.category === "residue"), line);
  }
});

test("curly apostrophes match like straight ones", () => {
  assert.ok(analyze("It’s important to note the deadline.").findings.some((f) => f.rule === "important-to-note"));
});

test("code and URLs are ignored", () => {
  const md = "Install it:\n\n```js\nconst tapestry = delve(synergy);\n```\n\nSee `leverage()` at https://example.com/delve-into-synergy.";
  assert.equal(analyze(md).tells, 0);
  assert.equal(mask(md).length, md.length);
});

test("quoted phrases are mentions, not uses", () => {
  assert.equal(analyze(`Stop opening emails with "I hope this email finds you well" and “Let's delve in.”`).tells, 0);
  assert.ok(analyze("I hope this email finds you well. Let's delve in.").tells >= 2);
});

test("human signals lower the score", () => {
  const base = "We should leverage the robust new process to streamline onboarding for the whole team this quarter.";
  const salty = `${base} lol idk, this is kinda bullshit tbh.`;
  assert.ok(analyze(salty).score < analyze(base).score);
  assert.ok(analyze(salty).humanSignals >= 3);
});

test("short text is flagged but still scored", () => {
  const r = analyze("Let's delve in.");
  assert.equal(r.tooShort, true);
  assert.ok(r.score > 0 && r.score < 100);
});

test("empty input is safe", () => {
  const r = analyze("");
  assert.equal(r.score, 0);
  assert.equal(r.words, 0);
  assert.deepEqual(r.findings, []);
});

test("every rule has a readable label, a reason, and a global pattern", () => {
  const ids = new Set();
  for (const rule of RULES) {
    assert.ok(!ids.has(rule.id), `duplicate id ${rule.id}`);
    ids.add(rule.id);
    assert.ok(rule.why.length > 10, rule.id);
    assert.ok(rule.pattern.global, rule.id);
    assert.doesNotMatch(rule.label, /\(\?|[|\\[\]]/, rule.id);
  }
});

test("grades cover 0 to 100 in order", () => {
  assert.equal(GRADES.at(-1).max > 100, true);
  for (let i = 1; i < GRADES.length; i++) assert.ok(GRADES[i].max > GRADES[i - 1].max);
});

test("lineCol is 1-based", () => {
  assert.deepEqual(lineCol("ab\ncd", 3), { line: 2, column: 1 });
  assert.deepEqual(lineCol("ab\ncd", 0), { line: 1, column: 1 });
});
