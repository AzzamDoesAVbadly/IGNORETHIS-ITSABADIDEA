#!/usr/bin/env node
// THE MACHINE. Writes new articles, quizzes, ticker lines, bumps and parody ads,
// using whichever free AI provider the roulette lands on, then saves them as files.
// The site build validates everything again before anything deploys.
//
//   npm run generate                 normal run
//   npm run generate -- --dry-run    generate and print, write nothing
//   npm run generate -- --check      test each configured provider, write nothing
//   MACHINE_MOCK=1 npm run generate  offline run with canned content (for testing)

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATS, MOTIFS, PALETTES, slugify, validateArticle, validateQuiz, findNearDuplicate, BANNED_PHRASES } from "../src/lib/schema.mjs";
import { spin, availableProviders, callProvider, ProviderError } from "./lib/roulette.mjs";
import { articleSchema, quizSchema, extrasSchema } from "./lib/schemas.mjs";
import { mockReply } from "./lib/mock.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const paths = {
  config: join(root, "machine.config.json"),
  state: join(root, "src/data/machine-state.json"),
  articles: join(root, "src/content/articles"),
  quizzes: join(root, "src/content/quizzes"),
  data: join(root, "src/data"),
  prompts: join(root, "prompts"),
};

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const CHECK = args.has("--check");
const env = process.env;

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback);
const writeJson = (p, v) => !DRY && writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
const log = (...a) => console.log(...a);

const config = readJson(paths.config);
const state = readJson(paths.state, { providers: {}, lastQuizAt: null, runs: [] });
state.providers ||= {};
const categories = readJson(join(paths.data, "categories.json"));
const authors = readJson(join(paths.data, "authors.json"));
const voice = readFileSync(join(paths.prompts, "voice.md"), "utf8");
const formats = readJson(join(paths.prompts, "formats.json"));
const sparks = readJson(join(paths.prompts, "sparks.json"));

if (env.MACHINE_MOCK) {
  config.providers = [{ id: "mock", type: "mock", weight: 1 }];
}

// On-demand mode (from the control panel): one article from a requested idea.
const ON_DEMAND = Boolean(env.MACHINE_IDEA || env.MACHINE_CATEGORY);
const IDEA = String(env.MACHINE_IDEA || "").trim().slice(0, 600);

const random = Math.random;
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => random() - 0.5).slice(0, n);

const ctx = {
  config,
  state,
  env,
  random,
  log,
  siteUrl: env.SITE_URL || JSON.parse(readFileSync(join(root, "src/data/site.json"), "utf8")).url,
  mock: mockReply,
  remember(id, patch) {
    state.providers[id] = { ...(state.providers[id] || {}), ...patch };
  },
  record(id, ok) {
    const s = (state.providers[id] ||= {});
    s[ok ? "ok" : "fail"] = (s[ok ? "ok" : "fail"] || 0) + 1;
    if (ok) {
      s.lastSuccess = new Date().toISOString();
      delete s.lastError;
    }
  },
};

// ---------- existing content ----------

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^["[{]/.test(v)) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.replace(/^"|"$/g, "");
      }
    }
    fm[kv[1]] = v;
  }
  return fm;
}

function loadExisting() {
  const articles = readdirSync(paths.articles)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, ""), ...parseFrontmatter(readFileSync(join(paths.articles, f), "utf8")) }));
  const quizzes = readdirSync(paths.quizzes)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ slug: f.replace(/\.json$/, ""), ...readJson(join(paths.quizzes, f)) }));
  const all = [...articles, ...quizzes].sort((a, b) => new Date(b.date) - new Date(a.date));
  return { articles, quizzes, all, titles: all.map((x) => x.title) };
}

// ---------- planning ----------

const AUTHOR_BY_CATEGORY = {
  news: ["god-exe", "intern-4471", "dirk-hotfix"],
  entertainment: ["intern-4471", "the-algorithm"],
  lists: ["dirk-hotfix", "brenda-legal", "intern-4471"],
  internet: ["the-algorithm", "intern-4471"],
  politics: ["god-exe", "brenda-legal"],
  lifestyle: ["intern-4471", "dirk-hotfix"],
  music: ["corpsebloom"],
  reviews: ["dirk-hotfix", "the-algorithm"],
  conspiracy: ["the-algorithm", "god-exe"],
  corporate: ["brenda-legal", "dirk-hotfix", "god-exe"],
  quizzes: ["intern-4471", "dirk-hotfix", "god-exe"],
};

