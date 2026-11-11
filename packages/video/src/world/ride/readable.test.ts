import { expect, test } from "bun:test";
import { layoutForSize, type RecapData, VIDEO_FORMATS } from "@wyg/schema";
import { busyRecap, emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { gardenModel } from "../scenes/garden.model";
import { commitsText, projectsModel } from "../scenes/projects.model";
import { buildRide, rideFrame } from "./model";
import { type Box, type Prim, scenePrims } from "./prims";
import { projectPoint, type RideCamera } from "./project";
import { STATIONS } from "./stations";
import { clip, stationContext } from "./stations/kit";
import { blockName } from "./stations/languages";
import { at } from "./track";
import { CELL_SEAT } from "./train";

/** Spec "How big printed text must be": shares of the frame's shorter side. */
const HEADLINE = 0.04;
const NAME = 0.022;

type Text = Extract<Prim, { kind: "text" }>;

/** One repository far larger than the rest: the stack must still read. */
const hugeRecap: RecapData = {
  ...busyRecap,
  repositories: {
    ...busyRecap.repositories,
    top: busyRecap.repositories.top.map((repo, i) =>
      i === 0 ? { ...repo, commits: 30_000 } : repo,
    ),
  },
};

/** For each stop of interest in each format: the texts drawn at its rest frame, and where Cell is. */
function restFrames(data: RecapData) {
  return Object.entries(VIDEO_FORMATS).flatMap(([id, format]) => {
    const m = buildRide(data, format, "video", 30);
    return m.stops.flatMap((stop, i) => {
      if (stop.kind !== "languages" && stop.kind !== "projects") return [];
      const frame = rideFrame(m, data, m.timeline.stopFrames[i] ?? 0, format, 30);
      const texts = scenePrims(
        [...frame.ground, ...frame.objects],
        frame.cam,
        format,
        frame.fog,
      ).filter((p): p is Text => p.kind === "text");
      const cell = projectPoint(at(stop.s + CELL_SEAT, 0, 1.0), frame.cam, format);
      return [
        { id, kind: stop.kind, short: Math.min(format.width, format.height), format, texts, cell },
      ];
    });
  });
}

/** The largest copy drawn of a string: a block prints on four sides, and the ones toward the camera count. */
const biggest = (texts: Text[], text: string) =>
  Math.max(0, ...texts.filter((t) => t.text === text).map((t) => t.capHeightPx));

function check(data: RecapData) {
  const garden = gardenModel(data);
  const projects = projectsModel(data);
  for (const rest of restFrames(data)) {
    const where = `${rest.id} ${rest.kind}`;
    if (rest.kind === "languages") {
      const top = garden.trees[0];
      if (top)
        expect({ where, value: biggest(rest.texts, top.label) / rest.short >= HEADLINE }).toEqual({
          where,
          value: true,
        });
      for (const tree of garden.trees) {
        const name = blockName(tree.name);
        expect({ where, name, ok: biggest(rest.texts, name) / rest.short >= NAME }).toEqual({
          where,
          name,
          ok: true,
        });
        expect({
          where,
          label: tree.label,
          ok: biggest(rest.texts, tree.label) / rest.short >= NAME,
        }).toEqual({
          where,
          label: tree.label,
          ok: true,
        });
      }
    } else {
      const top = projects.stacks[0];
      const figure = top ? commitsText(top.commits) : "";
      if (top) {
        expect({ where, value: biggest(rest.texts, figure) / rest.short >= HEADLINE }).toEqual({
          where,
          value: true,
        });
      }
      for (const stack of projects.stacks) {
        const name = clip(stack.label, 14);
        expect({ where, name, ok: biggest(rest.texts, name) / rest.short >= NAME }).toEqual({
          where,
          name,
          ok: true,
        });
      }
    }
    // Cell stays in the picture whatever gives way.
    const [x, y] = rest.cell ?? [-1, -1];
    expect({
      where,
      cell: x > 0 && x < rest.format.width && y > 0 && y < rest.format.height,
    }).toEqual({
      where,
      cell: true,
    });
  }
}

test("printed values and names are big enough at every stop, in every format", () => {
  check(sampleRecap);
});

test("the same holds with five languages and long repository names", () => {
  check(busyRecap);
});

test("the same holds when one repository has 30,000 commits", () => {
  check(hugeRecap);
});

/** Corners of a box on screen, as shares of the frame. */
function corners(
  box: Box,
  cam: RideCamera,
  format: { width: number; height: number },
): [number, number][] {
  const cos = Math.cos(box.yaw ?? 0);
  const sin = Math.sin(box.yaw ?? 0);
  const [px, py] = box.pivot ?? [box.at[0], box.at[1]];
  const out: [number, number][] = [];
  for (const i of [0, 1]) {
    for (const j of [0, 1]) {
      for (const k of [0, 1]) {
        const x = box.at[0] + i * box.size[0];
        const y = box.at[1] + j * box.size[1];
        const p = projectPoint(
          [
            px + (x - px) * cos - (y - py) * sin,
            py + (x - px) * sin + (y - py) * cos,
            box.at[2] + k * box.size[2],
          ],
          cam,
          format,
        );
        if (p) out.push([p[0] / format.width, p[1] / format.height]);
      }
    }
  }
  return out;
}

const HERO = ["language", "container", "board"];

test("no hero is cut off at its stop, and Cell stands clear of the frame's edge", () => {
  for (const data of [sampleRecap, busyRecap, hugeRecap]) {
    for (const [id, format] of Object.entries(VIDEO_FORMATS)) {
      const m = buildRide(data, format, "video", 30);
      m.stops.forEach((stop, i) => {
        if (stop.kind === "hello" || stop.kind === "city") return;
        const frame = rideFrame(m, data, m.timeline.stopFrames[i] ?? 0, format, 30);
        const centre = stationContext(data, m.city, stop, 1, 0, 0).c;
        const mine = frame.objects.filter(
          (s): s is Box =>
            s.kind === "box" &&
            HERO.includes(s.tag ?? "") &&
            Math.hypot((s.pivot?.[0] ?? 1e9) - centre[0], (s.pivot?.[1] ?? 1e9) - centre[1]) < 0.01,
        );
        const points = mine.flatMap((box) => corners(box, frame.cam, format));
        const where = `${id} ${stop.kind}`;
        const inside = points.every(([x, y]) => x > 0.01 && x < 0.99 && y > 0.03 && y < 0.97);
        expect({ where, inside }).toEqual({ where, inside: true });
        const cell = projectPoint(at(stop.s + CELL_SEAT, 0, 1.0), frame.cam, format);
        const cx = cell ? cell[0] / format.width : -1;
        const clear = cell ? cell[1] / format.height < 0.9 && cx > 0.06 && cx < 0.94 : false;
        expect({ where, clear }).toEqual({ where, clear: true });
      });
    }
  }
});

test("every line a station prints can be read at its stop, in every format", () => {
  const publicRecap: RecapData = { ...sampleRecap, meta: { ...sampleRecap.meta, scope: "public" } };
  for (const [name, data] of Object.entries({
    sampleRecap,
    busyRecap,
    emptyRecap,
    provisionalRecap,
    publicRecap,
  })) {
    for (const [id, format] of Object.entries(VIDEO_FORMATS)) {
      const m = buildRide(data, format, "video", 30);
      const layout = layoutForSize(format.width, format.height);
      const short = Math.min(format.width, format.height);
      m.stops.forEach((stop, i) => {
        const station = STATIONS[stop.kind];
        if (!station) return;
        const frame = rideFrame(m, data, m.timeline.stopFrames[i] ?? 0, format, 30);
        const overview = stop.kind === "city" ? 1 : 0;
        const solids = station(stationContext(data, m.city, stop, 1, 0, overview, layout));
        const texts = scenePrims(solids, frame.cam, format, frame.fog).filter(
          (p): p is Text => p.kind === "text",
        );
        const small = [...new Set(texts.map((t) => t.text))]
          .map((text) => ({ text, size: biggest(texts, text) / short }))
          .filter((line) => line.size < NAME)
          .map((line) => `${line.text} ${(line.size * 100).toFixed(1)}%`);
        expect({ where: `${name} ${id} ${stop.kind}`, small }).toEqual({
          where: `${name} ${id} ${stop.kind}`,
          small: [],
        });
      });
    }
  }
});
