#!/usr/bin/env node
// MMG podcast: turns one politics/business/news article into a two-host "talk show" that
// opens as a dull, believable local-news chat and slowly slides into surreal madness.
// Voiced with AI text-to-speech, rendered as a landscape video with a waveform, and
// uploaded to YouTube when credentials are configured.
//
//   npm run podcast                       make an episode (and upload if configured)
//   npm run podcast -- --no-upload        render only
//   npm run podcast -- --slug <slug>      use one specific article
//
// Needs: ffmpeg on PATH, DASHSCOPE_API_KEY (voices) and at least one AI provider key.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { spin, ProviderError } from "./lib/roulette.mjs";
import { BANNED_PHRASES } from "../src/lib/schema.mjs";
import { ytReady, uploadToYouTube } from "./lib/youtube.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

const config = readJson(join(root, "machine.config.json"));
const cfg = { enabled: true, privacy: "public", categories: ["politics", "corporate", "news"], voices: ["Ethan", "Cherry"], show: "The Daily Docket", ...(config.podcast || {}) };
const state = readJson(join(root, "src/data/machine-state.json"), { providers: {} });
const SITE = (env.SITE_URL || readJson(join(root, "src/data/site.json")).url).replace(/\/$/, "");
const OUT = join(root, "podcast-out");
const LOG = join(root, "src/data/podcast-log.json");
const log = readJson(LOG, []);
const done = new Set(log.map((e) => e.ref));
const voiceBible = readFileSync(join(root, "prompts/voice.md"), "utf8");
mkdirSync(OUT, { recursive: true });

const W = 1280;
const H = 720;
const fonts = readdirSync(join(root, "assets/fonts")).filter((f) => f.endsWith(".ttf")).map((f) => join(root, "assets/fonts", f));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- article ----------

function parseFm(text) {
  const fm = {};
  for (const line of (text.match(/^---\n([\s\S]*?)\n---/)?.[1] || "").split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    try { fm[m[1]] = JSON.parse(m[2]); } catch { fm[m[1]] = m[2].replace(/^"|"$/g, ""); }
  }
  return fm;
}

function pickArticle(slug) {
  const dir = join(root, "src/content/articles");
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      return { slug: f.replace(/\.md$/, ""), body: text.replace(/^---\n[\s\S]*?\n---\n?/, "").trim(), ...parseFm(text) };
    })
    .filter((a) => !a.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  if (slug) return all.find((a) => a.slug === slug) || null;
  return all.find((a) => cfg.categories.includes(a.category) && !done.has(`article:${a.slug}`)) || null;
}

// ---------- script ----------

const ACTS = `Structure (about 42 lines, alternating hosts A and B, a few lines may run two or three sentences):
- Lines 1-12 "Believable": a calm, boring, plausible local-news or business talk show. Real-sounding cadence, sponsor read, small-town details, measured disagreement. Nothing odd yet. A casual listener must think this is a real program.
- Lines 13-22 "Slippage": one detail is slightly off. A number is too exact. A source has an odd job title. A host says something strange, and the other host politely moves on.
- Lines 23-32 "Breakdown": the strangeness is now undeniable and spreading. Hosts argue about things that make no sense while keeping the same professional tone. Rules of reality start bending.
- Lines 33-42 "Madness": full Adult Swim surrealism. Escalate to a bizarre, funny, committed ending, then a flat, cheerful sign-off as if nothing happened.
Never wink. The hosts never acknowledge it is getting weird. The tone stays deadpan the entire time.`;

