// /lab/attention-invoice.zip: the extension folder, zipped at build time so
// the download always matches the code in lab/attention-invoice/extension.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { zip } from "../../lib/zip.mjs";

export function GET() {
  const root = join(process.cwd(), "lab/attention-invoice/extension");
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.push({ name: `attention-invoice/${relative(root, path)}`, data: readFileSync(path) });
    }
  })(root);
  return new Response(zip(files), { headers: { "Content-Type": "application/zip" } });
}
