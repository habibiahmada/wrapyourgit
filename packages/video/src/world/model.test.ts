import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap } from "../fixtures/edge-recaps";
import { sampleRecap } from "../fixtures/sample-recap";
import { cardOpacity } from "./fade";
import { buildWorld, worldDuration } from "./model";
import { MOVE_MIN_SECONDS } from "./timeline";

test("buildWorld: one camera per stop and a duration that covers the last stop", () => {
  const world = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], "interactive", 30);
  expect(world.cameras).toHaveLength(world.stops.length);
  expect(world.timeline.durationInFrames).toBe((world.timeline.stopFrames.at(-1) ?? 0) + 1);
});

test("worldDuration in video mode is longer than interactive by the holds", () => {
  const format = VIDEO_FORMATS["9x16"];
  const stops = buildWorld(sampleRecap, format, "video", 30).stops.length;
  const video = worldDuration(sampleRecap, format, "video");
  const interactive = worldDuration(sampleRecap, format, "interactive");
  expect(video - interactive).toBe(90 * stops);
});

test("inPlace comes from the stops: true exactly for letter pages after the first", () => {
  const world = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], "interactive", 30);
  expect(world.timeline.inPlace).toEqual(world.stops.map((s) => (s.page ?? 1) > 1));
});

for (const mode of ["interactive", "video"] as const)
  test(`letter pages turn in place (${mode}): one camera, a minimum-length move, one card at each rest`, () => {
    const fps = 30;
    const world = buildWorld(sampleRecap, VIDEO_FORMATS["1x1"], mode, fps);
    const pages = world.stops.flatMap((s, i) => (s.kind === "letter" ? [i] : []));
    expect(pages.length).toBeGreaterThan(1);
    const first = pages[0] as number;
    for (const i of pages) {
      expect(world.cameras[i]).toEqual(world.cameras[first] as (typeof world.cameras)[number]);
      if (i !== first)
        expect(world.timeline.moveFrames[i]).toBe(Math.round(MOVE_MIN_SECONDS * fps));
    }
    for (const i of pages) {
      const rest = world.timeline.stopFrames[i] as number;
      for (const j of pages) expect(cardOpacity(j, rest, world.timeline)).toBe(j === i ? 1 : 0);
    }
    // Mid-turn the new page is fully on (it draws the old page under itself) and the old one off,
    // so two translucent sheets never show through each other.
    for (const i of pages.slice(1)) {
      const mid =
        (world.timeline.stopFrames[i] as number) -
        Math.round((world.timeline.moveFrames[i] as number) / 2);
      expect(cardOpacity(i, mid, world.timeline)).toBe(1);
      expect(cardOpacity(i - 1, mid, world.timeline)).toBe(0);
    }
  });

for (const [name, data] of [
  ["sample", sampleRecap],
  ["long names", busyRecap],
] as const) {
  test(`buildWorld without the letter (${name}): no letter stops, ends on closing`, () => {
    for (const format of Object.values(VIDEO_FORMATS)) {
      const full = buildWorld(data, format, "interactive", 30);
      const bare = buildWorld(data, format, "interactive", 30, { letter: false });
      const letters = full.stops.filter((s) => s.id.startsWith("letter")).length;
      expect(letters).toBeGreaterThan(0);
      expect(bare.stops.some((s) => s.id.startsWith("letter"))).toBe(false);
      expect(bare.stops.at(-1)?.kind).toBe("closing");
      expect(bare.stops).toHaveLength(full.stops.length - letters);
      expect(bare.cameras).toHaveLength(bare.stops.length);
    }
  });

  test(`buildWorld without the letter (${name}): remaining cameras are unchanged`, () => {
    const format = VIDEO_FORMATS["9x16"];
    const full = buildWorld(data, format, "interactive", 30);
    const bare = buildWorld(data, format, "interactive", 30, { letter: false });
    bare.stops.forEach((stop, i) => {
      const at = full.stops.findIndex((s) => s.id === stop.id);
      expect(bare.cameras[i]).toEqual(full.cameras[at] as (typeof full.cameras)[number]);
    });
  });

  test(`worldDuration without the letter (${name}) is shorter`, () => {
    const format = VIDEO_FORMATS["9x16"];
    expect(worldDuration(data, format, "video", { letter: false })).toBeLessThan(
      worldDuration(data, format, "video"),
    );
  });
}
