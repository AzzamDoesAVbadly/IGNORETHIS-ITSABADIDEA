#!/usr/bin/env node
// MMG TV → YouTube Shorts. Renders vertical videos from bumps and headlines,
// voices them with AI text-to-speech, adds a generated (copyright-free) hum,
// and uploads to YouTube when credentials are configured.
//
//   npm run shorts                       render (and upload if configured)
//   npm run shorts -- --no-upload        render only
//   npm run shorts -- --kind bump        only a bump short (or --kind headline)
//   npm run shorts -- --slug <slug>      a headline short for one article
//
// Needs: ffmpeg on PATH, a built site in dist/ (for headline art).
// Optional: DASHSCOPE_API_KEY (voice), YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN (upload).

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = process.env;
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : d);

const config = readJson(join(root, "machine.config.json"));
const shortsCfg = { perRun: 2, privacy: "public", voice: "Ethan", ...(config.shorts || {}) };
const SITE = (env.SITE_URL || "https://machinemadegod.netlify.app").replace(/\/$/, "");
const HOST = new URL(SITE).host.replace(/^www\./, "");
const OUT = join(root, "shorts-out");
const LOG = join(root, "src/data/shorts-log.json");
const W = 1080;
const H = 1920;
mkdirSync(OUT, { recursive: true });

const fonts = readdirSync(join(root, "assets/fonts"))
  .filter((f) => f.endsWith(".ttf"))
  .map((f) => join(root, "assets/fonts", f));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const log = readJson(LOG, []);
const done = new Set(log.map((e) => e.ref));

// ---------- drawing ----------

function png(svg) {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Archivo Black", sansSerifFamily: "Inter", monospaceFamily: "IBM Plex Mono" },
  })
    .render()
    .asPng();
}

// Greedy word wrap by an approximate per-character width.
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

const scanlines = `<defs><pattern id="sl" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="2" fill="#fff" opacity="0.035"/></pattern>
<radialGradient id="vg" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.65"/></radialGradient></defs>`;
const overlay = `<rect width="${W}" height="${H}" fill="url(#sl)"/><rect width="${W}" height="${H}" fill="url(#vg)"/>`;

