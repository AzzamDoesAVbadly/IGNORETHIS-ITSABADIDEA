// TikTok Content Posting API (direct post). Unaudited apps can only post privately
// (SELF_ONLY) until TikTok audits the app; the post still lands on the account.
import { readFileSync } from "node:fs";
import { saveSecret } from "./secrets.mjs";

export const tiktokReady = (env = process.env) => Boolean(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET && env.TIKTOK_REFRESH_TOKEN);

async function accessToken(env) {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: env.TIKTOK_REFRESH_TOKEN }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`TikTok auth failed: ${data.error_description || data.error || res.status}`);
  if (data.refresh_token && data.refresh_token !== env.TIKTOK_REFRESH_TOKEN) {
    env.TIKTOK_REFRESH_TOKEN = data.refresh_token;
    await saveSecret("TIKTOK_REFRESH_TOKEN", data.refresh_token, env);
  }
  return data.access_token;
}

export async function tiktokPost(file, title, env = process.env) {
  const token = await accessToken(env);
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" };
  const info = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", { method: "POST", headers: auth }).then((r) => r.json());
  const options = info.data?.privacy_level_options || ["SELF_ONLY"];
  const privacy = options.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : options.includes("SELF_ONLY") ? "SELF_ONLY" : options[0];
  const bytes = readFileSync(file);
  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      post_info: { title: title.slice(0, 2000), privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000, is_aigc: true },
      source_info: { source: "FILE_UPLOAD", video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 },
    }),
  }).then((r) => r.json());
  if (!init.data?.upload_url) throw new Error(`TikTok init failed: ${JSON.stringify(init.error || init).slice(0, 300)}`);
  const put = await fetch(init.data.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` },
    body: bytes,
  });
  if (!put.ok) throw new Error(`TikTok upload failed: HTTP ${put.status}`);
  return { publishId: init.data.publish_id, privacy };
}
