// Minimal ZIP writer (stored, no compression) for packaging small folders at
// build time, such as the Attention Invoice extension download. Timestamps are
// fixed so the same files always produce the same bytes.

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const DOS_DATE = (1 << 5) | 1; // 1980-01-01
const DOS_TIME = 0;

/** files: [{ name: "dir/file.txt", data: Uint8Array }] → Uint8Array of a .zip */
export function zip(files) {
  const enc = new TextEncoder();
  const entries = files.map((f) => ({ name: enc.encode(f.name), data: f.data, crc: crc32(f.data) }));
  const size = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length + 46 + e.name.length, 22);
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let p = 0;
  const u16 = (v) => { view.setUint16(p, v, true); p += 2; };
  const u32 = (v) => { view.setUint32(p, v, true); p += 4; };
  const bytes = (b) => { out.set(b, p); p += b.length; };

  for (const e of entries) {
    e.offset = p;
    u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(DOS_TIME); u16(DOS_DATE);
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0);
    bytes(e.name);
    bytes(e.data);
  }
  const dirStart = p;
  for (const e of entries) {
    u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(DOS_TIME); u16(DOS_DATE);
    u32(e.crc); u32(e.data.length); u32(e.data.length); u16(e.name.length); u16(0); u16(0); u16(0); u16(0);
    u32(0); u32(e.offset);
    bytes(e.name);
  }
  const dirSize = p - dirStart;
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(dirSize); u32(dirStart); u16(0);
  return out;
}
