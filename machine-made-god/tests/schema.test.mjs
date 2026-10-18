import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, similarity, findNearDuplicate, validateArticle, validateQuiz, scoreQuiz } from "../src/lib/schema.mjs";
import categories from "../src/data/categories.json" with { type: "json" };
import authors from "../src/data/authors.json" with { type: "json" };

const body = "word ".repeat(300) + "\n\n## A heading\n\nMore words here.";
const goodArticle = {
  title: "Town Council Votes to Rename Itself the Town Council",
  dek: "The vote took four hours and nobody is sure what changed.",
  category: "politics",
  author: "god-exe",
  date: "2026-10-17T10:00:00Z",
  format: "news",
  tags: ["bureaucracy"],
  art: { motif: "memo", palette: "bleach", label: "COUNCIL" },
};

test("slugify makes short, clean, word-boundary slugs", () => {
  assert.equal(slugify("Man's 47th Tab: Lost!"), "mans-47th-tab-lost");
  const long = slugify("This Is An Extremely Long Headline That Goes On And On Well Past Any Reasonable Length For A URL Slug");
  assert.ok(long.length <= 70);
  assert.ok(!long.endsWith("-"));
});

test("similarity catches near-duplicate headlines but not unrelated ones", () => {
  assert.ok(similarity("Local Man Opens 47th Browser Tab", "Man Opens His 47th Browser Tab") > 0.6);
  assert.ok(similarity("Local Man Opens 47th Browser Tab", "Hardcore Band Splits Over Gas Stations") < 0.1);
  assert.equal(findNearDuplicate("A brand new idea about printers", ["Something else entirely"]), null);
});

test("a valid article passes validation", () => {
  assert.deepEqual(validateArticle(goodArticle, body, { categories, authors }), []);
});

test("article validation rejects bad fields, short bodies and banned phrases", () => {
  const errors = validateArticle({ ...goodArticle, category: "nope", art: { motif: "x", palette: "y", label: "" } }, "too short", { categories, authors });
  assert.ok(errors.some((e) => e.includes("unknown category")));
  assert.ok(errors.some((e) => e.includes("art.motif")));
  assert.ok(errors.some((e) => e.includes("too short")));
  const banned = validateArticle(goodArticle, body + " As an AI, I find this funny.", { categories, authors });
  assert.ok(banned.some((e) => e.includes("banned phrase")));
});

test("listicles need numbered headings and reviews need ratings", () => {
  const plain = "word ".repeat(300);
  assert.ok(validateArticle({ ...goodArticle, format: "listicle" }, plain, { categories, authors }).some((e) => e.includes("##")));
  assert.ok(validateArticle({ ...goodArticle, format: "review" }, body, { categories, authors }).some((e) => e.includes("rating")));
});

const quiz = {
  title: "Which Kind of Printer Error Are You?",
  dek: "Find out which way you would refuse to print.",
  author: "intern-4471",
  date: "2026-10-17T10:00:00Z",
  art: { motif: "crt", palette: "crt", label: "PRINT" },
  questions: Array.from({ length: 4 }, (_, i) => ({ q: `Question ${i}`, answers: [{ a: "A", r: "jam" }, { a: "B", r: "ink" }, { a: "C", r: "offline" }] })),
  results: {
    jam: { title: "Paper Jam", body: "You.", share: "I'm a jam." },
    ink: { title: "Low Ink", body: "You.", share: "I'm low ink." },
    offline: { title: "Offline", body: "You.", share: "I'm offline." },
  },
};

test("quiz validation passes a good quiz and catches unreachable results", () => {
  assert.deepEqual(validateQuiz(quiz, { authors }), []);
  const broken = { ...quiz, results: { ...quiz.results, ghost: { title: "Ghost", body: "Boo", share: "Boo" } } };
  assert.ok(validateQuiz(broken, { authors }).some((e) => e.includes("unreachable")));
});

test("quiz scoring picks the most common result and breaks ties with the last answer", () => {
  assert.equal(scoreQuiz(quiz, [0, 0, 1, 2]), "jam");
  assert.equal(scoreQuiz(quiz, [0, 1, 1, 0]), "jam");
  assert.equal(scoreQuiz(quiz, [0, 0, 1, 1]), "ink");
});

test("listicle headline numbers must match the item count, and wrap-up clichés are rejected", () => {
  const items = Array.from({ length: 8 }, (_, i) => `## ${i + 1}. Item\n\n${"word ".repeat(30)}`).join("\n\n");
  const fm = { ...goodArticle, format: "listicle", title: "6 Things That Are Definitely Six Things" };
  assert.ok(validateArticle(fm, items, { categories, authors }).some((e) => e.includes("promises 6")));
  assert.deepEqual(validateArticle({ ...fm, title: "8 Things That Are Definitely Eight Things" }, items, { categories, authors }), []);
  assert.ok(validateArticle(goodArticle, body + " Whether it works remains to be seen.", { categories, authors }).some((e) => e.includes("remains to be seen")));
});
