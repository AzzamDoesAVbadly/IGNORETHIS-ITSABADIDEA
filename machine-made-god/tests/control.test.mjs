import { test } from "node:test";
import assert from "node:assert/strict";
import sodium from "libsodium-wrappers";
import { handle, makeToken, checkToken, sealedBox } from "../server/control.mjs";

const env = { CONTROL_PASSWORD: "a-very-long-test-password" };

const call = (method, path, body, token, e = env) =>
  handle(
    new Request(`http://localhost/api/control/${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    e
  );
const login = async () => (await (await call("POST", "login", { password: env.CONTROL_PASSWORD })).json()).token;

test("session tokens verify, expire, and can't be forged", async () => {
  const t = await makeToken(env);
  assert.equal(await checkToken(env, t), true);
  assert.equal(await checkToken(env, t, Date.now() + 15 * 86400000), false, "expires after 14 days");
  const [exp, sig] = t.split(".");
  assert.equal(await checkToken(env, `${exp}.${"0".repeat(64)}`), false);
  assert.equal(await checkToken(env, `${Number(exp) + 1000}.${sig}`), false, "changing the expiry breaks the signature");
  assert.equal(await checkToken(env, ""), false);
  assert.equal(await checkToken({ CONTROL_PASSWORD: "a-different-long-password" }, t), false, "changing the password logs everyone out");
});

test("login needs the right password and every other route needs a token", async () => {
  assert.equal((await call("POST", "login", { password: "wrong" })).status, 401);
  const token = await login();
  assert.ok(token);
  assert.equal((await call("GET", "status")).status, 401);
  assert.equal((await call("POST", "post", { action: "delete", slug: "x" })).status, 401);
  assert.equal((await call("GET", "nope", null, token)).status, 404);
});

test("the panel refuses to run with a weak password", async () => {
  assert.equal((await call("POST", "login", { password: "short" }, null, { CONTROL_PASSWORD: "short" })).status, 503);
});

test("post actions reject path tricks in slugs", async () => {
  const res = await call("POST", "post", { action: "delete", slug: "../../package", kind: "article" }, await login());
  assert.equal(res.status, 400);
});

test("YouTube connect validates input and the callback rejects tampered state", async () => {
  const token = await login();
  assert.equal((await call("POST", "youtube/start", { clientId: "nope", clientSecret: "x" }, token)).status, 400);
  const good = await call("POST", "youtube/start", { clientId: "123-abc.apps.googleusercontent.com", clientSecret: "shh" }, token);
  assert.equal(good.status, 200);
  const state = new URL((await good.json()).url).searchParams.get("state");
  assert.ok(!state.includes("shh"), "client secret is encrypted inside state");
  const forged = await handle(new Request(`http://localhost/api/control/youtube/callback?code=x&state=${state.slice(0, -4)}AAAA`), env);
  assert.equal(forged.status, 302);
  assert.match(forged.headers.get("location"), /yt=error/);
});

test("socials and shorts routes require a session", async () => {
  assert.equal((await call("GET", "socials")).status, 401);
  assert.equal((await call("POST", "socials/connect", { network: "bluesky" })).status, 401);
  assert.equal((await call("POST", "shorts", {})).status, 401);
});

test("sealedBox output opens with real libsodium (GitHub secrets format)", async () => {
  await sodium.ready;
  const kp = sodium.crypto_box_keypair();
  const pkB64 = sodium.to_base64(kp.publicKey, sodium.base64_variants.ORIGINAL);
  const sealed = sodium.from_base64(sealedBox("hunter2 ✓ secret", pkB64), sodium.base64_variants.ORIGINAL);
  const opened = sodium.crypto_box_seal_open(sealed, kp.publicKey, kp.privateKey);
  assert.equal(sodium.to_string(opened), "hunter2 ✓ secret");
});

test("TikTok and X connect links carry encrypted state and PKCE", async () => {
  const token = await login();
  const tt = await (await call("POST", "tiktok/start", { clientId: "awkey123", clientSecret: "ttsecret" }, token)).json();
  const tu = new URL(tt.url);
  assert.equal(tu.hostname, "www.tiktok.com");
  assert.equal(tu.searchParams.get("scope"), "user.info.basic,video.publish");
  assert.match(tu.searchParams.get("redirect_uri"), /\/api\/control\/tiktok\/callback$/);
  assert.ok(!tt.url.includes("ttsecret"));
  const x = await (await call("POST", "x/start", { clientId: "xid", clientSecret: "xsecret" }, token)).json();
  const xu = new URL(x.url);
  assert.equal(xu.searchParams.get("code_challenge_method"), "S256");
  assert.match(xu.searchParams.get("scope"), /offline\.access/);
  assert.ok(!x.url.includes("xsecret"));
  // a TikTok state can't be replayed against the X callback
  const crossed = await handle(new Request(`http://localhost/api/control/x/callback?code=c&state=${tu.searchParams.get("state")}`), env);
  assert.match(crossed.headers.get("location"), /connectError=x/);
  assert.equal((await call("POST", "x/start", { clientId: "", clientSecret: "" }, token)).status, 400);
});
