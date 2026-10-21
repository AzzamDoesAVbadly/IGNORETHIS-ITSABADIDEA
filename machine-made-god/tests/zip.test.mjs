import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zip, crc32 } from "../src/lib/zip.mjs";

const enc = new TextEncoder();

test("crc32 matches the standard check values", () => {
  assert.equal(crc32(enc.encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test("zip output is deterministic and extracts cleanly", () => {
  const files = [
    { name: "pkg/manifest.json", data: enc.encode('{"a":1}\n') },
    { name: "pkg/icons/16.png", data: new Uint8Array([137, 80, 78, 71, 0, 255]) },
  ];
  const a = zip(files);
  assert.deepEqual(a, zip(files));
  assert.equal(new DataView(a.buffer).getUint32(a.length - 22, true), 0x06054b50, "end-of-directory record");

  const unzip = spawnSync("unzip", ["-v"], { encoding: "utf8" });
  if (unzip.status !== 0) return; // no unzip on this machine; structure checks above still ran
  const dir = mkdtempSync(join(tmpdir(), "zip-"));
  writeFileSync(join(dir, "t.zip"), a);
  const check = spawnSync("unzip", ["-tq", "t.zip"], { cwd: dir, encoding: "utf8" });
  assert.equal(check.status, 0, check.stdout + check.stderr);
  spawnSync("unzip", ["-q", "t.zip"], { cwd: dir });
  assert.equal(readFileSync(join(dir, "pkg/manifest.json"), "utf8"), '{"a":1}\n');
});
