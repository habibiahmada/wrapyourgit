import { expect, test } from "bun:test";
import { VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { congratsLetter } from "../../letter";
import { paginateLetter } from "../scenes/letter.model";
import { buildRide, HERO_TAGS, letterBeat, rideClock, rideDuration, rideFrame } from "./model";
import { type Box, type Solid, scenePrims } from "./prims";
import { stationContext } from "./stations/kit";
import { RIDE_KINDS } from "./stops";
import { buildFrames, trainAt } from "./timeline";

const f = VIDEO_FORMATS["16x9"];
const printed = (solids: Solid[]) =>
  solids.flatMap((s) => (s.kind === "box" ? (s.texts ?? []).map((t) => t.text) : []));
const tagged = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);

test("the ride has the player's timeline shape and a duration to match", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  // Every kind in the story's order, the letter once for each of its pages.
  const pages = m.stops.filter((s) => s.kind === "letter").length;
  expect(pages).toBe(paginateLetter(congratsLetter(sampleRecap), f).length);
  expect(m.stops.map((s) => s.kind).filter((kind, i, all) => kind !== all[i - 1])).toEqual([
    ...RIDE_KINDS,
  ]);
  expect(m.timeline.stopFrames).toHaveLength(m.stops.length);
  expect(rideDuration(sampleRecap, f, "video")).toBe(m.timeline.durationInFrames);
  expect(m.gates).toHaveLength(12);
});

test("the same frame gives the same picture whatever was computed before it", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const alone = rideFrame(m, sampleRecap, 400, f, 30);
  rideFrame(m, sampleRecap, 12, f, 30);
  rideFrame(m, sampleRecap, 700, f, 30);
  expect(rideFrame(m, sampleRecap, 400, f, 30)).toEqual(alone);
});

test("a rest loop ends where it began", () => {
  // In a video the hold (3 s) is longer than the loop (2 s), so one loop on from a stop's frame
  // the train is still resting: that frame must be the stop's frame again. (On the web the frame
  // after the loop is the first frame of the move, and the player wraps before it.)
  const m = buildRide(sampleRecap, f, "video", 30);
  for (const stop of m.timeline.stopFrames) {
    expect(rideFrame(m, sampleRecap, stop + m.timeline.restFrames, f, 30)).toEqual(
      rideFrame(m, sampleRecap, stop, f, 30),
    );
  }
});

test("a station is alive at rest: the picture changes inside the loop", () => {
  const m = buildRide(sampleRecap, f, "interactive", 30);
  const stop = m.timeline.stopFrames[2] ?? 0;
  expect(rideFrame(m, sampleRecap, stop + 7, f, 30).objects).not.toEqual(
    rideFrame(m, sampleRecap, stop, f, 30).objects,
  );
});

test("every station has finished building on its stop's frame", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  m.stops.forEach((_, i) => {
    const at = m.timeline.stopFrames[i] ?? 0;
    expect(printed(rideFrame(m, sampleRecap, at, f, 30).objects)).toEqual(
      printed(rideFrame(m, sampleRecap, at + 30, f, 30).objects),
    );
  });
});

test("the train and Cell are in every frame's picture", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  for (const at of [0, 100, 300, 500, m.timeline.durationInFrames - 1]) {
    const objects = rideFrame(m, sampleRecap, at, f, 30).objects;
    expect(tagged(objects, "engine").length).toBeGreaterThan(0);
    expect(tagged(objects, "cell-body")).toHaveLength(1);
  }
});

test("Cell turns to the camera at a station and faces forward on the ride", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const i = m.stops.findIndex((s) => s.kind === "languages");
  const at = m.timeline.stopFrames[i] ?? 0;
  const yaw = (frame: number) =>
    tagged(rideFrame(m, sampleRecap, frame, f, 30).objects, "cell-body")[0]?.yaw ?? 0;
  const riding = at - Math.round((m.timeline.moveFrames[i] ?? 0) / 2);
  // The camera stands ahead and to the side, so Cell turns part of the way round to face it.
  expect(Math.abs(yaw(at) - yaw(riding))).toBeGreaterThan(0.5);
});

