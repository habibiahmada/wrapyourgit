import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SFX, sfxFile } from "../audio/sfx";
import { TAP_SOUND, transitionSound } from "./sound";
import { STOP_KINDS } from "./stops";

const PUBLIC = join(import.meta.dir, "../../public");

describe("world sounds", () => {
  test("every stop kind has a transition sound with a file", () => {
    for (const kind of STOP_KINDS) {
      const name = transitionSound(kind);
      expect(existsSync(join(PUBLIC, sfxFile(name)))).toBe(true);
      expect(SFX[name].seconds).toBeLessThanOrEqual(2); // never longer than the longest move
    }
  });

  test("the garden rustles, the sky chirps, the city blows", () => {
    expect(transitionSound("languages")).toBe("leaves");
    expect(transitionSound("community")).toBe("crickets");
    expect(transitionSound("city")).toBe("wind");
    expect(transitionSound("closing")).toBe("wind");
    expect(transitionSound("busiest")).toBe("dive");
  });

  test("a tap has its own file", () => {
    expect(existsSync(join(PUBLIC, sfxFile(TAP_SOUND)))).toBe(true);
  });
});
