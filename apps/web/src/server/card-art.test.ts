import { expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video/sample";
import { cardArt } from "./card-art";

test("the card shows the archetype's city block, or Cell waving when there is none", () => {
  const archetype = sampleRecap.identity.archetype;
  expect(cardArt(sampleRecap)).toBe(archetype ? `skin-${archetype}` : "cutout-cell-wave");
  const none = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: null } };
  expect(cardArt(none)).toBe("cutout-cell-wave");
});
