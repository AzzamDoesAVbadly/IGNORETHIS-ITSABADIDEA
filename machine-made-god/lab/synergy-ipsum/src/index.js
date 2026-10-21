// SYNERGY ENGINE — lorem ipsum for the end times.
// Seeded and deterministic: the same seed always returns the same text.
import { BANKS, SENTENCES, HEADLINES, MEMO_SUBJECTS, MISSIONS } from "./banks.js";
import { logoSvg } from "./logo.js";

export { logoSvg };

export const TYPES = ["paragraphs", "sentences", "words", "headlines", "memo", "mission", "cookie", "terms", "slogan", "company"];

function hashSeed(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// mulberry32: small, fast, good enough for jokes.
function rng(seed) {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.random().toString(36).slice(2, 10);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const SMALL = new Set(["a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "by", "for", "with", "at", "as", "if", "via"]);
// Headline case, leaving the first word, quoted slogans and acronyms alone.
const titleCase = (line) => {
  let quoted = false;
  return line.split(" ").map((w, i) => {
    const inQuote = quoted || w.startsWith('"');
    if (w.startsWith('"')) quoted = true;
    if (w.endsWith('"') || w.endsWith('":')) quoted = false;
    if (inQuote || i === 0 || (SMALL.has(w) && i > 0)) return w;
    return w.replace(/(^|-)([a-z])/g, (_, d, c) => d + c.toUpperCase());
  }).join(" ");
};

// A generation context: seeded picks that avoid repeating themselves until a
// bank runs out, plus fixed document variables like {company}.
function context(seed, vars = {}) {
  const random = rng(seed);
  const used = new Map();
  const ctx = {
    random,
    vars,
    int: (min, max) => min + Math.floor(random() * (max - min + 1)),
    pick(list, key = list) {
      const seen = used.get(key) || new Set();
      if (seen.size >= list.length) seen.clear();
      let i;
      do i = Math.floor(random() * list.length);
      while (seen.has(i));
      seen.add(i);
      used.set(key, seen);
      return list[i];
    },
    expand(template, depth = 0) {
      return template.replace(/\{(\^?)(\w+)\}/g, (_, up, name) => {
        let out;
        if (name in ctx.vars) out = String(ctx.vars[name]);
        else if (BANKS[name] && depth < 6) out = ctx.expand(ctx.pick(BANKS[name], name), depth + 1);
        else return `{${name}}`;
        return up ? cap(out) : out;
      });
    },
  };
  return ctx;
}

/** A complete fake megacorp. Same seed, same company. */
export function company({ seed = randomSeed() } = {}) {
  const ctx = context(`company:${seed}`);
  const name = ctx.pick(BANKS.prefix) + ctx.pick(BANKS.suffix);
  const full = `${name} ${ctx.pick(BANKS.entity)}`;
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  const ticker = (letters.slice(0, 2) + letters.slice(-2)).slice(0, 4);
  const ceo = `${ctx.pick(BANKS.first)} ${ctx.pick(BANKS.last)}`;
  ctx.vars = { company: full, name, domain: `${name.toLowerCase()}.ai` };
  const industry = ctx.pick(BANKS.industry);
  ctx.vars.industry = industry;
  const price = ctx.int(3, 900) + ctx.int(0, 99) / 100;
  const change = (ctx.random() < 0.6 ? 1 : -1) * (ctx.int(1, 4800) / 100);
  return {
    seed: String(seed),
    name: full,
    shortName: name,
    ticker,
    domain: ctx.vars.domain,
    industry,
    slogan: ctx.expand(ctx.pick(BANKS.slogan)),
    mission: ctx.expand(ctx.pick(MISSIONS)),
    ceo,
    ceoTitle: `Chief ${ctx.pick(BANKS.title)} Officer`,
    founded: ctx.int(2009, 2025),
    employees: ctx.int(4, 980) * 10,
    agents: ctx.int(2, 90) * 1000,
    hq: ctx.pick(BANKS.hq),
    stock: { price: Math.round(price * 100) / 100, change: Math.round(change * 100) / 100 },
    palette: ctx.int(0, 5),
    mark: ctx.int(0, 5),
  };
}

function docContext(seed, co) {
  const c = co || company({ seed });
  return context(`doc:${seed}`, { company: c.name, name: c.shortName, domain: c.domain, industry: c.industry, slogan: c.slogan });
}

function paragraph(ctx, sentences) {
  const out = [];
  for (let i = 0; i < sentences; i++) out.push(ctx.expand(ctx.pick(SENTENCES, "sentences")));
  return out.join(" ");
}

const GENERATORS = {
  paragraphs: (ctx, n) => Array.from({ length: n }, () => paragraph(ctx, ctx.int(3, 5))).join("\n\n"),
  sentences: (ctx, n) => paragraph(ctx, n),
  words: (ctx, n) => {
    const pools = [BANKS.adjective, BANKS.noun, BANKS.verb, BANKS.abstract].map((bank) => bank.filter((w) => !w.includes(" ")));
    const words = Array.from({ length: n }, (_, i) => ctx.pick(pools[i % pools.length], `w${i % pools.length}`));
    return cap(words.join(" ")) + ".";
  },
  headlines: (ctx, n) => Array.from({ length: n }, () => titleCase(ctx.expand(ctx.pick(HEADLINES, "headlines")))).join("\n"),
  memo: (ctx, n, co) => {
    const subject = titleCase(ctx.expand(ctx.pick(MEMO_SUBJECTS)));
    const body = Array.from({ length: Math.max(2, n) }, () => paragraph(ctx, ctx.int(3, 4))).join("\n\n");
    return `Subject: ${subject}\n\n${ctx.pick(["Team,", `Dear ${co.shortName} Family,`, "Hi all,", "Colleagues,"])}\n\n${body}\n\nWith gratitude,\n${co.ceo}\n${co.ceoTitle}, ${co.name}`;
  },
  mission: (ctx, n) => Array.from({ length: n }, () => ctx.expand(ctx.pick(MISSIONS, "missions"))).join("\n\n"),
  slogan: (ctx, n) => Array.from({ length: n }, () => ctx.expand(ctx.pick(BANKS.slogan, "slogans"))).join("\n"),
  cookie: (ctx) =>
    ctx.expand("We use cookies to {purpose}, {purpose} and {purpose}. By {consent}, you agree to {consequence}.") +
    "\n\n[ Accept all ]  [ Accept all, but sadly ]  [ Manage 412 partners ]",
  terms: (ctx, n, co) => {
    const clauses = Array.from({ length: Math.max(1, n) }, () => `• ${ctx.pick(BANKS.clause, "clause")}`).join("\n");
    return `Subject: We've updated our Terms of Service\n\nHi there,\n\nWe're writing to let you know about some changes to the ${co.name} Terms of Service. Here's what's new:\n\n${clauses}\n\n${ctx.expand("These changes take effect {when}. No action is needed. No action is possible.")}\n\nThanks for being part of the ${co.shortName} community.`;
  },
  company: (ctx, n, co) =>
    `${co.name} (${co.ticker})\n"${co.slogan}"\n\n${co.mission}\n\nIndustry: ${co.industry}\nFounded: ${co.founded}\nHQ: ${co.hq}\nCEO: ${co.ceo}, ${co.ceoTitle}\nEmployees: ${co.employees.toLocaleString("en-US")} humans, ${co.agents.toLocaleString("en-US")} agents`,
};

const DEFAULT_COUNT = { paragraphs: 3, sentences: 5, words: 12, headlines: 5, memo: 3, mission: 1, slogan: 5, cookie: 1, terms: 3, company: 1 };

/**
 * Generate text of one type. `count` means paragraphs, sentences, words,
 * headlines or clauses depending on the type. Pass `company` to keep a set of
 * documents consistent with one fake megacorp.
 */
export function generate(type = "paragraphs", { count, seed = randomSeed(), company: co } = {}) {
  if (!GENERATORS[type]) throw new Error(`Unknown type "${type}". Try one of: ${TYPES.join(", ")}`);
  const n = Math.max(1, Math.min(50, Math.floor(count ?? DEFAULT_COUNT[type])));
  const c = co || company({ seed });
  // "a" before a vowel sound becomes "an", whatever the slots produced.
  return GENERATORS[type](docContext(`${type}:${seed}`, c), n, c).replace(/\b([Aa]) (?=[aeiouAEIO])/g, "$1n ");
}

/** Classic lorem-ipsum shape: `paragraphs` paragraphs of corporate filler. */
export function ipsum({ paragraphs = 3, seed } = {}) {
  return generate("paragraphs", { count: paragraphs, seed });
}
