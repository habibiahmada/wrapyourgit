import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { LOOP_FPS, WORLD_TRACK, worldLoopFrames, worldLoopSeconds } from "./world-track";

const PACKAGE = join(import.meta.dir, "../..");

describe("WORLD_TRACK", () => {
  const { startFrame, endFrame } = WORLD_TRACK.loop;

  test("loops on whole frames, for over a minute, inside the file", () => {
    expect(Number.isInteger(startFrame)).toBe(true);
    expect(Number.isInteger(endFrame)).toBe(true);
    expect(startFrame).toBeGreaterThan(0);
    expect((endFrame - startFrame) / LOOP_FPS).toBeGreaterThan(60);
    // The file holds a copy of the loop's start after the loop end, for players that read past it.
    expect(WORLD_TRACK.seconds - endFrame / LOOP_FPS).toBeGreaterThanOrEqual(1);
  });

  test("plays a little below the file's level, the same on the web and in the video", () => {
    expect(WORLD_TRACK.volume).toBeGreaterThan(0.5);
    expect(WORLD_TRACK.volume).toBeLessThan(1);
  });

  test("converts loop points to seconds of the file", () => {
    expect(worldLoopSeconds()).toEqual({ start: startFrame / 30, end: endFrame / 30 });
  });

  test("gives the loop in frames at the video's rate", () => {
    expect(worldLoopFrames(30)).toEqual({ start: startFrame, end: endFrame });
    expect(worldLoopFrames(60)).toEqual({ start: startFrame * 2, end: endFrame * 2 });
  });

  test(
    "the file exists and lasts exactly its length",
    async () => {
      const file = join(PACKAGE, "public", WORLD_TRACK.file);
      expect(await Bun.file(file).exists()).toBe(true);
      const probe =
        await $`bunx remotion ffprobe -v error -show_entries format=duration -of csv=p=0 ${file}`
          .cwd(PACKAGE)
          .quiet()
          .text();
      const seconds = Number.parseFloat(probe.trim().split("\n").pop() ?? "");
      expect(Math.abs(seconds - WORLD_TRACK.seconds)).toBeLessThan(0.05);
    },
    { timeout: 60_000 },
  );
});
