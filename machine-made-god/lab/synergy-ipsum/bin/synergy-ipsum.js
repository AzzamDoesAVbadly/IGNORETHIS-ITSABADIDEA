#!/usr/bin/env node
// synergy-ipsum CLI: placeholder text for the end times.
import { readFileSync } from "node:fs";
import { generate, company, logoSvg, TYPES } from "../src/index.js";

const HELP = `synergy-ipsum — lorem ipsum for the end times. A product of MMG LABS.

Usage
  synergy-ipsum [type] [options]

Types
  paragraphs (default)  corporate filler, 3 paragraphs
  sentences | words | headlines | memo | mission | slogan | cookie | terms
  company               a whole fake megacorp
  logo                  that megacorp's logo, as SVG

Options
  -n, --count <n>   How many paragraphs, sentences, words, headlines or clauses
  -s, --seed <s>    Same seed, same output (and the same company)
  --json            Print { type, seed, text } as JSON
  -h, --help        Show this help
  -v, --version     Show the version

Examples
  npx synergy-ipsum -n 2
  npx synergy-ipsum memo --seed q3-reorg
  npx synergy-ipsum logo --seed q3-reorg > logo.svg

https://machinemadegod.netlify.app/lab/synergy-engine/`;

function parse(argv) {
  const opts = { type: "paragraphs" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = a.includes("=") ? a.slice(a.indexOf("=") + 1) : argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-v" || a === "--version") opts.version = true;
    else if (a === "--json") opts.json = true;
    else if (a === "-n" || a.startsWith("--count")) {
      opts.count = Number(value());
      if (!Number.isInteger(opts.count) || opts.count < 1 || opts.count > 50) throw new Error("--count must be a whole number from 1 to 50");
    } else if (a === "-s" || a.startsWith("--seed")) opts.seed = value();
    else if (a.startsWith("-")) throw new Error(`Unknown option ${a}. Try --help.`);
    else opts.type = a;
  }
  if (opts.type !== "logo" && !TYPES.includes(opts.type)) throw new Error(`Unknown type "${opts.type}". Types: ${TYPES.join(", ")}, logo`);
  return opts;
}

try {
  const opts = parse(process.argv.slice(2));
  if (opts.help) console.log(HELP);
  else if (opts.version) console.log(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version);
  else {
    const seed = opts.seed ?? Math.random().toString(36).slice(2, 10);
    const text = opts.type === "logo" ? logoSvg(company({ seed })) : generate(opts.type, { count: opts.count, seed });
    console.log(opts.json ? JSON.stringify({ type: opts.type, seed, text }, null, 2) : text);
  }
} catch (err) {
  console.error(`synergy-ipsum: ${err.message}`);
  process.exitCode = 2;
}
