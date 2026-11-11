// Alibaba Model Studio (DashScope, international) image and video generation.
// Both APIs are async: create a task, poll it, download the result (URLs expire in 24h).
import { writeFileSync } from "node:fs";

const BASE = "https://dashscope-intl.aliyuncs.com/api/v1";

async function runTask(path, body, key, { timeoutMs = 600000, pollMs = 4000 } = {}) {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const res = await fetch(`${BASE}/${path}`, { method: "POST", headers: { ...headers, "X-DashScope-Async": "enable" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const created = await res.json();
  const id = created.output?.task_id;
  if (!id) throw new Error(created.message || `no task id (HTTP ${res.status})`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const poll = await (await fetch(`${BASE}/tasks/${id}`, { headers, signal: AbortSignal.timeout(30000) })).json();
    const status = poll.output?.task_status;
    if (status === "SUCCEEDED") return poll.output;
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") throw new Error(poll.output?.message || poll.message || `task ${status}`);
  }
  throw new Error("generation timed out");
}

async function download(url, file) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

export async function textToImage(prompt, file, { key, model = "wan2.2-t2i-flash", size = "720*1280" }) {
  const out = await runTask("services/aigc/text2image/image-synthesis", { model, input: { prompt: prompt.slice(0, 500) }, parameters: { size, n: 1 } }, key);
  const url = out.results?.find((r) => r.url)?.url;
  if (!url) throw new Error(out.results?.[0]?.message || "no image returned");
  return download(url, file);
}

export async function imageToVideo(prompt, imageDataUri, file, { key, model = "wan2.2-i2v-plus", resolution = "480P" }) {
  const out = await runTask("services/aigc/video-generation/video-synthesis", { model, input: { prompt: prompt.slice(0, 500), img_url: imageDataUri }, parameters: { resolution } }, key, { timeoutMs: 900000, pollMs: 8000 });
  if (!out.video_url) throw new Error("no video returned");
  return download(out.video_url, file);
}