function chooseCategory(existing, taken) {
  const recent = existing.all.slice(0, 30);
  const options = categories.filter((c) => c.slug !== "quizzes");
  // Fewer recent posts = higher chance. Don't repeat a category within one run.
  const weights = options.map((c) => {
    if (taken.includes(c.slug)) return 0.05;
    const n = recent.filter((x) => x.category === c.slug).length;
    return 1 / (1 + n);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  return options[weights.findIndex((w) => (roll -= w) < 0)] || options[0];
}

function chooseFormat(category, existing) {
  if (category.slug === "reviews") return "review";
  if (category.slug === "lists") return "listicle";
  const recentFormats = existing.articles.slice(0, 6).map((a) => a.format);
  const pool =
    category.slug === "corporate"
      ? ["announcement", "announcement", "news", "essay"]
      : ["news", "news", "news", "listicle", "essay", "announcement"];
  const fresh = pool.filter((f) => !recentFormats.slice(0, 2).includes(f));
  return pick(fresh.length ? fresh : pool);
}

function exemplarFor(format) {
  const slug = config.exemplars?.[format];
  const file = slug && join(paths.articles, `${slug}.md`);
  if (!file || !existsSync(file)) return "";
  const text = readFileSync(file, "utf8");
  const fm = parseFrontmatter(text);
  const body = text.replace(/^---[\s\S]*?---\s*/, "").trim();
  return `\nHere is a published piece in the same format. Match its specificity, deadpan voice and joke density. Do NOT reuse its premise, jokes, names or structure beats:\n\n<example>\nHEADLINE: ${fm.title}\nDEK: ${fm.dek}\n\n${body}\n</example>\n`;
}

function articlePrompt({ category, format, existing }) {
  const recent = existing.titles.slice(0, 60).map((t) => `- ${t}`).join("\n");
  const request = IDEA ? `\nTHE EDITOR-IN-CHIEF REQUESTED THIS IDEA. Build the piece around it (still obeying every hard rule): ${IDEA}\n` : "";
  const user = `Write ONE new piece for the "${category.name}" section.
Section description: ${category.blurb}

FORMAT: ${format}
${formats[format]}
${exemplarFor(format)}
${request}
${IDEA ? "" : `Creative sparks (optional; use one, combine two, or ignore them if you have a better idea): ${sample(sparks, 3).join(", ")}.`}

Recent headlines. Do NOT repeat their premises, targets, or headline structures:
${recent}

Return ONLY a JSON object with exactly these keys:
{
  "title": "headline, 10-120 characters",
  "dek": "one-sentence subhead that adds a new joke, 20-200 characters",
  "body": "the article in Markdown. No H1 title. Use ## for subheadings. 350-700 words.",
  "tags": ["3-6 short lowercase topic tags"],
  "art": { "motif": one of ${JSON.stringify(MOTIFS)}, "palette": one of ${JSON.stringify(PALETTES)}, "label": "2-20 character fake company or object name shown in the illustration" },
  "pullquote": "the funniest single line from the body, under 140 characters, or empty string",
  "rating": ${format === "review" ? "star rating 0-5 (halves allowed)" : "0"},
  "product": ${format === "review" ? '"name of the invented product"' : '""'},
  "uses_real_people": true if the piece names or depicts any real person, otherwise false
}`;
  return { system: voice, user, schema: articleSchema, schemaName: "article" };
}

function editorPrompt(draft, format) {
  const user = `You are the comedy editor. Below is a draft ${format} piece that is accurate to the brief but not funny enough. Rewrite it so it is genuinely funny.

Do this:
- Keep the core premise and format, but find the sharpest version of the joke. You may improve the headline.
- Escalate: every paragraph or list item must top the one before. The final beat must be the strongest or strangest moment, not a summary.
- Add specific, absurd, concrete details (exact numbers, invented names, petty specifics). Cut generic phrasing.
- Delete any sentence that explains the satire, analyzes "society", "engagement", or "the attention economy", or sounds like a real news analyst. Deadpan, never sincere-analytical.
- No moral, no lesson, no "remains to be seen", no "one thing is clear".
- If the headline starts with a number, the list must contain exactly that many "## N." items.
- Obey every hard rule in the editorial bible (no real people, no real companies as targets, etc.).

Return ONLY a JSON object with exactly the same keys as the draft: title, dek, body, tags, art, pullquote, rating, product, uses_real_people.

DRAFT:
${JSON.stringify(draft, null, 2)}`;
  return { system: voice, user, schema: articleSchema, schemaName: "article-edit" };
}

function quizPrompt(existing) {
  const recent = existing.quizzes.map((q) => `- ${q.title}`).join("\n") || "- (none yet)";
  const user = `Write ONE new personality quiz for the "Personality Quizzes" section. It's a joke quiz: specific, absurd, and relatable. It must never pretend to give a real psychological or medical assessment.

Creative sparks (optional): ${sample(sparks, 3).join(", ")}.

Existing quizzes. Do NOT repeat their premises:
${recent}

Rules:
- 6 questions, each with 4 or 5 answers.
- 4 or 5 results. Every answer maps to a result id via "r". Every result must be reachable, and spread answers roughly evenly.
- Result titles are funny and specific. Result bodies are 60-110 words, second person, and get more specific as they go.
- "share" is a one-line brag/confession for social media, under 120 characters.

Return ONLY a JSON object with exactly these keys:
{
  "title": "quiz headline, 20-120 characters",
  "dek": "subhead, 20-200 characters",
  "tags": ["3-5 lowercase tags"],
  "art": { "motif": one of ${JSON.stringify(MOTIFS)}, "palette": one of ${JSON.stringify(PALETTES)}, "label": "2-20 characters" },
  "questions": [ { "q": "question text", "answers": [ { "a": "answer text", "r": "result_id" } ] } ],
  "results": [ { "id": "result_id", "title": "...", "body": "...", "share": "..." } ],
  "uses_real_people": false
}`;
  return { system: voice, user, schema: quizSchema, schemaName: "quiz" };
}

function extrasPrompt(counts, recent) {
  const user = `Write fresh filler content for the site's chrome.

1. ${counts.ticker} breaking-news ticker lines. Format: "CATEGORY: absurd deadpan headline", under 110 characters each. CATEGORY is one word like BREAKING, MARKETS, WEATHER, TECH, SCIENCE, CULTURE, SPORTS, TRAFFIC, HEALTH, UPDATE.
2. ${counts.bumps} late-night TV "bumps": lowercase, 2-5 short lines separated by \\n, quiet, dry and a little surreal, speaking directly to the viewer at night. Under 180 characters.
3. ${counts.ads} parody ads for invented products from invented brands. Each needs "brand", "headline" (clickbait style, under 90 characters), "body" (under 160 characters), "cta" (button text, under 30 characters) and "palette" (one of: hazard, sodium, sick, teal, bleach, crt).

Avoid repeating any of these recent lines:
${recent.map((r) => `- ${r}`).join("\n")}

Return ONLY a JSON object: { "ticker": [...], "bumps": [...], "ads": [ { "brand": "", "headline": "", "body": "", "cta": "", "palette": "" } ] }`;
  return { system: voice, user, schema: extrasSchema, schemaName: "extras" };
}

// ---------- normalizing model output ----------

const bad = (msg) => {
  throw new ProviderError(msg, { kind: "bad_output" });
};

function cleanArt(art = {}, fallbackLabel = "NEXORA") {
  const motif = MOTIFS.includes(art.motif) ? art.motif : pick(MOTIFS);
  const palette = PALETTES.includes(art.palette) ? art.palette : pick(PALETTES);
  let label = String(art.label || fallbackLabel).replace(/[^\w\s.\-#!?&+']/g, "").trim().slice(0, 22);
  if (label.length < 2) label = fallbackLabel;
  return { motif, palette, label };
}

const cleanTags = (tags) =>
  (Array.isArray(tags) ? tags : String(tags || "").split(","))
    .map((t) => String(t).toLowerCase().replace(/^#/, "").trim())
    .filter((t) => t && t.length <= 30)
    .slice(0, 6);

function hasLinksOrHandles(text) {
  return /https?:\/\/|www\.|(^|\s)@\w{2,}|(^|\s)#[a-z]\w+/i.test(text);
}

function makeArticle(json, { category, format, existing, runTitles, date }) {
  if (json.uses_real_people === true) bad("model reported real people in the piece");
  const title = String(json.title || "").trim().replace(/^#+\s*/, "").replace(/^"|"$/g, "");
  let body = String(json.body || "").trim();
  body = body.replace(/^#\s+.*\n+/, ""); // drop a repeated H1 title
  if (hasLinksOrHandles(body)) bad("body contains links, handles or hashtags");
  const dupe = findNearDuplicate(title, [...existing.titles, ...runTitles], config.duplicateThreshold ?? 0.45);
  if (dupe) bad(`too similar to "${dupe.title}" (${dupe.score.toFixed(2)})`);

  const fm = {
    title,
    dek: String(json.dek || "").trim(),
    category: category.slug,
    author: pick(AUTHOR_BY_CATEGORY[category.slug] || authors.map((a) => a.id)),
    date,
    format,
    tags: cleanTags(json.tags),
    art: cleanArt(json.art),
  };
  if (!fm.tags.length) fm.tags = [category.short.toLowerCase()];
  const pull = String(json.pullquote || "").trim().replace(/^["“]|["”]$/g, "");
  if (pull && pull.length <= 160) fm.pullquote = pull;
  if (format === "review") {
    fm.rating = Math.max(0, Math.min(5, Math.round(Number(json.rating) * 2) / 2 || 2));
    if (json.product) fm.product = String(json.product).slice(0, 60);
  }
  const errors = validateArticle(fm, body, { categories, authors }, "draft");
  if (errors.length) bad(errors.join("; "));
  return { fm, body };
}

function makeQuiz(json, { existing, date }) {
  if (json.uses_real_people === true) bad("model reported real people in the quiz");
  const results = {};
  for (const r of Array.isArray(json.results) ? json.results : []) {
    const id = slugify(r.id || r.title).replace(/-/g, "_").slice(0, 30);
    if (id) results[id] = { title: String(r.title || "").trim(), body: String(r.body || "").trim(), share: String(r.share || "").trim() };
  }
  const idMap = {};
  for (const r of json.results || []) idMap[r.id] = slugify(r.id || r.title).replace(/-/g, "_").slice(0, 30);
  const quiz = {
    title: String(json.title || "").trim(),
    dek: String(json.dek || "").trim(),
    author: pick(AUTHOR_BY_CATEGORY.quizzes),
    date,
    tags: cleanTags(json.tags),
    trending: true,
    art: cleanArt(json.art, "QUIZ"),
    questions: (json.questions || []).map((q) => ({
      q: String(q.q || "").trim(),
      answers: (q.answers || []).map((a) => ({ a: String(a.a || "").trim(), r: idMap[a.r] ?? slugify(a.r || "").replace(/-/g, "_") })),
    })),
    results,
  };
  const dupe = findNearDuplicate(quiz.title, existing.titles, config.duplicateThreshold ?? 0.45);
  if (dupe) bad(`quiz too similar to "${dupe.title}"`);
  const errors = validateQuiz(quiz, { authors }, "draft quiz");
  if (errors.length) bad(errors.join("; "));
  return quiz;
}

function makeExtras(json, recent) {
  const seen = new Set(recent.map((r) => r.toLowerCase()));
  const okText = (s, max) => typeof s === "string" && s.trim().length > 5 && s.length <= max && !BANNED_PHRASES.some((b) => s.toLowerCase().includes(b)) && !seen.has(s.toLowerCase());
  const ticker = (json.ticker || []).map((s) => String(s).trim()).filter((s) => okText(s, 130));
  const bumps = (json.bumps || []).map((s) => String(s).trim().toLowerCase()).filter((s) => okText(s, 220));
  const ads = (json.ads || [])
    .filter((a) => a && okText(a.headline, 110) && okText(a.body, 200) && a.brand && a.cta)
    .map((a) => ({
      id: slugify(a.brand + "-" + a.headline).slice(0, 40),
      brand: String(a.brand).slice(0, 60),
      headline: a.headline.trim(),
      body: a.body.trim(),
      cta: String(a.cta).slice(0, 32),
      palette: PALETTES.includes(a.palette) ? a.palette : "hazard",
    }));
  if (!ticker.length && !bumps.length && !ads.length) bad("no usable extras");
  return { ticker, bumps, ads };
}

// ---------- writing ----------

const frontmatter = (obj) =>
  "---\n" +
  Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n") +
  "\n---\n\n";

function uniqueSlug(base, dir, ext) {
  let slug = base || `untitled-${Date.now()}`;
  let n = 2;
  while (existsSync(join(dir, `${slug}${ext}`))) slug = `${base}-${n++}`;
  return slug;
}

// ---------- commands ----------

async function check() {
  log("Checking providers…\n");
  const ready = availableProviders(config, { providers: {} }, env);
  for (const p of config.providers) {
    if (!ready.includes(p)) {
      log(`  – ${p.id}: skipped (${p.keyEnv ? `set ${p.keyEnv}` : `set ${p.enableEnv}=1`})`);
      continue;
    }
    try {
      const { json, model } = await callProvider(
        p,
        { system: "Reply with JSON only.", user: 'Return {"ok": true, "joke": "a one-line deadpan joke about printers"}', schema: { type: "object", additionalProperties: false, required: ["ok", "joke"], properties: { ok: { type: "boolean" }, joke: { type: "string" } } }, schemaName: "check" },
        ctx
      );
      log(`  ✓ ${p.id} (${model}): ${json.joke || "ok"}`);
    } catch (err) {
      log(`  ✗ ${p.id}: ${err.message}`);
    }
  }
  writeJson(paths.state, state);
}

async function run() {
  if (!ON_DEMAND && (config.enabled === false || String(env.MACHINE_ENABLED).toLowerCase() === "false")) {
    log("The machine is switched off (machine.config.json \"enabled\" or MACHINE_ENABLED=false). Nothing to do.");
    return;
  }
  const ready = availableProviders(config, state, env);
  if (!ready.length) {
    const keys = config.providers.filter((p) => p.keyEnv).map((p) => p.keyEnv);
    console.error(`No AI providers are available.\nAdd at least one free API key as an environment variable / GitHub secret: ${keys.join(", ")}.\nProviders on cooldown: ${Object.entries(state.providers).filter(([, s]) => s.cooldownUntil && new Date(s.cooldownUntil) > new Date()).map(([id, s]) => `${id} until ${s.cooldownUntil}`).join(", ") || "none"}.`);
    process.exit(1);
  }
  log(`The machine wakes. Providers in the chamber: ${ready.map((p) => p.id).join(", ")}${DRY ? " (dry run)" : ""}\n`);

  const existing = loadExisting();
  const summary = { at: new Date().toISOString(), onDemand: ON_DEMAND || undefined, idea: IDEA || undefined, articles: [], quiz: null, extras: null, failures: [] };
  const runTitles = [];
  const takenCats = [];
  const start = Date.now();

  const articleCount = ON_DEMAND ? 1 : config.articlesPerRun ?? 2;
  for (let i = 0; i < articleCount; i++) {
    const requestedCat = ON_DEMAND && categories.find((c) => c.slug === env.MACHINE_CATEGORY && c.slug !== "quizzes");
    const category = requestedCat || chooseCategory(existing, takenCats);
    takenCats.push(category.slug);
    const format = ON_DEMAND && FORMATS.includes(env.MACHINE_FORMAT) ? env.MACHINE_FORMAT : chooseFormat(category, existing);
    if (IDEA) log(`  (requested idea: ${IDEA.slice(0, 120)})`);
    const date = new Date(start + i * 60000).toISOString();
    log(`→ Article ${i + 1}: ${category.name} / ${format}`);
    try {
      let draftJson = null;
      let { item, provider, model } = await spin(
        articlePrompt({ category, format, existing }),
        (json) => {
          const made = makeArticle(json, { category, format, existing, runTitles, date });
          draftJson = json;
          return made;
        },
        ctx
      );
      if (config.editorPass !== false) {
        log(`  ✎ editing draft from ${provider}…`);
        try {
          const edited = await spin(
            editorPrompt({ ...draftJson, title: item.fm.title, body: item.body }, format),
            (json) => makeArticle(json, { category, format, existing, runTitles, date }),
            { ...ctx, preferNot: provider, config: { ...config, maxAttemptsPerPiece: 3 } }
          );
          item = edited.item;
          provider = `${provider}+${edited.provider}`;
          model = `${model} → ${edited.model}`;
        } catch (err) {
          log(`  (editor pass failed, keeping the draft: ${err.message.slice(0, 160)})`);
        }
      }
      item.fm.trending = true;
      if (i === 0) item.fm.featured = true;
      if (random() < 0.35) item.fm.pick = true;
      const slug = uniqueSlug(slugify(item.fm.title), paths.articles, ".md");
      if (DRY) log(frontmatter(item.fm) + item.body + "\n");
      else writeFileSync(join(paths.articles, `${slug}.md`), frontmatter(item.fm) + item.body + "\n");
      runTitles.push(item.fm.title);
      existing.titles.unshift(item.fm.title);
      existing.articles.unshift({ ...item.fm, slug });
      summary.articles.push({ slug, provider, model });
      log(`  ✓ "${item.fm.title}" via ${provider} (${model})`);
    } catch (err) {
      summary.failures.push(`article ${i + 1}: ${err.message}`);
      log(`  ✗ gave up on article ${i + 1}: ${err.message}`);
    }
  }

  const daysSinceQuiz = state.lastQuizAt ? (Date.now() - new Date(state.lastQuizAt)) / 86400000 : Infinity;
  if (!ON_DEMAND && daysSinceQuiz >= (config.quizEveryDays ?? 3)) {
    log("→ Quiz");
    try {
      const { item, provider, model } = await spin(quizPrompt(existing), (json) => makeQuiz(json, { existing, date: new Date(start + 5 * 60000).toISOString() }), ctx);
      const slug = uniqueSlug(slugify(item.title), paths.quizzes, ".json");
      if (DRY) log(JSON.stringify(item, null, 2));
      else writeJson(join(paths.quizzes, `${slug}.json`), item);
      state.lastQuizAt = new Date().toISOString();
      summary.quiz = { slug, provider, model };
      log(`  ✓ "${item.title}" via ${provider}`);
    } catch (err) {
      summary.failures.push(`quiz: ${err.message}`);
      log(`  ✗ gave up on quiz: ${err.message}`);
    }
  }

  const counts = { ticker: config.tickerPerRun ?? 4, bumps: config.bumpsPerRun ?? 2, ads: config.adsPerRun ?? 1 };
  if (!ON_DEMAND && counts.ticker + counts.bumps + counts.ads > 0) {
    log("→ Ticker, bumps & parody ads");
    const ticker = readJson(join(paths.data, "ticker.json"), []);
    const bumps = readJson(join(paths.data, "bumps.json"), []);
    const ads = readJson(join(paths.data, "ads.json"), []);
    const recent = [...ticker.slice(-25), ...bumps.slice(-10), ...ads.slice(-10).map((a) => a.headline)];
    try {
      const { item, provider } = await spin(extrasPrompt(counts, recent), (json) => makeExtras(json, recent), ctx);
      const newAds = item.ads.filter((a) => !ads.some((x) => x.id === a.id));
      if (DRY) log(JSON.stringify(item, null, 2));
      else {
        writeJson(join(paths.data, "ticker.json"), [...ticker, ...item.ticker.slice(0, counts.ticker)].slice(-40));
        writeJson(join(paths.data, "bumps.json"), [...bumps, ...item.bumps.slice(0, counts.bumps)].slice(-150));
        writeJson(join(paths.data, "ads.json"), [...ads, ...newAds.slice(0, counts.ads)].slice(-40));
      }
      summary.extras = { provider, ticker: item.ticker.length, bumps: item.bumps.length, ads: newAds.length };
      log(`  ✓ +${item.ticker.length} ticker, +${item.bumps.length} bumps, +${newAds.length} ads via ${provider}`);
    } catch (err) {
      summary.failures.push(`extras: ${err.message}`);
      log(`  ✗ gave up on extras: ${err.message}`);
    }
  }

  state.runs = [summary, ...(state.runs || [])].slice(0, 30);
  writeJson(paths.state, state);

  const made = summary.articles.length + (summary.quiz ? 1 : 0);
  log(`\nDone. ${made} new piece(s). ${summary.failures.length} failure(s).`);
  // Fail the job (so GitHub emails you) only if the machine produced nothing at all.
  if (made === 0 && !summary.extras) process.exit(1);
}

(CHECK ? check() : run()).catch((err) => {
  console.error(`The machine crashed: ${err.stack || err.message}`);
  process.exit(1);
});
