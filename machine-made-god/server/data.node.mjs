// Mission Control's site data for Node hosts (local server, tests).
// Bundled hosts (Cloudflare, Netlify) import the same files in their adapters.
import machineConfig from "../machine.config.json" with { type: "json" };
import categories from "../src/data/categories.json" with { type: "json" };
import siteData from "../src/data/site.json" with { type: "json" };

export default { machineConfig, categories, siteData };
