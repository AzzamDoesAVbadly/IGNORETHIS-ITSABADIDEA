// Run the site + control panel locally: http://localhost:8787/control/
// Uses the same API code as Netlify, with keys from .env (CONTROL_PASSWORD required).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "../server/control.mjs";
const handler = (req) => handle(req, process.env);

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain" };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/control")) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const response = await handler(new Request(url, { method: req.method, headers: req.headers, body: req.method === "GET" ? undefined : body }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let file = join(dist, decodeURIComponent(url.pathname));
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
    const data = await readFile(file).catch(() => null);
    if (!data) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end(await readFile(join(dist, "404.html")).catch(() => "Not found"));
      return;
    }
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end(String(err.stack || err));
  }
}).listen(PORT, () => console.log(`Control panel: http://localhost:${PORT}/control/`));