// Each bump line wraps to fit the narrow screen; lines are revealed one at a time.
function bumpFrame(lines, shown, tag) {
  const size = 64;
  const gap = size * 1.3;
  const rows = lines.flatMap((l, i) => wrap(l, 24).map((part) => ({ part, line: i })));
  const top = H / 2 - ((rows.length - 1) * gap) / 2 + rows.filter((r, i) => i > 0 && r.line !== rows[i - 1].line).length * -size * 0.25;
  let extra = 0;
  const text = rows
    .map((r, i) => {
      if (i > 0 && r.line !== rows[i - 1].line) extra += size * 0.5;
      return `<text x="${W / 2}" y="${top + i * gap + extra}" font-family="Inter" font-size="${size}" fill="#f1ede2" text-anchor="middle" opacity="${r.line < shown ? 1 : 0}">${esc(r.part)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${scanlines}<rect width="${W}" height="${H}" fill="#0b0a09"/>${text}
<text x="60" y="110" font-family="IBM Plex Mono" font-size="30" fill="#7c766a">[ mmg ] // ${esc(tag)}</text>${overlay}</svg>`;
}

function endCard(line) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${scanlines}<rect width="${W}" height="${H}" fill="#0b0a09"/>
<g transform="translate(${W / 2} 700)">${Array.from({ length: 12 }, (_, i) => `<rect x="-9" y="-150" width="18" height="46" fill="${i === 0 ? "#ff6a13" : "#ebe4cc"}" opacity="${i === 0 ? 1 : 0.35 + (i / 12) * 0.65}" transform="rotate(${i * 30})"/>`).join("")}
<path d="M0 -62 L56 36 L-56 36 Z" fill="#ff6a13"/><circle cy="8" r="17" fill="#0b0a09"/></g>
<text x="${W / 2}" y="1010" font-family="Archivo Black" font-size="88" fill="#f1ede2" text-anchor="middle">MACHINE MADE GOD</text>
<text x="${W / 2}" y="1080" font-family="IBM Plex Mono" font-size="34" fill="#ffd400" text-anchor="middle" letter-spacing="6">CONTENT WITHOUT END. AMEN.</text>
<text x="${W / 2}" y="1240" font-family="Permanent Marker" font-size="60" fill="#c8ff1a" text-anchor="middle">${esc(line)}</text>
<text x="${W / 2}" y="1330" font-family="IBM Plex Mono" font-size="40" fill="#f1ede2" text-anchor="middle">${esc(HOST)}</text>
<text x="${W / 2}" y="1780" font-family="IBM Plex Mono" font-size="26" fill="#7c766a" text-anchor="middle">SATIRE · WRITTEN BY A MACHINE · NOTHING HERE HAPPENED</text>${overlay}</svg>`;
}

function articleArt(slug) {
  const page = join(root, "dist/a", slug, "index.html");
  if (!existsSync(page)) return "";
  const html = readFileSync(page, "utf8");
  const m = html.match(/<figure class="article-art"[\s\S]*?(<svg[\s\S]*?<\/svg>)/);
  if (!m) return "";
  return m[1]
    .replace(/<svg /, `<svg x="40" y="760" width="1000" height="625" `)
    .replace(/font-family:[^;"]*;?/g, "")
    .replace(/font-stretch:[^;"]*;?/g, "");
}

function headlineFrame(item, stage, art) {
  const titleLines = wrap(item.title.toUpperCase(), 18).slice(0, 6);
  const size = titleLines.length > 4 ? 84 : 100;
  const title = titleLines.map((l, i) => `<text x="60" y="${270 + i * size * 1.02}" font-family="Anton" font-size="${size}" fill="#f7f2e1">${esc(l)}</text>`).join("");
  const dekLines = wrap(item.dek, 36).slice(0, 4);
  const dek = stage >= 1 ? dekLines.map((l, i) => `<text x="60" y="${1470 + i * 56}" font-family="Inter" font-size="42" fill="#ebe4cc">${esc(l)}</text>`).join("") : "";
  const stamp =
    stage >= 1
      ? `<g transform="rotate(-8 830 820)" opacity="0.92"><rect x="660" y="770" width="340" height="96" fill="none" stroke="#ff4b3e" stroke-width="8"/><text x="830" y="845" font-family="Anton" font-size="72" fill="#ff4b3e" text-anchor="middle">SATIRE</text></g>`
      : "";
  const quote =
    stage >= 2 && item.quote
      ? `<rect x="40" y="1690" width="1000" height="150" fill="#ff6a13"/>${wrap(`“${item.quote}”`, 40)
          .slice(0, 2)
          .map((l, i) => `<text x="70" y="${1755 + i * 52}" font-family="Archivo Black" font-size="38" fill="#141210">${esc(l)}</text>`)
          .join("")}`
      : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${scanlines}<rect width="${W}" height="${H}" fill="#141210"/>
<rect x="60" y="110" width="${item.label.length * 26 + 40}" height="56" fill="${item.color}"/><text x="80" y="150" font-family="IBM Plex Mono" font-size="32" fill="#141210">${esc(item.label.toUpperCase())}</text>
${title}<rect x="40" y="760" width="1000" height="625" fill="#000"/>${art}<rect x="40" y="760" width="1000" height="625" fill="none" stroke="#f7f2e1" stroke-width="6"/>${stamp}${dek}${quote}${overlay}</svg>`;
}

// ---------- audio ----------

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

async function speak(text, file) {
  if (!env.DASHSCOPE_API_KEY || shortsCfg.voice === "none") return null;
  try {
    const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen3-tts-flash", input: { text: text.slice(0, 600), voice: shortsCfg.voice, language_type: "English" } }),
      signal: AbortSignal.timeout(90000),
    });
    const data = await res.json();
    const url = data.output?.audio?.url;
    if (!url) throw new Error(data.message || `no audio (HTTP ${res.status})`);
    writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    return file;
  } catch (err) {
    console.log(`  (voice unavailable, making a silent short: ${err.message})`);
    return null;
  }
}