test("Cell's eyes are open on every stop's frame, whatever the timing", () => {
  for (const data of [sampleRecap, busyRecap, provisionalRecap]) {
    const m = buildRide(data, f, "video", 30);
    for (const at of m.timeline.stopFrames) {
      for (const frame of [at, at + 1]) {
        const body = tagged(rideFrame(m, data, frame, f, 30).objects, "cell-body")[0];
        expect((body?.decals ?? []).some((d) => d.fill === "#ffffff")).toBe(true);
      }
    }
  }
});

test("Cell does not snap as the train arrives or leaves", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const arm = (frame: number) =>
    Math.max(
      ...tagged(rideFrame(m, sampleRecap, frame, f, 30).objects, "cell-arm").map((a) => a.at[2]),
    );
  m.timeline.stopFrames.slice(1).forEach((at) => {
    expect(Math.abs(arm(at) - arm(at - 1))).toBeLessThan(0.06);
    const leave = at + m.timeline.holdFrames;
    expect(Math.abs(arm(leave + 1) - arm(leave))).toBeLessThan(0.06);
  });
});

test("the ride builds for every fixture and format", () => {
  for (const data of [sampleRecap, emptyRecap, busyRecap, provisionalRecap]) {
    for (const format of Object.values(VIDEO_FORMATS)) {
      const m = buildRide(data, format, "video", 30);
      for (const stop of m.timeline.stopFrames) {
        expect(() => rideFrame(m, data, stop, format, 30)).not.toThrow();
      }
    }
  }
  // Sixteen rides, every stop of each with its town: over the default limit on a busy machine.
}, 30_000);

test("a frame stays inside the polygon budget", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const frames = m.timeline.stopFrames.flatMap((stop, i) => [
    stop,
    stop - Math.round((m.timeline.moveFrames[i] ?? 0) / 2),
  ]);
  for (const at of frames) {
    const { cam, fog, ground, objects } = rideFrame(m, sampleRecap, Math.max(0, at), f, 30);
    const count = scenePrims(ground, cam, f, fog).length + scenePrims(objects, cam, f, fog).length;
    expect({ at, ok: count < 4000 }).toEqual({ at, ok: true });
  }
});

test("a hero stays standing for the rest of the ride, and every plaza is there from the first frame", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const mine = (frame: number, stop: (typeof m.stops)[number], tags: (tag: string) => boolean) => {
    const c = stationContext(sampleRecap, m.city, stop, 1, 0, 0).c;
    return rideFrame(m, sampleRecap, frame, f, 30).objects.filter(
      (s): s is Box =>
        s.kind === "box" &&
        tags(s.tag ?? "") &&
        Math.hypot((s.pivot?.[0] ?? 1e9) - c[0], (s.pivot?.[1] ?? 1e9) - c[1]) < 0.01,
    );
  };
  const hero = (tag: string) =>
    tag !== "board" && tag !== "first-square" && tag !== "stage" && HERO_TAGS.includes(tag);
  const top = (boxes: Box[]) => Math.max(...boxes.map((b) => b.at[2] + b.size[2]));
  const last = m.timeline.durationInFrames - 1;
  m.stops.forEach((stop, i) => {
    if (!stop.plaza) return;
    // Nothing is put up when a shot catches it: the plaza is on the ground before the train moves.
    expect(mine(0, stop, (tag) => tag === "plaza")).toHaveLength(1);
    const rest = m.timeline.stopFrames[i] ?? 0;
    const here = mine(rest, stop, hero);
    // A station whose hero is a picture (the archetype's figure) has no hero boxes: its figure is
    // what must stay.
    const figures = (frame: number) =>
      rideFrame(m, sampleRecap, frame, f, 30).objects.filter((s) => s.kind === "picture").length;
    if (here.length === 0) {
      expect({ kind: stop.kind, figure: figures(rest) }).toEqual({ kind: stop.kind, figure: 1 });
      for (const later of [rest + m.timeline.holdFrames + 20, last]) expect(figures(later)).toBe(1);
      return;
    }
    // Nor taken down: it is the same hero when the train leaves and at the very end.
    for (const later of [rest + m.timeline.holdFrames + 20, last]) {
      const after = mine(later, stop, hero);
      expect(after).toHaveLength(here.length);
      expect(Math.abs(top(after) - top(here))).toBeLessThan(0.5);
    }
  });
});

