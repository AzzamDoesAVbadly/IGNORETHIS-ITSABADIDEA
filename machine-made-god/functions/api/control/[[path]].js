// Cloudflare Pages adapter for Mission Control (the logic lives in server/control.mjs).
import { handle } from "../../../server/control.mjs";

export const onRequest = (context) => handle(context.request, context.env);
