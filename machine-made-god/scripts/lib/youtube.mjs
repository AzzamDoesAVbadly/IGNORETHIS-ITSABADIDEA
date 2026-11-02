// YouTube upload shared by Shorts and the podcast.
export const ytReady = (env) => Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET && env.YOUTUBE_REFRESH_TOKEN);

export async function uploadToYouTube(video, env, { privacy = "public", short = true } = {}) {
  const { readFileSync } = await import("node:fs");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.YOUTUBE_CLIENT_ID, client_secret: env.YOUTUBE_CLIENT_SECRET, refresh_token: env.YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token" }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) throw new Error(`YouTube auth failed: ${token.error_description || token.error || tokenRes.status}`);

  const bytes = readFileSync(video.file);
  const meta = {
    snippet: { title: video.title.slice(0, 100), description: video.description.slice(0, 4900), tags: video.tags, categoryId: "23" },
    status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
  };
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(bytes.length) },
    body: JSON.stringify(meta),
  });
  if (!start.ok) throw new Error(`YouTube upload refused: HTTP ${start.status} ${(await start.text()).slice(0, 300)}`);
  const put = await fetch(start.headers.get("location"), { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length) }, body: bytes });
  const result = await put.json();
  if (!put.ok) throw new Error(`YouTube upload failed: HTTP ${put.status} ${JSON.stringify(result).slice(0, 300)}`);
  return { id: result.id, url: short ? `https://youtube.com/shorts/${result.id}` : `https://youtube.com/watch?v=${result.id}`, privacy: result.status?.privacyStatus };
}
