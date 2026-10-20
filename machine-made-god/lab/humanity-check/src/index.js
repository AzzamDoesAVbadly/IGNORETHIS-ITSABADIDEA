// HUMANITY CHECK — scores how machine-written a piece of text reads.
// Pure functions, no dependencies: runs in Node, browsers and workers alike.
import { RULES } from "./rules.js";

export { RULES };

export const GRADES = [
  { id: "human", max: 15, label: "CERTIFIED HUMAN", verdict: "Warm-blooded. Inconsistent. Possibly hungover. Congratulations: a person wrote this." },
  { id: "person", max: 35, label: "PROBABLY A PERSON", verdict: "Mostly organic. Trace synthetic fibers detected. Could be a human who reads a lot of LinkedIn." },
  { id: "smooth", max: 60, label: "SUSPICIOUSLY SMOOTH", verdict: "Either a chatbot wrote this, or a human who has spent far too long with one." },
  { id: "synthetic", max: 80, label: "CORPORATE-GRADE SYNTHETIC", verdict: "This text has the texture of a press release about a press release." },
  { id: "slop", max: 101, label: "100% SLOP", verdict: "Fully extruded. No human hands were involved in the making of this text." },
];

// Below this many words a verdict means little; the score is still shown.
export const MIN_WORDS = 30;

// Points per 100 words at which the score reaches ~63/100. Tuned against the
// fixtures in test/: a plain human email lands under 15, a chatbot answer
// over 80.
const SCALE = 7;

const RHYTHM = {
  id: "rhythm",
  label: "Metronome rhythm",
  category: "formatting",
  why: "Every sentence is about the same length. People ramble, then stop. Short. Then they go on for a while about something that only matters to them.",
};

// Same-length copy with code, URLs, HTML and quotations blanked, so prose rules
// don't fire on code or on phrases the writer is quoting rather than using,
// and every index still points into the original text.
export function mask(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text
    .replace(/[’‘]/g, "'")
    .replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, blank)
    .replace(/`[^`\n]*`/g, blank)
    .replace(/<[^>\n]+>/g, blank)
    .replace(/\bhttps?:\/\/\S+/g, blank)
    .replace(/\]\([^)\s]+\)/g, (m) => "]" + blank(m.slice(1)))
    .replace(/"[^"\n]{1,160}"|“[^”\n]{1,160}”/g, blank);
}

const countWords = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;

function sentenceLengths(masked) {
  return masked
    .split(/(?<=[.!?])\s+|\n\s*\n|\n(?=\s*(?:[-*•#]|\d+\.))/)
    .map(countWords)
    .filter((n) => n >= 3);
}

// Coefficient of variation of sentence length: low means metronomic.
function rhythm(lengths) {
  if (lengths.length < 6) return null;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((a, n) => a + (n - mean) ** 2, 0) / lengths.length);
  return sd / mean;
}

export function gradeFor(score) {
  return GRADES.find((g) => score < g.max);
}

/**
 * Analyze text. Returns the slop score (0 = human, 100 = machine), a grade,
 * and every finding with its position in the original string.
 */
export function analyze(text = "") {
  const masked = mask(String(text));
  const candidates = [];

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const m of masked.matchAll(rule.pattern)) {
      if (!m[0].trim()) continue;
      candidates.push({ rule, index: m.index, length: m[0].length });
    }
  }

  // Keep the strongest claim on any stretch of text: "in today's digital
  // landscape" counts once as a phrase, not again as the word "landscape".
  candidates.sort((a, b) => Math.abs(b.rule.weight) - Math.abs(a.rule.weight) || a.index - b.index);
  const kept = [];
  const counts = new Map();
  for (const c of candidates) {
    const overlaps = kept.some((k) => c.index < k.index + k.length && k.index < c.index + c.length);
    if (overlaps) continue;
    const n = counts.get(c.rule.id) || 0;
    counts.set(c.rule.id, n + 1);
    c.counted = n < c.rule.cap;
    kept.push(c);
  }
  kept.sort((a, b) => a.index - b.index);

  const words = countWords(masked);
  const lengths = sentenceLengths(masked);
  const cv = rhythm(lengths);
  let points = 0;
  for (const c of kept) if (c.counted) points += c.rule.weight;
  const rhythmPoints = cv === null ? 0 : Math.max(0, Math.min(6, (0.42 - cv) * 24));
  points += rhythmPoints;

  // Score by density so long human texts aren't punished for length, with a
  // floor so one word in a tweet can't max out the meter.
  const density = (Math.max(0, points) / Math.max(words, 60)) * 100;
  const score = Math.min(100, Math.round(100 * (1 - Math.exp(-density / SCALE))));

  const findings = kept.map(({ rule, index, length, counted }) => ({
    rule: rule.id,
    label: rule.label,
    category: rule.category,
    why: rule.why,
    weight: rule.weight,
    counted,
    index,
    length,
    match: String(text).slice(index, index + length),
  }));
  if (rhythmPoints > 0) {
    findings.push({ rule: RHYTHM.id, label: RHYTHM.label, category: RHYTHM.category, why: RHYTHM.why, weight: Math.round(rhythmPoints * 10) / 10, counted: true, index: -1, length: 0, match: "" });
  }

  const summary = [];
  for (const f of findings) {
    let row = summary.find((s) => s.rule === f.rule);
    if (!row) summary.push((row = { rule: f.rule, label: f.label, category: f.category, why: f.why, count: 0, points: 0 }));
    row.count++;
    if (f.counted) row.points += f.weight;
  }
  for (const row of summary) row.points = Math.round(row.points * 10) / 10;
  summary.sort((a, b) => b.points - a.points);

  return {
    score,
    grade: gradeFor(score),
    words,
    sentences: lengths.length,
    rhythm: cv === null ? null : Math.round(cv * 100) / 100,
    tooShort: words < MIN_WORDS,
    tells: findings.filter((f) => f.weight > 0).length,
    humanSignals: findings.filter((f) => f.weight < 0).length,
    findings,
    summary,
  };
}

/** 1-based line and column of an index, for editor-style locations. */
export function lineCol(text, index) {
  const before = text.slice(0, Math.max(0, index));
  const line = before.split("\n").length;
  return { line, column: index - before.lastIndexOf("\n") };
}
