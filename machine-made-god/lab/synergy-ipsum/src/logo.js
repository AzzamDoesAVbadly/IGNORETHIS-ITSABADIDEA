// Procedural corporate logos as standalone SVG strings. Deliberately generic:
// the kind of mark a brand agency bills six figures for.

const PALETTES = [
  { bg: "#141210", mark: "#ff6a13", text: "#f7f2e1" },
  { bg: "#f7f2e1", mark: "#1f6f6a", text: "#141210" },
  { bg: "#0c1514", mark: "#c8ff1a", text: "#e3efe9" },
  { bg: "#ffd400", mark: "#141210", text: "#141210" },
  { bg: "#ffffff", mark: "#2f5bff", text: "#0b1020" },
  { bg: "#1b0f1a", mark: "#ff2e88", text: "#f6e8f0" },
];

const MARKS = [
  // ring with a notch
  (c) => `<circle cx="60" cy="60" r="34" fill="none" stroke="${c}" stroke-width="14"/><circle cx="88" cy="32" r="11" fill="${c}"/>`,
  // delta
  (c, bg) => `<path d="M60 18 L100 96 H20 Z" fill="${c}"/><path d="M60 52 L78 86 H42 Z" fill="${bg}"/>`,
  // hexagon
  (c, bg) => `<path d="M60 16 L98 38 V82 L60 104 L22 82 V38 Z" fill="${c}"/><path d="M60 42 L80 54 V72 L60 84 L40 72 V54 Z" fill="${bg}"/>`,
  // swoosh
  (c) => `<path d="M18 84 C40 30, 80 20, 104 34 C78 34, 52 52, 40 92 Z" fill="${c}"/><circle cx="92" cy="78" r="10" fill="${c}"/>`,
  // dot grid, one missing
  (c) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((q) => (r === 0 && q === 2 ? "" : `<circle cx="${30 + q * 30}" cy="${30 + r * 30}" r="11" fill="${c}"/>`))).join(""),
  // stacked chevrons
  (c) => `<path d="M22 34 L60 58 L98 34 V52 L60 76 L22 52 Z" fill="${c}"/><path d="M22 64 L60 88 L98 64 V82 L60 106 L22 82 Z" fill="${c}" opacity=".55"/>`,
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** SVG logo for a company from `company()`. 480×120, no external assets. */
export function logoSvg(co) {
  const p = PALETTES[co.palette % PALETTES.length];
  const mark = MARKS[co.mark % MARKS.length](p.mark, p.bg);
  const word = co.shortName.toUpperCase();
  const size = Math.min(60, Math.floor(320 / (word.length * 0.64)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 120" width="480" height="120" role="img" aria-label="${esc(co.name)} logo">` +
    `<rect width="480" height="120" fill="${p.bg}"/>` +
    `<g transform="translate(6 0)">${mark}</g>` +
    `<text x="134" y="${58 + size * 0.3}" font-family="Archivo, 'Arial Narrow', Arial, sans-serif" font-weight="900" font-size="${size}" letter-spacing="-1" fill="${p.text}">${esc(word)}</text>` +
    `<text x="136" y="${84 + size * 0.3 - 8}" font-family="'IBM Plex Mono', Menlo, monospace" font-size="12" letter-spacing="3" fill="${p.mark}">${esc(co.ticker)} · ${esc(co.industry.toUpperCase()).slice(0, 34)}</text>` +
    `</svg>`;
}
