// Netlify adapter for Mission Control (the logic lives in server/control.mjs).
// Plain JSON imports, as on Cloudflare; esbuild bundles them.
import { handle, useData } from "../../server/control.mjs";
import machineConfig from "../../machine.config.json";
import categories from "../../src/data/categories.json";
import siteData from "../../src/data/site.json";

useData({ machineConfig, categories, siteData });

export default (req) => handle(req, process.env);
export const config = { path: "/api/control/*" };
