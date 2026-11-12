import { describe, expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video/sample";
import { cardArt, cardSize, parseCardShape } from "./card-shape";

describe("parseCardShape", () => {
  test("no format is the link preview card; a video shape is itself; anything else is refused", () => {
    expect(parseCardShape(null)).toBe("card");
    expect(parseCardShape("9x16")).toBe("9x16");
    expect(parseCardShape("16x9")).toBe("16x9");
    expect(parseCardShape("2x3")).toBeNull();
    expect(parseCardShape("")).toBeNull();
  });
});

describe("cardSize", () => {
  test("the card is the link preview size, a shape its video size", () => {
    expect(cardSize("card")).toEqual({ width: 1200, height: 630 });
    expect(cardSize("9x16")).toEqual({ width: 1080, height: 1920 });
    expect(cardSize("1x1")).toEqual({ width: 1080, height: 1080 });
  });
});

describe("cardArt", () => {
  test("the archetype's city block, or Cell waving when there is none", () => {
    const archetype = sampleRecap.identity.archetype;
    expect(cardArt(sampleRecap)).toBe(archetype ? `skin-${archetype}` : "cutout-cell-wave");
    const none = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: null } };
    expect(cardArt(none)).toBe("cutout-cell-wave");
  });
});
