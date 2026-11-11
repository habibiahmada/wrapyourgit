import { describe, expect, test } from "bun:test";
import { archetypeIdSchema } from "@wyg/schema";
import { TONES } from "./iso";
import { archetypeScene, letterScene, vaultScene } from "./section-scenes";

describe("section scenes", () => {
  test("every archetype has its own diorama with one lit object or roof", () => {
    const drawings = archetypeIdSchema.options.map((id) => JSON.stringify(archetypeScene(id)));
    expect(new Set(drawings).size).toBe(archetypeIdSchema.options.length);
    for (const id of archetypeIdSchema.options) {
      const lit = archetypeScene(id).boxes.filter((b) => b.tone.top === TONES.lit.top);
      expect(lit.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("the letter and the vault draw their marks", () => {
    expect(letterScene().glyphs.map((g) => g.kind)).toContain("flap");
    expect(vaultScene().glyphs.map((g) => g.kind)).toContain("keyhole");
  });
});
