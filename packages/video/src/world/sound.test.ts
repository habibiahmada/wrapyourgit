import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SFX, sfxFile } from "../audio/sfx";
import { arrivalSound, TAP_SOUND, transitionSound, travelSound } from "./sound";
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

  test("every stop kind has an arrival sound that is null or a short existing file", () => {
    for (const kind of STOP_KINDS) {
      const name = arrivalSound(kind);
      if (name === null) continue;
      expect(existsSync(join(PUBLIC, sfxFile(name)))).toBe(true);
      expect(SFX[name].seconds).toBeLessThanOrEqual(1.2);
    }
  });

  test("each scene arrives with its own sound; the city leaves it to the wind", () => {
    expect(arrivalSound("hello")).toBe("hello");
    expect(arrivalSound("first-day")).toBe("sprout");
    expect(arrivalSound("private")).toBe("lock");
    expect(arrivalSound("busiest")).toBe("flag");
    expect(arrivalSound("rhythm")).toBe("chug");
    expect(arrivalSound("languages")).toBe("bloom");
    expect(arrivalSound("projects")).toBe("crate");
    expect(arrivalSound("community")).toBe("twinkle");
    expect(arrivalSound("engineering")).toBe("landing");
    expect(arrivalSound("archetype")).toBe("spotlight");
    expect(arrivalSound("versus")).toBe("seesaw");
    expect(arrivalSound("letter")).toBe("page");
    expect(arrivalSound("closing")).toBe("firework");
    expect(arrivalSound("city")).toBeNull();
  });

  test("an in-place move (a page turn) plays no travel sound", () => {
    expect(travelSound("letter", true)).toBeNull();
    expect(travelSound("letter", false)).toBe("dive");
    expect(travelSound("languages", false)).toBe("leaves");
  });
});
