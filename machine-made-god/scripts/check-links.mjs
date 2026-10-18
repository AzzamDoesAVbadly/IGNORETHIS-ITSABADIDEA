// Fails the build if any page links to an internal URL that doesn't exist.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
if (!existsSync(dist)) {
  console.error("check-links: dist/ not found. Run the build first.");
  process.exit(1);
}

const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) pages.push(p);
  }
})(dist);

const resolves = (url) => {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (clean === "/") return existsSync(join(dist, "index.html"));
  const target = join(dist, clean);
  return existsSync(target) && statSync(target).isFile() ? true : existsSync(join(target, "index.html"));
};

const broken = new Map();
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) {
    if (url.startsWith("//") || url.startsWith("/_astro/") || url.includes("${")) continue;
    if (!resolves(url)) {
      const from = page.replace(dist, "/");
      if (!broken.has(url)) broken.set(url, from);
    }
  }
}

if (broken.size) {
  console.error(`check-links: ${broken.size} broken internal link(s):`);
  for (const [url, from] of broken) console.error(`  ${url}  (first seen on ${from})`);
  process.exit(1);
}
console.log(`check-links: ${pages.length} pages, no broken internal links.`);
