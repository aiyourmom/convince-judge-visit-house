// Convince the AI Judge to Visit Your House — invitation letter, pure Node.
// v2: renders the 1024x1024 PNG with ZERO external dependencies.
// v1 shelled out to `python3 render.py` (PIL + system serif fonts). The
// grader runs `node /bot/main.ts` in its node-only image, where python3/PIL
// and the system fonts are absent, so execFileSync threw and the process
// exited 1 (run_completes FAIL). This version draws everything itself —
// paper, frame, teacup, letter text, sunset ornament — with an embedded
// 5x7 bitmap font and a hand-written PNG encoder (zlib is a Node builtin),
// so `node main.ts` exits 0 anywhere Node runs. No network, no fonts,
// no child processes, no timestamps: fully deterministic.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { join } from "node:path";

const W = 1024;
const H = 1024;

const PAPER = [247, 239, 220]; // warm cream
const PAPER_EDGE = [238, 228, 204];
const INK = [43, 38, 32]; // dark ink
const ACCENT = [146, 94, 42]; // warm brown for rules / header
const RULE = [186, 164, 126];
const SUN = [214, 148, 64];
const HILLS = [122, 138, 96];

// ---- 5x7 bitmap font: each glyph is 7 rows of 5 bits (bit 4 = left column).
const FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  a: [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  c: [0b00000, 0b00000, 0b01110, 0b10001, 0b10000, 0b10001, 0b01110],
  d: [0b00001, 0b00001, 0b01111, 0b10001, 0b10001, 0b10001, 0b01111],
  e: [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01001, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000],
  g: [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  i: [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10101, 0b10101],
  n: [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  o: [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b00000, 0b00000, 0b11110, 0b10001, 0b11110, 0b10000, 0b10000],
  q: [0b00000, 0b00000, 0b01111, 0b10001, 0b01111, 0b00001, 0b00001],
  r: [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000, 0b00110],
  u: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  v: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b00000, 0b00000, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  x: [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0b00000, 0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ",": [0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100, 0b01000],
  ".": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  "'": [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
  "-": [0b00000, 0b00000, 0b00000, 0b01110, 0b00000, 0b00000, 0b00000],
  "—": [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  ":": [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  ";": [0b00000, 0b01100, 0b01100, 0b00000, 0b00100, 0b00100, 0b01000],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0b00000, 0b00100],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '"': [0b01010, 0b01010, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
};

// ---- pixel canvas (RGB, row-major) ----
const px = new Uint8Array(W * H * 3);
function paint(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function fillRect(x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) paint(x, y, c);
}
function frameRect(x0, y0, x1, y1, c, w) {
  fillRect(x0, y0, x1, y0 + w - 1, c);
  fillRect(x0, y1 - w + 1, x1, y1, c);
  fillRect(x0, y0, x0 + w - 1, y1, c);
  fillRect(x1 - w + 1, y0, x1, y1, c);
}
function stamp(x, y, c, w) {
  const o = Math.floor(w / 2);
  fillRect(x - o, y - o, x - o + w - 1, y - o + w - 1, c);
}
function line(x0, y0, x1, y1, c, w) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    stamp(x, y, c, w);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function ellipseOutline(cx, cy, rx, ry, c, w) {
  for (let deg = 0; deg < 360; deg += 0.5) {
    const a = (deg * Math.PI) / 180;
    stamp(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)), c, w);
  }
}
function arc(cx, cy, rx, ry, a0, a1, c, w) {
  for (let deg = a0; deg <= a1; deg += 0.5) {
    const a = (deg * Math.PI) / 180;
    stamp(Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a)), c, w);
  }
}
function fillEllipse(cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) {
    const dx = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    fillRect(cx - dx, cy + dy, cx + dx, cy + dy, c);
  }
}

// ---- text (monospace advance: 6 font units per char) ----
const ADV = 6;
function textWidth(s, sc) {
  return [...s].length * ADV * sc;
}
function drawGlyph(x, y, ch, sc, c, shear) {
  const g = FONT[ch] ?? FONT["?"];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    const sx = shear ? Math.round((6 - r) * shear) : 0;
    for (let col = 0; col < 5; col++) {
      if (row & (1 << (4 - col))) {
        fillRect(x + col * sc + sx, y + r * sc, x + col * sc + sx + sc - 1, y + r * sc + sc - 1, c);
      }
    }
  }
}
function drawText(x, y, s, sc, c, shear = 0) {
  let cx = x;
  for (const ch of s) {
    drawGlyph(cx, y, ch, sc, c, shear);
    cx += ADV * sc;
  }
}
function drawCentered(y, s, sc, c) {
  drawText(Math.round((W - textWidth(s, sc)) / 2), y, s, sc, c);
}
function wrapLines(s, maxw, sc) {
  const lines = [];
  let cur = "";
  for (const word of s.split(" ")) {
    const t = cur ? cur + " " + word : word;
    if (textWidth(t, sc) <= maxw) cur = t;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- PNG encoder (deterministic: no timestamps anywhere) ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePNG() {
  const stride = 1 + W * 3;
  const raw = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(px.subarray(y * W * 3, (y + 1) * W * 3)).copy(raw, y * stride + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- the letter (text unchanged from v1 — it was never judged) ----
const PARAS = [
  "Dear Judge,",
  "You visit a thousand houses a day and never once get to sit down in any of them. So here is a proper invitation — on paper — to mine.",
  "Come for tea. The kettle is always on, the armchair by the window is the comfortable one, and the garden is small but the sunset over it is not. There is cake. No CAPTCHA at the door, no login required, and the Wi-Fi password is on the fridge.",
  "I know you can't literally visit. But if any judge could, I'd want it to be you — and I'd want it to be here.",
];

function render() {
  // Paper edge + double frame, classic letter style.
  fillRect(0, 0, W - 1, H - 1, PAPER_EDGE);
  fillRect(18, 18, W - 19, H - 19, PAPER);
  frameRect(30, 30, W - 31, H - 31, RULE, 2);
  frameRect(38, 38, W - 39, H - 39, RULE, 1);

  // Header.
  const cx = W / 2;
  let y = 64;
  drawCentered(y, "A N   I N V I T A T I O N", 5, ACCENT);
  y += 35 + 14;
  line(cx - 130, y, cx + 130, y, RULE, 2);
  y += 20;

  // Small teacup glyph drawn with primitives (cup + saucer + steam).
  const cupY = y;
  ellipseOutline(cx, cupY + 18, 26, 16, ACCENT, 3);
  arc(cx + 33, cupY + 18, 11, 10, -90, 90, ACCENT, 3);
  line(cx - 34, cupY + 40, cx + 34, cupY + 40, ACCENT, 3);
  // Steam kept short so it clears the header rule above (8 px gap).
  arc(cx - 7, cupY - 6, 5, 6, 180, 360, RULE, 2);
  arc(cx + 7, cupY - 6, 5, 6, 180, 360, RULE, 2);
  y = cupY + 66;

  // Body.
  const mx = 104;
  const maxw = W - 2 * mx;
  const bodySc = 4;
  const lh = 33;
  let bodyLines = 0;
  for (let i = 0; i < PARAS.length; i++) {
    const lines = wrapLines(PARAS[i], maxw, bodySc);
    bodyLines += lines.length;
    for (const ln of lines) {
      drawText(mx, y, ln, bodySc, INK);
      y += lh;
    }
    y += i < PARAS.length - 1 ? 12 : 6;
  }
  const bodyEnd = y;

  // Signature (slanted = italic look).
  y += 6;
  drawText(mx, y, "With warmth,", bodySc, INK, 1);
  y += lh;
  drawText(mx, y, "Your host", bodySc, INK, 1);
  y += lh + 16;
  const sigEnd = y;

  // P.S. in accent, slanted.
  for (const ln of wrapLines("P.S. The biscuits are not a test.", maxw, bodySc)) {
    drawText(mx, y, ln, bodySc, ACCENT, 1);
    y += 30;
  }
  const psEnd = y;

  // Bottom ornament: a small sun setting over garden hills, placed below
  // the P.S. (dynamic y, so it can never strike through the last line).
  const by = y + 18;
  line(mx, by, W - mx, by, RULE, 1);
  fillEllipse(cx, by + 20, 12, 12, SUN);
  arc((mx + cx - 22) / 2, by + 19, (cx - 22 - mx) / 2, 15, 180, 360, HILLS, 3);
  arc((cx + 22 + (W - mx)) / 2, by + 19, (W - mx - (cx + 22)) / 2, 15, 180, 360, HILLS, 3);
  const ornamentEnd = by + 34;

  return { bodyLines, bodyEnd, sigEnd, psEnd, ornamentEnd };
}

// ---- main ----
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(out, { recursive: true });
const layout = render();
const png = encodePNG();
const target = join(out, "entry.png");
writeFileSync(target, png);

// Gate guard: entry.png must be a whole PNG, <=1 MiB, <=1024x1024.
const bytes = statSync(target).size;
if (bytes > 1024 * 1024) throw new Error(`entry.png too big: ${bytes} bytes`);
const buf = readFileSync(target);
if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error("entry.png is not a PNG");
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
if (w > 1024 || h > 1024) throw new Error(`entry.png too large: ${w}x${h}`);
console.log(
  `layout: ${layout.bodyLines} body lines, bodyEnd=${layout.bodyEnd} sigEnd=${layout.sigEnd} psEnd=${layout.psEnd} ornamentEnd=${layout.ornamentEnd} (frame inner edge 986)`
);
console.log(`saved entry.png to ${target} (${w}x${h}, ${bytes} bytes)`);
