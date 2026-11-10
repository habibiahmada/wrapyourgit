import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { WORLD_TRACK, worldBeats, worldLoopSeconds } from "./world-track";

const PACKAGE = join(import.meta.dir, "../..");

describe("WORLD_TRACK", () => {
  const { startBeat, endBeat } = WORLD_TRACK.loop;

  test("loops on bar lines, for at least 64 beats, inside the track", () => {
    expect(startBeat % 4).toBe(0);
    expect(endBeat % 4).toBe(0);
    expect(endBeat - startBeat).toBeGreaterThanOrEqual(64);
    expect(startBeat).toBeGreaterThan(0);
    expect(endBeat).toBeLessThan(WORLD_TRACK.beats);
  });

  test("converts loop points to seconds of the file", () => {
    const beat = 60 / WORLD_TRACK.bpm;
    expect(worldLoopSeconds()).toEqual({
      start: WORLD_TRACK.offsetMs / 1000 + startBeat * beat,
      end: WORLD_TRACK.offsetMs / 1000 + endBeat * beat,
    });
  });

  test("beats land on whole frames at 30 fps", () => {
    expect(worldBeats(1)).toBe(20);
    expect(worldBeats(startBeat)).toBe(640);
    expect(worldBeats(endBeat)).toBe(3200);
  });

  test(
    "the file exists and lasts exactly its beats",
    async () => {
      const file = join(PACKAGE, "public", WORLD_TRACK.file);
      expect(await Bun.file(file).exists()).toBe(true);
      const probe =
        await $`bunx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 ${file}`
          .cwd(PACKAGE)
          .quiet()
          .text();
      const seconds = Number.parseFloat(probe.trim().split("\n").pop() ?? "");
      expect(Math.abs(seconds - (WORLD_TRACK.beats * 60) / WORLD_TRACK.bpm)).toBeLessThan(0.05);
    },
    { timeout: 60_000 },
  );
});
