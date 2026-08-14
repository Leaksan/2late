import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const off = y * (size * 4 + 1);
    raw[off] = 0;
    rgba.copy(raw, off + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

const BG = [14, 17, 22];
const CARD = [124, 185, 255];
const STRIPE = [229, 193, 0];
const LINE = [75, 109, 150];

function sample(u, v) {
  if (inRoundedRect(u, v, 0.36, 0.30, 0.70, 0.375, 0.0375)) return LINE;
  if (inRoundedRect(u, v, 0.36, 0.46, 0.58, 0.5375, 0.0375)) return LINE;
  if (inRoundedRect(u, v, 0.20, 0.17, 0.285, 0.83, 0.045)) return STRIPE;
  if (inRoundedRect(u, v, 0.20, 0.17, 0.80, 0.83, 0.14)) return CARD;
  return BG;
}

function render(size) {
  const S = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = sample((x * S + sx + 0.5) / (size * S), (y * S + sy + 0.5) / (size * S));
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = S * S;
      const off = (y * size + x) * 4;
      rgba[off] = Math.round(r / n);
      rgba[off + 1] = Math.round(g / n);
      rgba[off + 2] = Math.round(b / n);
      rgba[off + 3] = 255;
    }
  }
  return encodePNG(size, rgba);
}

const outputs = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512]
];

for (const [name, size] of outputs) {
  writeFileSync(join(outDir, name), render(size));
  console.log(`ok  public/icons/${name} (${size}x${size})`);
}
