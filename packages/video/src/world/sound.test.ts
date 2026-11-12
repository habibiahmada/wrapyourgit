import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SFX, sfxFile } from "../audio/sfx";
import {
  arrivalSound,
  edgeSounds,
  TAP_SOUND,
  TRAVEL_SOUND,
  travelSound,
  videoSounds,
} from "./sound";
import { STOP_KINDS, type Stop, type StopKind } from "./stops";

const PUBLIC = join(import.meta.dir, "../../public");

describe("world sounds", () => {
  test("every move is the train on its rails, a short loop that lasts as long as any move", () => {
    expect(TRAVEL_SOUND).toBe("rails");
    expect(existsSync(join(PUBLIC, sfxFile(TRAVEL_SOUND)))).toBe(true);
    for (const kind of STOP_KINDS) expect(travelSound(kind, false)).toBe("rails");
    expect(SFX.rails.loop).toBe(true);
    expect(SFX.rails.seconds).toBeLessThanOrEqual(2);
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

  test("each scene arrives with its own sound; the city has none", () => {
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
    expect(travelSound("letter", false)).toBe("rails");
  });
});

describe("edge and video sounds", () => {
  const stops = (kinds: StopKind[]): Pick<Stop, "kind">[] => kinds.map((kind) => ({ kind }));
  // hello, city, letter-1, letter-2, letter-3, closing
  const world = {
    stops: stops(["hello", "city", "letter", "letter", "letter", "closing"]),
    timeline: {
      stopFrames: [0, 40, 80, 120, 160, 200],
      moveFrames: [0, 40, 40, 33, 33, 40],
      inPlace: [false, false, false, true, true, false],
      durationInFrames: 201,
    },
  };

  test("backward from closing to the last letter page crosses closing's edge: a flight", () => {
    expect(edgeSounds(world.timeline, world.stops, 5, 4)).toEqual({
      travel: "rails",
      arrival: "page",
    });
  });

  test("a page turn plays no travel sound in either direction", () => {
    expect(edgeSounds(world.timeline, world.stops, 3, 2).travel).toBeNull();
    expect(edgeSounds(world.timeline, world.stops, 2, 3).travel).toBeNull();
  });

  test("forward into a flight plays the target's travel and arrival", () => {
    expect(edgeSounds(world.timeline, world.stops, 4, 5)).toEqual({
      travel: "rails",
      arrival: "firework",
    });
    expect(edgeSounds(world.timeline, world.stops, 1, 0)).toEqual({
      travel: "rails",
      arrival: "hello",
    });
  });

  test("arriving at the city has no arrival sound", () => {
    expect(edgeSounds(world.timeline, world.stops, 0, 1)).toEqual({
      travel: "rails",
      arrival: null,
    });
  });

  test("video sounds: hello at 0, the rails for each move and as long as it, none on page turns", () => {
    expect(videoSounds(world)).toEqual([
      { frame: 0, sound: "hello" },
      { frame: 0, sound: "rails", frames: 40 },
      { frame: 40, sound: "rails", frames: 40 },
      { frame: 80, sound: "page" },
      { frame: 120, sound: "page" },
      { frame: 160, sound: "page" },
      { frame: 160, sound: "rails", frames: 40 },
      { frame: 200, sound: "firework" },
    ]);
  });
});
