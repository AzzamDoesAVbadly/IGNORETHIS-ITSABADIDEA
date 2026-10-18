import { test } from "node:test";
import assert from "node:assert/strict";

process.env.CONTROL_PASSWORD = "a-very-long-test-password";
const { makeToken, checkToken, default: handler } = await import("../netlify/functions/control.mjs");

const call = (method, path, body, token) =>
  handler(
    new Request(`http://localhost/api/control/${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  );

test("session tokens verify, expire, and can't be forged", () => {
  const t = makeToken();
  assert.equal(checkToken(t), true);
  assert.equal(checkToken(t, Date.now() + 15 * 86400000), false, "expires after 14 days");
  const [exp] = t.split(".");
  assert.equal(checkToken(`${exp}.${"0".repeat(64)}`), false);
  assert.equal(checkToken(`${Number(exp) + 1000}.${t.split(".")[1]}`), false, "changing the expiry breaks the signature");
  assert.equal(checkToken(""), false);
});

test("login needs the right password and every other route needs a token", async () => {
  assert.equal((await call("POST", "login", { password: "wrong" })).status, 401);
  const ok = await call("POST", "login", { password: process.env.CONTROL_PASSWORD });
  assert.equal(ok.status, 200);
  const { token } = await ok.json();
  assert.equal((await call("GET", "status")).status, 401);
  assert.equal((await call("POST", "post", { action: "delete", slug: "x" })).status, 401);
  assert.equal((await call("GET", "nope", null, token)).status, 404);
});

test("the panel refuses to run with a weak password", async () => {
  const saved = process.env.CONTROL_PASSWORD;
  process.env.CONTROL_PASSWORD = "short";
  assert.equal((await call("POST", "login", { password: "short" })).status, 503);
  process.env.CONTROL_PASSWORD = saved;
});

test("post actions reject path tricks in slugs", async () => {
  const { token } = await (await call("POST", "login", { password: process.env.CONTROL_PASSWORD })).json();
  const res = await call("POST", "post", { action: "delete", slug: "../../package", kind: "article" }, token);
  assert.equal(res.status, 400);
});
