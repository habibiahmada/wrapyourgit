import { describe, expect, test } from "bun:test";
import { VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { sampleRecap } from "../../fixtures/sample-recap";
import { backdrop } from "./backdrop";
import { buildRide, rideFrame } from "./model";
import { scenePrims } from "./prims";

/**
 * The exact primitives of a spread of frames, as one hash. Work done to make a frame cheaper
 * (issue #141) must leave this unchanged: the same shapes, colours and order, so the same
 * picture. When a change is meant to alter the picture, update the hash in the same commit.
 */
function framesHash(format: keyof typeof VIDEO_FORMATS): string {
  const size = VIDEO_FORMATS[format];
  const model = buildRide(sampleRecap, size, "video", VIDEO_FPS, {});
  const last = model.timeline.durationInFrames - 1;
  const frames = [0, ...model.timeline.stopFrames, last].concat(
    Array.from({ length: 30 }, (_, i) => Math.round((i * last) / 29)),
  );
  const hasher = new Bun.CryptoHasher("sha256");
  for (const f of frames) {
    const { cam, fog, ground, objects } = rideFrame(model, sampleRecap, f, size, VIDEO_FPS, 0);
    hasher.update(
      JSON.stringify([
        backdrop(cam, size, model.city, f),
        scenePrims(ground, cam, size, fog),
        scenePrims(objects, cam, size, fog),
      ]),
    );
  }
  return hasher.digest("hex").slice(0, 16);
}

describe("the ride's frames", () => {
  test("draw the same primitives in portrait", () => {
    expect(framesHash("9x16")).toBe("53e12ca8ab4916ee");
  });
  test("draw the same primitives in landscape", () => {
    expect(framesHash("16x9")).toBe("4a77d7fd79faf439");
  });
});
