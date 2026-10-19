import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import siteData from "./src/data/site.json" with { type: "json" };

export default defineConfig({
  // The site address lives in src/data/site.json ("url"); SITE_URL overrides it.
  site: process.env.SITE_URL || siteData.url,
  trailingSlash: "always",
  integrations: [sitemap({ filter: (page) => !page.includes("/control/") && !page.includes("/admin/") })],
});
