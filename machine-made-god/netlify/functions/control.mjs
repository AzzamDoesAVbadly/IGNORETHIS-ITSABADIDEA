// Netlify adapter for Mission Control (the logic lives in server/control.mjs).
import { handle } from "../../server/control.mjs";

export default (req) => handle(req, process.env);
export const config = { path: "/api/control/*" };
