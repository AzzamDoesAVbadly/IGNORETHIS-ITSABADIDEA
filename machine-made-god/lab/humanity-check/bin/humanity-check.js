#!/usr/bin/env node
// humanity-check CLI: grade files (or stdin) for machine-written prose.
import { readFileSync } from "node:fs";
import { analyze, lineCol, MIN_WORDS } from "../src/index.js";

const HELP = `humanity-check — the Organic Prose Assay. A product of MMG LABS.

Usage
  humanity-check [options] <file...>
  cat draft.txt | humanity-check

Options
  --max-score <n>  Exit with code 1 if any file scores above n (0-100)
  --json           Print the full analysis as JSON
  --quiet          Print one line per file
  -h, --help       Show this help
  -v, --version    Show the version

Scores run from 0 (certified human) to 100 (fully extruded slop).
https://machinemadegod.pages.dev/lab/humanity-check/`;

function parseArgs(argv) {
  const opts = { files: [], maxScore: null, json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-v" || a === "--version") opts.version = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--quiet" || a === "-q") opts.quiet = true;
    else if (a === "--max-score" || a.startsWith("--max-score=")) {
      const v = a.includes("=") ? a.split("=")[1] : argv[++i];
      opts.maxScore = Number(v);
      if (!Number.isFinite(opts.maxScore) || opts.maxScore < 0 || opts.maxScore > 100) throw new Error(`--max-score must be a number from 0 to 100, got "${v}"`);
    } else if (a.startsWith("-") && a !== "-") throw new Error(`Unknown option ${a}. Try --help.`);
    else opts.files.push(a);
  }
  return opts;
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const c = { bold: paint("1"), dim: paint("2"), red: paint("31"), green: paint("32"), yellow: paint("33"), orange: paint("38;5;208"), cyan: paint("36") };
const gradeColor = { human: c.green, person: c.green, smooth: c.yellow, synthetic: c.orange, slop: c.red };

function meter(score) {
  const filled = Math.round(score / 5);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

function report(name, text, r) {
  const color = gradeColor[r.grade.id];
  const lines = [];
  lines.push(c.bold(name));
  lines.push(`  SLOP INDEX ${color(c.bold(String(r.score).padStart(3)))}/100  ${color(meter(r.score))}  ${color(c.bold(r.grade.label))}`);
  lines.push(c.dim(`  ${r.grade.verdict}`));
  if (r.tooShort) lines.push(c.dim(`  (Only ${r.words} words. Under ${MIN_WORDS}, treat the verdict as a hunch.)`));
  const shown = r.findings.filter((f) => f.weight !== 0);
  if (shown.length) lines.push("");
  for (const f of shown) {
    const where = f.index >= 0 ? lineCol(text, f.index) : null;
    const loc = where ? `${where.line}:${where.column}` : "—";
    const tag = f.weight < 0 ? c.green("+human") : f.category === "residue" ? c.red("residue") : c.yellow(f.category);
    const quote = f.match ? c.cyan(JSON.stringify(f.match.length > 48 ? `${f.match.slice(0, 47)}…` : f.match)) : c.cyan(f.label);
    lines.push(`  ${c.dim(loc.padEnd(8))}${tag.padEnd(useColor ? 21 : 12)} ${quote}`);
    lines.push(`  ${" ".repeat(8)}${c.dim(f.why)}`);
  }
  lines.push("");
  lines.push(c.dim(`  ${r.words} words · ${r.tells} tells · ${r.humanSignals} human signals`));
  return lines.join("\n");
}

// GitHub Actions turns these into inline annotations on the pull request.
function annotate(name, text, r) {
  const esc = (s) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
  const prop = (s) => esc(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
  for (const f of r.findings) {
    if (f.weight <= 0 || f.index < 0) continue;
    const { line, column } = lineCol(text, f.index);
    console.log(`::warning file=${prop(name)},line=${line},col=${column},title=${prop(`Humanity Check - ${f.label}`)}::${esc(f.why)}`);
  }
  console.log(`::notice file=${prop(name)},title=${prop(`Humanity Check - ${r.grade.label}`)}::${esc(`Slop index ${r.score}/100. ${r.grade.verdict}`)}`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.version) {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    console.log(pkg.version);
    return 0;
  }
  if (opts.help || (!opts.files.length && process.stdin.isTTY)) {
    console.log(HELP);
    return opts.help ? 0 : 2;
  }

  const inputs = opts.files.length
    ? opts.files.map((f) => ({ name: f, text: f === "-" ? null : readFileSync(f, "utf8") }))
    : [{ name: "stdin", text: null }];
  for (const input of inputs) if (input.text === null) input.text = await readStdin();

  const results = inputs.map(({ name, text }) => ({ name, text, result: analyze(text) }));
  const failed = opts.maxScore === null ? [] : results.filter((r) => r.result.score > opts.maxScore);

  if (opts.json) {
    const out = results.map(({ name, result }) => ({ file: name, ...result }));
    console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
  } else {
    if (process.env.GITHUB_ACTIONS === "true") for (const r of results) annotate(r.name, r.text, r.result);
    for (const r of results) {
      if (opts.quiet) console.log(`${String(r.result.score).padStart(3)}  ${r.result.grade.label.padEnd(26)}  ${r.name}`);
      else console.log(report(r.name, r.text, r.result) + "\n");
    }
    if (failed.length) console.error(c.red(`✗ ${failed.length} file(s) over the max slop index of ${opts.maxScore}: ${failed.map((f) => f.name).join(", ")}`));
  }
  return failed.length ? 1 : 0;
}

main().then(
  (code) => (process.exitCode = code),
  (err) => {
    console.error(`humanity-check: ${err.message}`);
    process.exitCode = 2;
  },
);
