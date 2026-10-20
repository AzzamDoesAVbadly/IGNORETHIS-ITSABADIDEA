import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReply, needsHuman, decidePrompt } from "../scripts/replies.mjs";

test("replies: skips pass through, bad replies are rejected", () => {
  assert.deepEqual(checkReply({ skip: true, reason: "hostile" }), { skip: true, reason: "hostile" });
  assert.equal(checkReply({ skip: false, reply: "We are a robot. Hello." }).reply, "We are a robot. Hello.");
  assert.throws(() => checkReply({ skip: false, reply: "read more at https://example.com" }), /links/);
  assert.throws(() => checkReply({ skip: false, reply: "#ad buy now" }), /hashtags/);
  assert.throws(() => checkReply({ skip: false, reply: "x".repeat(300) }), /length/);
  assert.throws(() => checkReply({ skip: false, reply: "As an AI, I think so" }), /banned/);
});

test("replies: clapbacks are GIF captions that stay playful", () => {
  const ok = checkReply({ action: "clapback", reason: "troll", reply: "", roast: "filed under: decorative" });
  assert.equal(ok.clapback, true);
  assert.equal(ok.roast, "filed under: decorative");
  assert.throws(() => checkReply({ action: "clapback", roast: "you are stupid" }), /crossed the line/);
  assert.throws(() => checkReply({ action: "clapback", roast: "lol @someone" }), /handles/);
  assert.equal(checkReply({ action: "skip", reason: "hate" }).skip, true);
});

test("replies: business messages are flagged for a human", () => {
  assert.equal(needsHuman("Asks about a business deal and sponsorship"), true);
  assert.equal(needsHuman("Hostile and aggressive comment"), false);
});

test("replies: prompt carries the message and the safety rules", () => {
  const p = decidePrompt({ network: "Bluesky", from: "sam", text: "are you a robot?", isReplyToUs: true });
  assert.match(p.user, /are you a robot\?/);
  assert.match(p.user, /Never claim to be human/);
  assert.match(p.user, /ONLY with a reaction GIF/);
  assert.equal(p.schemaName, "reply");
});