function scriptPrompt(a) {
  return {
    system: voiceBible,
    user: `Write one episode of "${cfg.show}", a two-host talk show in the MACHINE MADE GOD universe. The first part is the straight-faced discussion of the article below, then it slides, gradually, into surreal madness.

${ACTS}

Source article (all people and companies in it are fictional; reuse them):
Title: ${a.title}
Summary: ${a.dek}
Text: """${String(a.body).slice(0, 3500)}"""

Rules:
- Hosts are "A" and "B". Give them invented first names mentioned once in the opening.
- Every person, company, town and institute you mention is invented. NO real people, politicians, parties, brands or events. Invent names; never reuse the name of a real figure.
- No slurs, no mockery of identity, no real tragedies.
- Each line is spoken text only: no stage directions, no sound effects in brackets, no markdown, no URLs.
- Each line under 450 characters.
- "title" must sound like a believable, boring episode title (the joke is that it sounds real). "description" is two plain sentences about the believable part of the episode.

Return JSON: {"title": string, "description": string, "lines": [{"who": "A"|"B", "text": string}], "uses_real_people": boolean}`,
  };
}

function acceptScript(json) {
  const bad = (m) => { throw new ProviderError(m, { kind: "bad_output" }); };
  if (!json || typeof json.title !== "string" || typeof json.description !== "string" || !Array.isArray(json.lines)) bad("missing fields");
  if (json.uses_real_people) bad("uses real people");
  if (json.lines.length < 30 || json.lines.length > 60) bad(`expected about 42 lines, got ${json.lines.length}`);
  const text = json.lines.map((l) => l.text).join(" ").toLowerCase();
  for (const l of json.lines) {
    if (!["A", "B"].includes(l.who) || typeof l.text !== "string" || !l.text.trim()) bad("bad line");
    if (l.text.length > 550) bad("line too long");
  }
  if (/https?:\/\/|www\.|@\w+/.test(text)) bad("contains links or handles");
  for (const phrase of BANNED_PHRASES) if (text.includes(phrase)) bad(`banned phrase "${phrase}"`);
  return { title: json.title.trim().slice(0, 90), description: json.description.trim(), lines: json.lines.map((l) => ({ who: l.who, text: l.text.trim() })) };
}

const ctx = {
  config: { ...config, maxAttemptsPerPiece: 4 },
  state,
  env,
  random: Math.random,
  log: (m) => console.log(m),
  siteUrl: SITE,
  remember: (id, patch) => (state.providers[id] = { ...(state.providers[id] || {}), ...patch }),
  record: () => {},
};

// ---------- audio ----------

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

async function speak(text, voice, file) {
  const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "qwen3-tts-flash", input: { text: text.slice(0, 600), voice, language_type: "English" } }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await res.json();
  const url = data.output?.audio?.url;
  if (!url) throw new Error(data.message || `no audio (HTTP ${res.status})`);
  writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
}

async function voiceAll(lines) {
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = join(OUT, `raw${i}.wav`);
    const fixed = join(OUT, `line${i}.wav`);
    await speak(lines[i].text, cfg.voices[lines[i].who === "A" ? 0 : 1], raw);
    ff(["-i", raw, "-ar", "44100", "-ac", "1", fixed]);
    parts.push(fixed);
    process.stdout.write(`\r  voiced ${i + 1}/${lines.length}`);
  }
  console.log("");
  const gap = join(OUT, "gap.wav");
  ff(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "0.4", gap]);
  const list = join(OUT, "voices.txt");
  writeFileSync(list, parts.map((p) => `file '${p}'\nfile '${gap}'`).join("\n"));
  const talk = join(OUT, "talk.wav");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", talk]);
  return talk;
}

// ---------- video ----------

