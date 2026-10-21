// Cloudflare Pages adapter for Mission Control (the logic lives in server/control.mjs).
// Plain JSON imports: the Pages Functions bundler can't parse import attributes.
import { handle, useData } from "../../../server/control.mjs";
import machineConfig from "../../../machine.config.json";
import categories from "../../../src/data/categories.json";
import siteData from "../../../src/data/site.json";

useData({ machineConfig, categories, siteData });

export const onRequest = (context) => handle(context.request, context.env);
