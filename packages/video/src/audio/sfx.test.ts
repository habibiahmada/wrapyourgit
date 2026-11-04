import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { SFX } from "./sfx";

const PUBLIC = join(import.meta.dir, "../../public");

describe("SFX", () => {
  for (const [name, sound] of Object.entries(SFX)) {
    test(`${name} is a small WAV that plays under the music`, async () => {
      const file = Bun.file(join(PUBLIC, sound.file));
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeLessThan(200 * 1024);
      const header = new TextDecoder().decode(await file.slice(0, 12).arrayBuffer());
      expect(header.slice(0, 4)).toBe("RIFF");
      expect(header.slice(8, 12)).toBe("WAVE");
      expect(sound.volume).toBeGreaterThan(0);
      expect(sound.volume).toBeLessThanOrEqual(0.8);
    });
  }
});
