// Save a rotated token back into GitHub secrets (TikTok and X refresh tokens change on use).
// Needs MACHINE_GH_TOKEN (the Mission Control GitHub token, saved automatically on connect)
// and GITHUB_REPOSITORY (set by GitHub Actions).
import { sealedBox } from "../../server/control.mjs";

export async function saveSecret(name, value, env = process.env) {
  const token = env.MACHINE_GH_TOKEN;
  const repo = env.GITHUB_REPOSITORY || env.GITHUB_REPO || "AzzamDoesAVbadly/IGNORETHIS-ITSABADIDEA";
  if (!token) throw new Error(`can't save rotated ${name}: MACHINE_GH_TOKEN is not set`);
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "machine-made-god" };
  const keyRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, { headers });
  if (!keyRes.ok) throw new Error(`can't read repo public key: HTTP ${keyRes.status}`);
  const { key, key_id } = await keyRes.json();
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value: sealedBox(value, key), key_id }),
  });
  if (!res.ok) throw new Error(`saving ${name} failed: HTTP ${res.status}`);
}
