/**
 * Copies the story's static files from packages/video/public into apps/web/public, so the web
 * app serves the same art, photos, language logos and audio the Remotion composition
 * uses. Runs before `dev` and `build` (apps/web/package.json).
 *
 *   bun scripts/sync-web-public.ts
 *
 * Copies, not symlinks: Vercel's build output step can't copy symlinked folders inside `public`
 * ("Cannot copy ... to a subdirectory of itself"). The copies are gitignored; packages/video/public
 * stays the only source.
 */

import { cpSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const from = join(root, "packages/video/public");
const to = join(root, "apps/web/public");

export const SHARED_FOLDERS = ["art", "audio", "lang", "photos"] as const;

for (const folder of SHARED_FOLDERS) {
  const source = join(from, folder);
  if (!existsSync(source)) throw new Error(`Missing ${source}`);
  const target = join(to, folder);
  // Removes an old copy or a leftover symlink from before this script existed.
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, dereference: true });
}
console.log(`Copied ${SHARED_FOLDERS.join(", ")} into apps/web/public.`);
