/**
 * Writes the landing page's README samples (issue #193) to apps/web/public/landing: a badge, the
 * card and the snake, drawn from the story's public sample recap. Static files so the landing
 * loads them lazily below the fold instead of carrying them in its HTML; run again after a change
 * to badge.ts.
 *
 *   bun scripts/badge-samples.ts
 */
import { join, resolve } from "node:path";
import { badgeSvg, cardOptions, cardSvg, snakeSvg } from "../apps/web/src/badge/badge";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";

const out = join(resolve(import.meta.dir, ".."), "apps/web/public/landing");

const files: Record<string, string> = {
  "readme-badge.svg": badgeSvg(sampleRecap, ["contributions", "streak", "language"]),
  "readme-card.svg": cardSvg(sampleRecap, cardOptions({})),
  "readme-snake.svg": snakeSvg(sampleRecap),
};

for (const [name, svg] of Object.entries(files)) {
  await Bun.write(join(out, name), svg);
  console.log(`${name}: ${Math.round(svg.length / 1024)} KB`);
}
