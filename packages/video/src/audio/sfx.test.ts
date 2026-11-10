import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { BLIP_STEPS, SFX, sfxFile } from "./sfx";

const PUBLIC = join(import.meta.dir, "../../public");

describe("SFX", () => {
  for (const [name, sound] of Object.entries(SFX)) {
    test(`${name} is a small WAV that plays under the music`, async () => {
      const file = Bun.file(join(PUBLIC, sound.file));
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeLessThan(200 * 1024);
      const header = new TextDecoder("latin1").decode(await file.slice(0, 12).arrayBuffer());
      expect(header.slice(0, 4)).toBe("RIFF");
      expect(header.slice(8, 12)).toBe("WAVE");
      expect(sound.volume).toBeGreaterThan(0);
      expect(sound.volume).toBeLessThanOrEqual(0.8);
    });
  }

  test("every blip pitch has a file, and steps past the top clamp to it", async () => {
    for (let step = 0; step < BLIP_STEPS.length; step++) {
      expect(await Bun.file(join(PUBLIC, sfxFile("blip", step))).exists()).toBe(true);
    }
    expect(sfxFile("blip", 99)).toBe(sfxFile("blip", BLIP_STEPS.length - 1));
    expect(sfxFile("pop", 3)).toBe(SFX.pop.file);
  });
});
