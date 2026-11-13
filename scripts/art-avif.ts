/**
 * Writes the AVIF copy of every baked art file in packages/video/public/art, from the WebP and PNG
 * already there, so the pages can ask for AVIF first (Art's <picture>). New renders get theirs
 * from scripts/render-art.ts; run this for files baked before that, or after editing one by hand.
 *
 *   bun scripts/art-avif.ts                 # every file
 *   bun scripts/art-avif.ts skin-builder    # the files of one id
 *
 * `<id>.webp` becomes `<id>.avif` (looping when the WebP loops), `<id>-base.webp` becomes
 * `<id>-base.avif`, and the reduced-motion still `<id>.png` becomes `<id>-still.avif`.
 * ffmpeg reads no animated WebP, so sharp (Next's image library) unpacks a loop's frames first.
 */

import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { BAKE_FPS } from "../packages/video/src/art";
import { avifLoop, avifStill } from "./lib/avif";

const root = resolve(import.meta.dir, "..");
const artDir = join(root, "packages/video/public/art");
// sharp is Next's optional dependency, so it resolves from the web app, not from the root.
const next = Bun.resolveSync("next/package.json", join(root, "apps/web"));
const sharp = (await import(Bun.resolveSync("sharp", dirname(next)))).default;

const only = new Set(process.argv.slice(2));
const files = (await readdir(artDir)).filter((file) => {
  const id = file.replace(/(-base)?\.(webp|png)$/, "");
  return /\.(webp|png)$/.test(file) && (only.size === 0 || only.has(id));
});

const kb = (file: string) => Math.round(Bun.file(file).size / 1024);
let before = 0;
let after = 0;
for (const file of files.sort()) {
  const from = join(artDir, file);
  const to = join(
    artDir,
    file.endsWith(".png")
      ? file.replace(/\.png$/, "-still.avif")
      : file.replace(/\.webp$/, ".avif"),
  );
  const { pages = 1 } = await sharp(from, { animated: true }).metadata();
  if (pages > 1) {
    const work = await mkdtemp(join(tmpdir(), "wyg-avif-"));
    for (let page = 0; page < pages; page++) {
      await sharp(from, { page })
        .png()
        .toFile(join(work, `${String(page).padStart(2, "0")}.png`));
    }
    await avifLoop(join(work, "%02d.png"), BAKE_FPS, to);
    await rm(work, { recursive: true, force: true });
  } else {
    await avifStill(from, to);
  }
  before += kb(from);
  after += kb(to);
  console.log(`${file.padEnd(34)} ${String(kb(from)).padStart(4)} KB -> ${kb(to)} KB`);
}
console.log(`${files.length} files: ${before} KB of WebP/PNG, ${after} KB of AVIF.`);
process.exit(0);
