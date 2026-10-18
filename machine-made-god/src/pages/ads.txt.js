import { adsenseClient } from "../lib/site.js";

// Google requires ads.txt once AdSense is live. Empty until a client id is configured.
export function GET() {
  const pub = adsenseClient.replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "# AdSense not configured yet\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
