import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { archetypeIdSchema } from "@wyg/schema";
import { sampleRecap } from "@wyg/video/sample";
import { cardArt, SITE_CARD_ARCHETYPES } from "./card-art";

test("the site card shows three different archetypes' dioramas, each with its art (#221)", () => {
  expect(new Set(SITE_CARD_ARCHETYPES).size).toBe(3);
  for (const id of SITE_CARD_ARCHETYPES) {
    expect(archetypeIdSchema.options).toContain(id);
    // public/art is copied from packages/video at dev and build time (sync-web-public.ts).
    const art = join(import.meta.dir, "../../../../packages/video/public/art", `skin-${id}.png`);
    expect(existsSync(art)).toBe(true);
  }
});

test("the card shows the archetype's city block, or Cell waving when there is none", () => {
  const archetype = sampleRecap.identity.archetype;
  expect(cardArt(sampleRecap)).toBe(archetype ? `skin-${archetype}` : "cutout-cell-wave");
  const none = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: null } };
  expect(cardArt(none)).toBe("cutout-cell-wave");
});
