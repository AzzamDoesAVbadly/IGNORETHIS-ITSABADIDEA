/// <reference lib="dom" />
import type { Context } from "@netlify/edge-functions";
// The configured import map resolves these npm specifiers to pinned ESM bundles
// because Netlify's experimental npm bundler cannot resolve them directly.
import TurndownService from "npm:turndown@7.2.0";
import { parseHTML } from "npm:linkedom@0.18.12";

/**
 * Test: curl -H "Accept: text/markdown" https://your-site.netlify.app/path
 * Live site: curl -H "Accept: text/markdown" https://machinemadegod.netlify.app/
 * Add/remove [[edge_functions]] entries for this function in root netlify.toml
 * to change the content paths; keep utility routes, APIs and assets out of scope.
 * Local test: netlify dev --port 8889, then run the same curl against
 * http://localhost:8889/ instead of the deployed URL.
 */
export default async function markdown(request: Request, context: Context) {
  const acceptsMarkdown = (request.headers.get("accept") ?? "")
    .split(",")
    .some((entry) => {
      const [type, ...parameters] = entry.trim().toLowerCase().split(";");
      return type.trim() === "text/markdown" && !parameters.some((parameter) =>
        /^q\s*=\s*0(?:\.0*)?$/.test(parameter.trim())
      );
    });

  if (request.method !== "GET" || !acceptsMarkdown) return;

  let original: Response | undefined;
  try {
    original = await context.next();
    if (!original.ok || !original.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return original;
    }

    // Read a clone so the original body remains available if conversion fails.
    const { document } = parseHTML(await original.clone().text());
    document.querySelectorAll(
      'script, style, noscript, template, nav, footer, header, aside, ' +
      '[role="navigation"], [role="banner"], [role="contentinfo"], ' +
      '[role="complementary"], .sidebar, #sidebar, [hidden], [aria-hidden="true"]',
    ).forEach((element) => element.remove());

    const content = document.querySelector("main, [role='main']") ??
      document.querySelector("article") ?? document.body;
    const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    const result = converter.turndown(content).trim();
    if (!result) return original;

    const headers = new Headers(original.headers);
    // These describe the original HTML bytes and must not survive conversion.
    for (const name of ["content-length", "content-encoding", "etag", "last-modified", "content-md5", "digest", "accept-ranges"]) {
      headers.delete(name);
    }
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("X-Markdown-Tokens", String(Math.ceil(result.length / 4)));
    headers.set("Content-Signal", "ai-train=yes, search=yes, ai-input=yes");
    const vary = headers.get("Vary");
    if (!vary?.split(",").some((value) => ["accept", "*"].includes(value.trim().toLowerCase()))) {
      headers.set("Vary", vary ? `${vary}, Accept` : "Accept");
    }
    // Avoid sharing a transformed representation with ordinary browser requests.
    headers.set("Cache-Control", "private, no-store");
    headers.delete("Netlify-CDN-Cache-Control");
    headers.delete("CDN-Cache-Control");
    return new Response(result, { status: original.status, headers });
  } catch {
    return original; // An empty return also bypasses the function if origin fetching failed.
  }
}