test("a hero grows out of the ground as the train pulls in: it never starts in mid-air", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const hero = (tag: string) =>
    tag !== "board" && tag !== "first-square" && tag !== "stage" && HERO_TAGS.includes(tag);
  m.stops.forEach((stop, i) => {
    // The letter's station goes up before the train stops, which is well before its first
    // page's frame (the time at the desk comes between), and its later pages stop where it stands.
    if (!stop.plaza || stop.kind === "letter") return;
    const c = stationContext(sampleRecap, m.city, stop, 1, 0, 0).c;
    const rest = m.timeline.stopFrames[i] ?? 0;
    let seen = false;
    // From just before its build starts to its stop's frame.
    for (let frame = rest - buildFrames(i, m.timeline, 30) - 2; frame <= rest; frame++) {
      const boxes = rideFrame(m, sampleRecap, frame, f, 30).objects.filter(
        (s): s is Box =>
          s.kind === "box" &&
          hero(s.tag ?? "") &&
          Math.hypot((s.pivot?.[0] ?? 1e9) - c[0], (s.pivot?.[1] ?? 1e9) - c[1]) < 0.01,
      );
      if (boxes.length === 0 || seen) continue;
      seen = true;
      // The first frame it is there, all of it is still low and thin.
      const highest = Math.max(...boxes.map((b) => b.at[2] + b.size[2]));
      expect({ kind: stop.kind, low: highest < 2.5 }).toEqual({ kind: stop.kind, low: true });
    }
  });
  // Every frame of every station's build, whole.
}, 30_000);

test("the letter: the train stops, the camera comes in to the desk, the envelope opens, the sheet comes up", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const pages = m.stops.flatMap((stop, i) => (stop.kind === "letter" ? [i] : []));
  const first = pages[0] ?? 0;
  const last = pages.at(-1) ?? 0;
  const at = (i: number) => m.timeline.stopFrames[i] ?? 0;
  const arrives = at(first) - m.timeline.letterIntro;
  const place = m.stops[first]?.s ?? 0;
  const train = (frame: number) => trainAt(rideClock(m, frame), m.stops, m.timeline);
  // Before the train is there nothing of the letter shows, and the camera is the ride's own.
  expect(letterBeat(m, at(first - 1))).toEqual({ push: 0, open: 0, sheet: null });
  expect(letterBeat(m, arrives - 10)).toEqual({ push: 0, open: 0, sheet: null });
  expect(train(arrives - 30)).toBeLessThan(place);
  // The train has stopped by then, and stands through everything that follows.
  for (const frame of [arrives, arrives + 30, at(first), at(last) + 30]) {
    expect(train(frame)).toBeCloseTo(place);
  }
  // First a moment at the station's own shot...
  const pause = letterBeat(m, arrives + 8);
  expect(pause).toEqual({ push: 0, open: 0, sheet: null });
  // ...then the camera comes in, then the envelope opens, then the sheet comes up: in that order.
  const beats = Array.from({ length: m.timeline.letterIntro }, (_, k) =>
    letterBeat(m, arrives + k + 1),
  );
  const begins = (pick: (beat: (typeof beats)[number]) => number) =>
    beats.findIndex((b) => pick(b) > 0);
  const pushes = begins((b) => b.push);
  const opens = begins((b) => b.open);
  const shows = begins((b) => b.sheet?.opacity ?? 0);
  expect(pushes).toBeGreaterThan(5);
  expect(opens).toBeGreaterThan(pushes);
  expect(shows).toBeGreaterThan(opens);
  // None of them ever goes back on the way in.
  for (let k = 1; k < beats.length; k++) {
    expect(beats[k]?.push ?? 0).toBeGreaterThanOrEqual(beats[k - 1]?.push ?? 0);
    expect(beats[k]?.open ?? 0).toBeGreaterThanOrEqual(beats[k - 1]?.open ?? 0);
  }
  // Every page is whole on its own frame, the envelope open and the camera at the desk: a slide
  // of the stop is the page. The camera is the same for every page, and not the station's shot.
  const desk = rideFrame(m, sampleRecap, at(first), f, 30).cam;
  for (const i of pages) {
    const whole = { push: 1, open: 1, sheet: { stop: m.stops[i] as never, enter: 1, opacity: 1 } };
    expect(letterBeat(m, at(i))).toEqual(whole);
    expect(letterBeat(m, at(i) + 20)).toEqual(whole);
    expect(rideFrame(m, sampleRecap, at(i), f, 30).cam).toEqual(desk);
  }
  expect(rideFrame(m, sampleRecap, arrives + 4, f, 30).cam).not.toEqual(desk);
  expect(desk.pos[2]).toBeLessThan(rideFrame(m, sampleRecap, arrives + 4, f, 30).cam.pos[2]);
  // A later page turns over the end of the hold of the one before it, never faded.
  if (pages.length > 1) {
    const turn = letterBeat(m, at(pages[1] ?? 0) - 5);
    expect(turn.sheet?.stop.page).toBe(2);
    expect(turn.sheet?.opacity).toBe(1);
    expect(turn.sheet?.enter ?? 1).toBeLessThan(1);
    expect(turn.push).toBe(1);
  }
  // When the last page is read the sheet goes, the camera comes back out to the station's shot,
  // and only then does the train leave.
  const leaves = at(last) + m.timeline.holdFrames;
  expect(letterBeat(m, leaves + 6).sheet?.opacity ?? 1).toBeLessThan(1);
  expect(letterBeat(m, leaves + m.timeline.letterOutro - 2).push).toBeLessThan(0.1);
  expect(train(leaves + m.timeline.letterOutro - 1)).toBeCloseTo(place);
  expect(train(leaves + m.timeline.letterOutro + 20)).toBeGreaterThan(place);
  expect(letterBeat(m, leaves + m.timeline.letterOutro)).toEqual({ push: 0, open: 0, sheet: null });
  expect(letterBeat(m, at(last + 1))).toEqual({ push: 0, open: 0, sheet: null });
  // The public ride has no letter: no beat, and the ride's clock is the frame.
  const open = buildRide(sampleRecap, f, "video", 30, { letter: false });
  for (let frame = 0; frame < open.timeline.durationInFrames; frame += 15) {
    expect(letterBeat(open, frame)).toEqual({ push: 0, open: 0, sheet: null });
    expect(rideClock(open, frame)).toBe(frame);
  }
});