// Stills + durations → MP4 with grain, hum, and optional voice.
function encode(frames, voice, out) {
  const list = join(OUT, "frames.txt");
  const lines = [];
  frames.forEach((f, i) => {
    const p = join(OUT, `f${i}.png`);
    writeFileSync(p, png(f.svg));
    lines.push(`file '${p}'`, `duration ${f.seconds.toFixed(2)}`);
  });
  lines.push(`file '${join(OUT, `f${frames.length - 1}.png`)}'`); // concat demuxer needs the last frame twice
  writeFileSync(list, lines.join("\n"));
  const total = Math.round(frames.reduce((t, f) => t + f.seconds, 0) * 100) / 100;

  const inputs = ["-f", "concat", "-safe", "0", "-i", list, "-f", "lavfi", "-t", String(total), "-i", "anoisesrc=color=brown:amplitude=0.05:seed=7", "-f", "lavfi", "-t", String(total), "-i", "sine=frequency=55:sample_rate=48000"];
  if (voice) inputs.push("-i", voice);
  const mix = voice
    ? "[1:a]lowpass=f=500,volume=0.5[n];[2:a]volume=0.06[d];[3:a]adelay=400|400,volume=1.6[vo];[n][d][vo]amix=inputs=3:duration=first:normalize=0[a]"
    : "[1:a]lowpass=f=500,volume=0.6[n];[2:a]volume=0.08[d];[n][d]amix=inputs=2:duration=first:normalize=0[a]";
  ff([
    ...inputs,
    "-filter_complex",
    `[0:v]fps=30,format=yuv420p,noise=alls=10:allf=t,eq=brightness=0.01[v];${mix}`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-c:a", "aac", "-b:a", "160k",
    "-t", String(total), "-movflags", "+faststart", out,
  ]);
  return total;
}

// ---------- content ----------

function pickBump() {
  const bumps = readJson(join(root, "src/data/bumps.json"), []);
  for (let i = bumps.length - 1; i >= 0; i--) {
    const ref = `bump:${hash(bumps[i])}`;
    if (!done.has(ref)) return { ref, index: i, text: bumps[i] };
  }
  return null;
}

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
  const cats = readJson(join(root, "src/data/categories.json"), []);
  const dir = join(root, "src/content/articles");
  const all = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, ""), ...parseFm(readFileSync(join(dir, f), "utf8")) }))
    .filter((a) => !a.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const a = slug ? all.find((x) => x.slug === slug) : all.find((x) => !done.has(`article:${x.slug}`));
  if (!a) return null;
  const cat = cats.find((c) => c.slug === a.category) || { short: "News", color: "#ff6a13" };
  return { ref: `article:${a.slug}`, slug: a.slug, title: a.title, dek: a.dek, quote: a.pullquote, label: cat.short, color: cat.color, url: `${SITE}/a/${a.slug}/` };
}

async function makeBump(b) {
  const lines = b.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const voice = await speak(lines.join(" ... "), join(OUT, "voice.wav"));
  const talk = voice ? duration(voice) + 0.8 : lines.length * 1.9 + 1;
  const weights = lines.map((l) => Math.max(8, l.length));
  const sum = weights.reduce((a, c) => a + c, 0);
  const frames = [{ svg: bumpFrame(lines, 0, `bump ${String(b.index + 1).padStart(3, "0")}`), seconds: 0.6 }];
  lines.forEach((_, i) => frames.push({ svg: bumpFrame(lines, i + 1, `bump ${String(b.index + 1).padStart(3, "0")}`), seconds: (weights[i] / sum) * talk + (i === lines.length - 1 ? 1.2 : 0) }));
  frames.push({ svg: endCard("new nonsense daily"), seconds: 2.6 });
  const file = join(OUT, `bump-${hash(b.text)}.mp4`);
  const seconds = encode(frames, voice, file);
  const first = lines[0].replace(/[.,]$/, "");
  return {
    file,
    seconds,
    title: `${first.length > 70 ? first.slice(0, 67) + "…" : first} #shorts`,
    description: `${lines.join("\n")}\n\nSatire written by a machine. Nothing here happened.\nMore nonsense daily: ${SITE}\n\n#shorts #satire #comedy #latenight`,
    tags: ["satire", "comedy", "bumps", "late night", "ai", "machine made god"],
  };
}