function wrap(text, maxChars) {
  const lines = [];
  let line = "";
  for (const w of String(text).split(/\s+/)) {
    if ((line + " " + w).trim().length > maxChars && line) { lines.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function card(title) {
  const rows = wrap(title, 34).slice(0, 3);
  const text = rows.map((r, i) => `<text x="90" y="${250 + i * 62}" font-family="Inter" font-size="50" fill="#f1ede2">${esc(r)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0b0a09"/>
<rect x="90" y="96" width="14" height="46" fill="#ff6a13"/>
<text x="124" y="134" font-family="Archivo Black" font-size="40" fill="#ff6a13">${esc(cfg.show.toUpperCase())}</text>
${text}
<text x="90" y="690" font-family="IBM Plex Mono" font-size="24" fill="#7c766a">satire // fictional // voiced by AI</text></svg>`;
  return new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Archivo Black", sansSerifFamily: "Inter", monospaceFamily: "IBM Plex Mono" } }).render().asPng();
}

function render(title, talk, out) {
  const total = Math.ceil(duration(talk)) + 2;
  const img = join(OUT, "card.png");
  writeFileSync(img, card(title));
  // The background hum slowly rises across the episode: a quiet clue that things are about to go wrong.
  ff([
    "-loop", "1", "-framerate", "15", "-i", img,
    "-i", talk,
    "-f", "lavfi", "-t", String(total), "-i", "anoisesrc=color=brown:amplitude=0.05:seed=11:r=44100",
    "-filter_complex",
    `[2:a]lowpass=f=400,volume='0.01+0.09*t/${total}':eval=frame[n];[1:a][n]amix=inputs=2:duration=first:normalize=0[a];[a]asplit[a1][a2];[a2]showwaves=s=1100x150:mode=cline:colors=white:rate=15[w];[0:v][w]overlay=90:500,format=yuv420p[v]`,
    "-map", "[v]", "-map", "[a1]", "-r", "15", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-c:a", "aac", "-b:a", "128k", "-t", String(total), "-movflags", "+faststart", out,
  ]);
  return total;
}

// ---------- main ----------

async function main() {
  if (cfg.enabled === false || String(env.MACHINE_ENABLED).toLowerCase() === "false" || String(env.PODCAST_ENABLED).toLowerCase() === "false") {
    console.log("The podcast is switched off.");
    return;
  }
  if (!env.DASHSCOPE_API_KEY) { console.error("DASHSCOPE_API_KEY is needed for the voices."); process.exit(1); }
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });

  const article = pickArticle(arg("--slug"));
  if (!article) { console.log("No unused politics/business article left for an episode."); return; }
  console.log(`→ ${article.slug}`);

  const { item: script } = await spin(scriptPrompt(article), acceptScript, ctx);
  console.log(`  script: "${script.title}" (${script.lines.length} lines)`);
  const talk = await voiceAll(script.lines);
  const file = join(OUT, `episode-${Date.now()}.mp4`);
  const seconds = render(script.title, talk, file);
  console.log(`  ✓ rendered ${file.replace(root, "")} (${Math.round(seconds / 60 * 10) / 10} min)`);

  const video = {
    file,
    title: `${script.title} | ${cfg.show}`,
    description: `${script.description}\n\nSatire. Every person, company and event is fictional, and this episode is voiced by AI. It gets weird. That is the point.\n\nMore at ${SITE}/a/${article.slug}/`,
    tags: ["satire", "comedy", "podcast", "parody", "surreal"],
  };
  const entry = { at: new Date().toISOString(), ref: `article:${article.slug}`, title: video.title, minutes: Math.round(seconds / 6) / 10 };
  if (ytReady(env) && !has("--no-upload")) {
    try {
      const yt = await uploadToYouTube(video, env, { privacy: cfg.privacy, short: false });
      Object.assign(entry, { youtubeId: yt.id, url: yt.url, privacy: yt.privacy });
      console.log(`  ✓ uploaded: ${yt.url} (${yt.privacy})`);
    } catch (err) {
      entry.error = err.message.slice(0, 300);
      console.log(`  ✗ ${err.message}`);
    }
  } else {
    entry.uploaded = false;
    console.log("  (not uploaded: YouTube not connected, or --no-upload)");
  }
  if (!has("--no-log")) writeFileSync(LOG, JSON.stringify([entry, ...log].slice(0, 100), null, 2) + "\n");
}

main().catch((err) => {
  console.error(`Podcast failed: ${err.stack || err.message}`);
  process.exit(1);
});
