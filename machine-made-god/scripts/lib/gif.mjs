// Branded reaction "GIFs" for the reply bot: a short glitchy loop with a roast caption.
// Output: { mp4, gif } paths (MP4 for Bluesky video embeds, GIF for Mastodon/X).
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const fonts = readdirSync(join(root, "assets/fonts")).filter((f) => f.endsWith(".ttf")).map((f) => join(root, "assets/fonts", f));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const S = 480;
const PALETTES = [
  ["#0b0a09", "#f1ede2", "#ff6a13"],
  ["#ffd400", "#141210", "#ff2e88"],
  ["#141210", "#c8ff1a", "#2fb5a8"],
  ["#ff2e88", "#141210", "#ffd400"],
];

function wrap(text, max) {
  const out = [];
  let line = "";
  for (const w of String(text).split(/\s+/)) {
    if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out.slice(0, 4);
}

function frame(lines, i, total, [bg, ink, accent]) {
  const jitter = i % 5 === 0 ? 6 : i % 7 === 0 ? -5 : 0;
  const size = lines.length > 3 ? 46 : lines.length > 2 ? 54 : 64;
  const top = S / 2 - ((lines.length - 1) * size * 1.05) / 2 + size * 0.35;
  const text = lines
    .map((l, k) => `<text x="${S / 2 + jitter}" y="${top + k * size * 1.05}" font-family="Anton" font-size="${size}" fill="${ink}" text-anchor="middle">${esc(l.toUpperCase())}</text>`)
    .join("");
  const ghost = i % 4 < 2 ? lines.map((l, k) => `<text x="${S / 2 - jitter - 4}" y="${top + k * size * 1.05}" font-family="Anton" font-size="${size}" fill="${accent}" opacity="0.55" text-anchor="middle">${esc(l.toUpperCase())}</text>`).join("") : "";
  const bar = `<rect x="0" y="${(i * 37) % S}" width="${S}" height="${8 + (i % 3) * 6}" fill="${accent}" opacity="0.18"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
<defs><pattern id="sl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000" opacity="0.22"/></pattern></defs>
<rect width="${S}" height="${S}" fill="${bg}"/>${bar}${ghost}${text}
<rect width="${S}" height="${S}" fill="url(#sl)"/>
<text x="${S - 14}" y="${S - 14}" font-family="IBM Plex Mono" font-size="15" fill="${ink}" opacity="0.7" text-anchor="end">MACHINE MADE GOD</text></svg>`;
}

export function renderReactionGif(caption, outDir = join(root, "shorts-out", "gifs")) {
  mkdirSync(outDir, { recursive: true });
  const lines = wrap(caption, 14);
  const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const frames = 24;
  for (let i = 0; i < frames; i++) {
    const png = new Resvg(frame(lines, i, frames, palette), { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Anton" } }).render().asPng();
    writeFileSync(join(outDir, `g${String(i).padStart(2, "0")}.png`), png);
  }
  const stamp = Date.now().toString(36);
  const mp4 = join(outDir, `react-${stamp}.mp4`);
  const gif = join(outDir, `react-${stamp}.gif`);
  const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);
  ff(["-framerate", "10", "-i", join(outDir, "g%02d.png"), "-vf", "loop=2:24:0,format=yuv420p", "-c:v", "libx264", "-movflags", "+faststart", "-an", mp4]);
  ff(["-framerate", "10", "-i", join(outDir, "g%02d.png"), "-filter_complex", "split[a][b];[a]palettegen=max_colors=48[p];[b][p]paletteuse", "-loop", "0", gif]);
  return { mp4, gif, width: S, height: S };
}