async function makeHeadline(item) {
  const art = articleArt(item.slug);
  const script = `${item.title}. ${item.dek}`;
  const voice = await speak(script, join(OUT, "voice.wav"));
  const talk = voice ? duration(voice) + 0.6 : 7;
  const tSplit = Math.max(2.2, talk * (item.title.length / script.length));
  const frames = [
    { svg: headlineFrame(item, 0, art), seconds: tSplit },
    { svg: headlineFrame(item, 1, art), seconds: Math.max(2.5, talk - tSplit) },
  ];
  if (item.quote) frames.push({ svg: headlineFrame(item, 2, art), seconds: 2.4 });
  frames.push({ svg: endCard("full story: link in description"), seconds: 2.8 });
  const file = join(OUT, `article-${item.slug.slice(0, 40)}.mp4`);
  const seconds = encode(frames, voice, file);
  return {
    file,
    seconds,
    title: `${item.title.length > 88 ? item.title.slice(0, 85) + "…" : item.title} #shorts`,
    description: `${item.dek}\n\nRead the full story: ${item.url}\n\nSatire written by a machine. Nothing here happened.\n\n#shorts #satire #comedy #news`,
    tags: ["satire", "comedy", "fake news", "parody", "ai", "machine made god"],
  };
}

// ---------- YouTube ----------

const ytReady = () => Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET && env.YOUTUBE_REFRESH_TOKEN);

async function uploadToYouTube(video) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.YOUTUBE_CLIENT_ID, client_secret: env.YOUTUBE_CLIENT_SECRET, refresh_token: env.YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`YouTube auth failed: ${token.error_description || token.error || tokenRes.status}`);

  const bytes = readFileSync(video.file);
  const meta = {
    snippet: { title: video.title.slice(0, 100), description: video.description.slice(0, 4900), tags: video.tags, categoryId: "23" },
    status: { privacyStatus: shortsCfg.privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(bytes.length) },
    body: JSON.stringify(meta),
  });
  if (!start.ok) throw new Error(`YouTube upload refused: HTTP ${start.status} ${(await start.text()).slice(0, 300)}`);
  const put = await fetch(start.headers.get("location"), { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) }, body: bytes });
  const result = await put.json();
  if (!put.ok) throw new Error(`YouTube upload failed: HTTP ${put.status} ${JSON.stringify(result).slice(0, 300)}`);
  return { id: result.id, url: `https://youtube.com/shorts/${result.id}`, privacy: result.status?.privacyStatus };
}

// ---------- main ----------

async function main() {
  if (shortsCfg.enabled === false || String(env.MACHINE_ENABLED).toLowerCase() === "false" || String(env.SHORTS_ENABLED).toLowerCase() === "false") {
    console.log("Shorts are switched off.");
    return;
  }
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    console.error("ffmpeg is not installed. Install it (brew install ffmpeg / apt-get install ffmpeg) and try again.");
    process.exit(1);
  }
  const kinds = arg("--kind") ? [arg("--kind")] : arg("--slug") ? ["headline"] : ["bump", "headline"].slice(0, shortsCfg.perRun);
  const made = [];
  for (const kind of kinds) {
    const source = kind === "bump" ? pickBump() : pickArticle(arg("--slug"));
    if (!source) {
      console.log(`No unused ${kind} left to turn into a short.`);
      continue;
    }
    console.log(`→ ${kind}: ${source.ref}`);
    const video = kind === "bump" ? await makeBump(source) : await makeHeadline(source);
    console.log(`  ✓ rendered ${video.file.replace(root, "")} (${video.seconds.toFixed(1)}s)`);
    const entry = { at: new Date().toISOString(), kind, ref: source.ref, title: video.title, seconds: Math.round(video.seconds) };
    if (ytReady() && !has("--no-upload")) {
      try {
        const yt = await uploadToYouTube(video);
        Object.assign(entry, { youtubeId: yt.id, url: yt.url, privacy: yt.privacy });
        if (shortsCfg.privacy === "public" && yt.privacy === "private") entry.note = "YouTube locked this upload to private: the Google Cloud project hasn't passed the YouTube API audit yet.";
        console.log(`  ✓ uploaded: ${yt.url} (${yt.privacy})${entry.note ? ` — ${entry.note}` : ""}`);
      } catch (err) {
        entry.error = err.message.slice(0, 300);
        console.log(`  ✗ ${err.message}`);
      }
    } else {
      entry.uploaded = false;
      console.log("  (not uploaded: YouTube isn't configured, or --no-upload)");
    }
    made.push(entry);
  }
  if (made.length && !has("--no-log")) writeFileSync(LOG, JSON.stringify([...made, ...log].slice(0, 300), null, 2) + "\n");
}

main().catch((err) => {
  console.error(`Shorts failed: ${err.stack || err.message}`);
  process.exit(1);
});
