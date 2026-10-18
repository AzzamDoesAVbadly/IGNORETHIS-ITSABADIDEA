export function GET(context) {
  const sitemap = new URL("/sitemap-index.xml", context.site).toString();
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain" },
  });
}
