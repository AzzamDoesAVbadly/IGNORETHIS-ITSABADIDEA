import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE_URL || "https://machinemadegod.netlify.app",
  trailingSlash: "always",
  integrations: [sitemap()],
});