test("the envelope on the desk is shut until the camera is nearly there, then lets the letter out", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const first = m.stops.findIndex((stop) => stop.kind === "letter");
  const begins = m.timeline.stopFrames[first] ?? 0;
  const shut = rideFrame(m, sampleRecap, begins - m.timeline.letterIntro + 5, f, 30).objects;
  expect(tagged(shut, "desk-envelope")).toHaveLength(1);
  expect(tagged(shut, "desk-letter")).toHaveLength(0);
  const open = rideFrame(m, sampleRecap, begins, f, 30).objects;
  expect(tagged(open, "desk-envelope")).toHaveLength(2);
  const sheet = tagged(open, "desk-letter")[0];
  // The letter is out of the envelope and off the desk.
  const envelope = tagged(open, "desk-envelope")[0];
  expect(sheet?.at[2] ?? 0).toBeGreaterThan((envelope?.at[2] ?? 0) + 0.3);
});

test("the letter's station is drawn once, however many pages stop at it", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const i = m.stops.findLastIndex((stop) => stop.kind === "letter");
  const objects = rideFrame(m, sampleRecap, m.timeline.stopFrames[i] ?? 0, f, 30).objects;
  expect(tagged(objects, "envelope")).toHaveLength(1);
  expect(tagged(objects, "desk")).toHaveLength(1);
});

test("an idle offset runs the idle motion ahead without moving anything else", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const i = m.stops.findIndex((s) => s.kind === "languages");
  const at = m.timeline.stopFrames[i] ?? 0;
  const cellOf = (frame: number, idle = 0) =>
    rideFrame(m, sampleRecap, frame, f, 30, idle).objects.filter(
      (s): s is Box => s.kind === "box" && (s.tag ?? "").startsWith("cell-"),
    );
  // At rest only idle motion plays, so 20 frames of offset look like 20 frames later.
  expect(cellOf(at, 20)).toEqual(cellOf(at + 20));
  expect(cellOf(at, 20)).not.toEqual(cellOf(at));
  expect(rideFrame(m, sampleRecap, at, f, 30, 20).cam).toEqual(
    rideFrame(m, sampleRecap, at, f, 30).cam,
  );
});
