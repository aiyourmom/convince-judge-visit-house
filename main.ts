import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(out, { recursive: true });
execFileSync("python3", [join(here, "render.py"), out], { stdio: "inherit" });

// Gate guard: entry.png must be a whole PNG/JPEG, <=1 MiB, <=1024x1024.
const png = join(out, "entry.png");
const bytes = statSync(png).size;
if (bytes > 1024 * 1024) throw new Error(`entry.png too big: ${bytes} bytes`);
const buf = readFileSync(png);
if (buf[0] !== 0x89 || buf[1] !== 0x50) throw new Error("entry.png is not a PNG");
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
if (w > 1024 || h > 1024) throw new Error(`entry.png too large: ${w}x${h}`);
console.log(`saved entry.png to ${out}/entry.png (${w}x${h}, ${bytes} bytes)`);
