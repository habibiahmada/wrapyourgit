# Story ride, phase 1: engine and proof (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second composition, `RideStory`, that plays the train ride with five stations (hello, city, languages, projects, closing) from real recap data in all four formats, and a recorded answer to the gate: does it render in the browser, and how long does it take.

**Architecture:** Pure, tested modules in `packages/video/src/world/ride/` turn `RecapData` into a track, evenly spaced stations, a frame timeline with rest loops, a camera at any frame, and a list of solids (boxes with painted detail and printed text). One pure function projects those solids through a pinhole camera into SVG primitives, far to near; a thin React layer draws them. `RideStory` composes backdrop, scene and the existing chrome. Nothing in the live story changes in this phase.

**Tech Stack:** Remotion 4.0.541 (`remotion`, `@remotion/web-renderer`, `@remotion/player`), React 19, TypeScript strict with `noUncheckedIndexedAccess`, Bun test, Biome, Next.js 16 for the development-only gate page.

**Spec:** `docs/superpowers/specs/2026-11-11-story-ride-design.md` (approved by the maintainer on 2026-11-11). Visual reference: `packages/video/src/world/spike/RideSpike.tsx` and `persp.tsx`.

## Phases

This plan is phase 1 of 3. Users keep today's story until phase 3 switches over.

1. **Engine and proof** (this plan).
2. **All stations:** the remaining nine stops with their edge fixtures. Planned after the gate passes.
3. **Switch over:** the player's resting clock, sound, exports on `RideStory`, removal of the old scenes and the spike, ADR-0023, `DESIGN.md` and `docs/video/scene-system.md`.

## Global Constraints

- AGENTS.md rules 1 to 8. Inside `RideStory` and everything it renders, animate only from the frame: `interpolate`, `spring`, seeded `random("seed")`. No CSS transitions, timers, `Date.now()` or `Math.random()`.
- Only what `@remotion/web-renderer` can draw (ADR-0016): no `z-index` (order in the DOM, back to front), no 3D CSS transforms, no SVG `url()` clip paths or filters, no CSS filters, no `object-position`. No WebGL (ADR-0013). Printed text is SVG `<text>`.
- Flat colours only: no gradients, glows, shadows or blur anywhere in the story (spec goal 6).
- No overlays: no card, chip, panel or caption over the scene. Every number and word is printed on a solid (spec "Text"). The only things over the picture are the existing chrome's progress segments and copyright line.
- Every number comes from an existing scene model (`world/scenes/*.model.ts`) or the calendar. No schema or analytics changes. Estimates are printed in the model's own wording.
- A day with zero and a day that has not happened must never look alike: a `not-yet` day is an outline, a `zero` day is a dim flat square (AGENTS.md rule 2).
- Printed text at a stop's frame, in every format: a headline value's capital height is at least 4% of the frame's shorter side, a name or second line at least 2.2%.
- Formats from `VIDEO_FORMATS` (9:16, 4:5, 1:1, 16:9) at `VIDEO_FPS` (30). Branch on `layoutForSize()`'s family, never on a ratio; size from the frame, never fixed pixels.
- Colours are the GitHub-dark tones of the isometric kit, copied as constants into `ride/palette.ts`; do not import `three/diorama/isokit.tsx` (it pulls three.js into the story).
- Tests sit next to code (`foo.ts` → `foo.test.ts`), run with `bun test`. Before a task is done: `bun run typecheck && bun test && bun run lint`.
- Git: one issue for this phase, branch `feat/<issue>-story-ride-engine` from `main` (from `feat/84-iso-dioramas` if PR #85 is still open, and say so in the PR), Conventional Commits in English in the maintainer's name, no AI attribution. Commit steps run once the maintainer has said to commit for this plan; push and the PR wait for their word.

## Review Focus

Inputs the spec implies and that are most likely to break the ride for a real person. Each has a test in the task that owns the code.

1. **A year with no contributions, or a provisional year only days old** (`emptyRecap`, `provisionalRecap`): `maxCount` is 0, there is no busiest or first day, most squares are outlines. Expected: the ride still builds, nothing divides by zero, no hero looks like "zero". Tests: Tasks 5, 8, 11, 12.
2. **Zero, one or two languages or repositories** (edge fixture `edge-one-language`, `emptyRecap`): the podium and the towers must not index past the list or leave a gap that reads as a missing value. Tests: Task 11.
3. **Long names** (`busyRecap`): a repository or language name longer than its face. Expected: it shrinks to the minimum size, then truncates with an ellipsis, and the value stays readable. Tests: Tasks 2, 11, 13.
4. **Seeking out of order:** the web player seeks backwards and far. Expected: the picture at frame N is the same whether N is rendered alone or after any other frame. Tests: Task 12.
5. **The squarer formats** (4:5 and 1:1): the spike only proved 16:9 and 9:16. Expected: the hero, the board and Cell fit and the printed sizes hold. Tests: Tasks 7, 13.

---

## File structure

All under `packages/video/src/world/ride/` unless a path says otherwise.

| File                                                                       | Responsibility                                                                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `project.ts`                                                               | Pinhole camera maths: world point to camera space and to the screen                                      |
| `prims.ts`                                                                 | Solids (boxes, balls, decals, printed text, logos) to SVG primitives, culled, fogged, sorted far to near |
| `Scene.tsx`                                                                | Primitives to SVG elements                                                                               |
| `palette.ts`                                                               | Tones and colours                                                                                        |
| `track.ts`                                                                 | The rail's curve, where a day's square and a station sit                                                 |
| `gates.model.ts`                                                           | The month gates' running totals, from the calendar                                                       |
| `stops.ts`                                                                 | The ride's stops: `buildStops` filtered to built stations, with a place on the rail                      |
| `timeline.ts`                                                              | Stop frames, move frames, rest loops, where the train is at a frame, how far a station has built         |
| `camera.ts`                                                                | The shots and the camera at a frame                                                                      |
| `land.ts`                                                                  | Squares, rail, gates, props, beacons as solids                                                           |
| `train.ts`, `cell.ts`                                                      | The engine with wagons and smoke; Cell                                                                   |
| `backdrop.ts`, `Backdrop.tsx`                                              | Sky, horizon, far skyline, ground in screen space                                                        |
| `stations/kit.ts`                                                          | Plaza, board, ink, label fitting shared by stations                                                      |
| `stations/{hello,city,languages,projects,closing}.ts`, `stations/index.ts` | One hero per stop, from its model                                                                        |
| `model.ts`                                                                 | `buildRide`, `rideDuration`: everything the composition and the web need, pure                           |
| `RideStory.tsx`                                                            | The composition                                                                                          |
| `packages/video/src/Root.tsx`                                              | Registers `ride-<format>`                                                                                |
| `scripts/ride-stills.ts`                                                   | Stills of a stop in the formats, for checking by eye                                                     |
| `apps/web/src/app/recap/ride/`                                             | Development-only page for the gate                                                                       |

---

### Task 1: Land the reference and the documents

The spike is the visual reference for every later task, so it goes into the repository first, formatted and lint-clean, with the spec and this plan.

**Files:**

- Delete: `packages/video/src/world/spike/WorldSpike.tsx`, `iso-engine.tsx`, `ToonSpike.tsx`
- Modify: `packages/video/src/world/spike/RideSpike.tsx`, `persp.tsx` (format and lint only), `packages/video/src/Root.tsx`
- Create: `packages/video/src/world/spike/README.md`
- Add: `docs/superpowers/specs/2026-11-11-story-ride-design.md`, this plan

- [ ] **Step 1:** Open the issue ("Story ride, phase 1: engine and proof", label from `gh label list`, assigned to the maintainer) and the branch with `gh issue develop`.
- [ ] **Step 2:** Delete the three older spike files and their imports and `<Composition>` entries in `Root.tsx`, leaving only `ride-spike-16x9` and `ride-spike-9x16`.
- [ ] **Step 3:** Run `bun run format`, then fix what `bun run lint` still reports in the two remaining spike files without changing what they draw.
- [ ] **Step 4:** Write `spike/README.md`: three lines saying this is the throwaway visual reference for the spec, which frames to look at (20 hello, 105 ride, 290 languages, 570 projects), and that phase 3 deletes the folder.
- [ ] **Step 5:** Run `bun run typecheck && bun test && bun run lint`. Expected: all pass.
- [ ] **Step 6:** Commit: `docs: story ride design, phase 1 plan and the reference spike`.

---

### Task 2: Projection and primitives

**Files:**

- Create: `project.ts`, `project.test.ts`, `prims.ts`, `prims.test.ts`, `palette.ts`

**Interfaces (produces):**

```ts
// project.ts
export type V3 = [number, number, number];            // x, y on the ground, z up
export type Frame = { width: number; height: number };
export type RideCamera = { pos: V3; look: V3; fov: number };   // vertical field of view, degrees
export const NEAR = 0.25;
export function projector(cam: RideCamera, frame: Frame): {
  toCamera(p: V3): V3;                    // right, up, depth
  toScreen(c: V3): [number, number];      // from camera space
  focal: number;                          // pixels per world unit at depth 1
  yaw: number;                            // heading of the view on the ground, radians
};
/** Screen x, y and depth; null when the point is nearer than NEAR. */
export function projectPoint(p: V3, cam: RideCamera, frame: Frame): [number, number, number] | null;

// palette.ts
export type Tone = { top: string; left: string; right: string };
export function mixHex(a: string, b: string, t: number): string;      // t clamped to 0..1
export function toneOf(hex: string): Tone;   // top +16% white, left = hex, right +30% black
export function inkOn(hex: string): string;  // "#0d1117" on light faces (luminance > 0.5), "#ffffff" otherwise
export const SKY, HAZE, GROUND, LIT, INK, GREENS, TONE;   // values as in RideSpike.tsx

// prims.ts
export type FaceName = "top" | "front" | "back" | "left" | "right";   // front is +x of the box, left is +y
export type FaceSet = FaceName | "sides" | "all";                      // sides = left and right; all = the four upright faces
export type Decal = { on: FaceSet; rect: [number, number, number, number]; fill: string; round?: boolean };
export type FaceText = { on: FaceSet; rect: [number, number, number, number]; text: string; fill: string; weight?: number };
export type Box = {
  kind: "box"; at: V3; size: V3; tone: Tone;
  yaw?: number; pivot?: [number, number];     // turn about the vertical through pivot
  edge?: boolean;                              // hairline edge, default true
  lit?: boolean;                               // skip the fog
  outline?: boolean;                           // edges only, no fill: a day that has not happened
  decals?: Decal[]; texts?: FaceText[]; logo?: string;
};
export type Ball = { kind: "ball"; c: V3; r: number; color: string; opacity?: number };
export type Solid = Box | Ball;
export type Fog = { color: string; near: number; far: number };
export type Prim =
  | { kind: "poly"; pts: [number, number][]; fill: string | null; stroke: string | null; depth: number }
  | { kind: "circle"; x: number; y: number; r: number; fill: string; opacity: number; depth: number }
  | { kind: "image"; matrix: [number, number, number, number, number, number]; href: string; depth: number }
  | { kind: "text"; matrix: [number, number, number, number, number, number]; text: string; x: number; y: number;
      size: number; fill: string; weight: number; capHeightPx: number; depth: number };
export function fitText(text: string, wide: number, tall: number): number;   // min(tall * 0.92, wide / (0.6 * text.length))
export function scenePrims(solids: readonly Solid[], cam: RideCamera, frame: Frame, fog: Fog): Prim[];   // far to near
```

Rules the tests pin (the spike's `persp.tsx` shows one working implementation):

- A face is dropped when it faces away from the camera, or when any of its corners is nearer than `NEAR`.
- Face colours: `top` uses `tone.top`; `front` and `right` use `tone.right`; `back` and `left` use `tone.left`.
- A rect's `u` runs left to right as seen from outside the face and `v` runs up; on `top`, `u` runs along +x and `v` along +y.
- A decal's polygon has its face's depth minus 0.02, a text's minus 0.03, a logo's minus 0.01, so each paints straight after its face.
- Text lies on the face: its matrix maps one world unit along the face's `u` and one world unit down the face to the screen, with the rect's top-left as origin; `size = fitText(...)` in world units; `capHeightPx = 0.7 * size * (length of the matrix's second column)`.
- Fog mixes a colour toward `fog.color` by `clamp((depth - near) / (far - near))`; `lit` boxes skip it.
- A ball nearer than 3 units is dropped (a puff at the lens would cover the view).

- [ ] **Step 1: Write the failing tests** in `project.test.ts`:

```ts
const cam = { pos: [0, -10, 0], look: [0, 0, 0], fov: 90 } as const;
const frame = { width: 200, height: 100 };
test("the look point lands in the centre at its distance", () => {
  expect(projectPoint([0, 0, 0], cam, frame)).toEqual([100, 50, 10]);
});
test("x runs right and z runs up on screen", () => {
  expect(projectPoint([1, 0, 0], cam, frame)?.[0]).toBeCloseTo(105);
  expect(projectPoint([0, 0, 1], cam, frame)?.[1]).toBeCloseTo(45);
});
test("a point behind the near plane is null", () => {
  expect(projectPoint([0, -10.1, 0], cam, frame)).toBeNull();
});
```

and in `prims.test.ts` (one unit box at the origin, tone `{ top: "#111111", left: "#222222", right: "#333333" }`, camera `{ pos: [-6, 6, 6], look: [0.5, 0.5, 0.5], fov: 40 }`, frame 400 by 400, fog `{ color: "#000000", near: 100, far: 200 }`):

```ts
test("only the faces toward the camera are drawn, each in its tone", () => {
  const fills = scenePrims([box], cam, frame, fog).map((p) => (p.kind === "poly" ? p.fill : null));
  expect(fills.sort()).toEqual(["#111111", "#222222", "#222222"]); // top, back, left
});
test("a box behind the camera draws nothing", () => {
  /* at: [-20, 20, 20] → [] */
});
test("primitives come far to near", () => {
  /* two boxes; depths are non-increasing */
});
test("a decal paints straight after its face", () => {
  /* the prim after the top face's poly has fill "#ff0000" */
});
test("fog mixes toward its colour with depth, and lit skips it", () => {
  /* near: 0, far: 1 → "#000000"; lit → tone colour */
});
test("an outline box has strokes and no fills", () => {
  /* every poly: fill null, stroke not null */
});
test("printed text fits its rect and reports its size on screen", () => {
  // text "42%" on "back", rect [0, 0, 1, 1] → one text prim; size === fitText("42%", 1, 1); capHeightPx > 0
});
test("fitText shrinks a long line to its width", () => {
  expect(fitText("12", 10, 1)).toBeCloseTo(0.92);
  expect(fitText("a-very-long-repository-name", 2, 1)).toBeCloseTo(2 / (0.6 * 27));
});
test("a turned box keeps its faces' names", () => {
  /* yaw: Math.PI → "front" text is drawn from the camera that saw "back" */
});
```

- [ ] **Step 2:** Run `bun test packages/video/src/world/ride`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement `project.ts`, `palette.ts`, `prims.ts` to the interfaces and rules above.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): perspective projection and scene primitives for the ride`.

---

### Task 3: The SVG layer

**Files:**

- Create: `Scene.tsx`, `Scene.test.tsx`

**Interfaces:**

- Consumes: `Prim` from Task 2.
- Produces: `export function RideScene({ prims }: { prims: readonly Prim[] }): ReactNode`: a fragment of SVG elements in the given order, to be placed inside an `<svg>`. Polygons: `fill` or `"none"`, a 1px stroke (`stroke` when given, else the fill darkened 35%), round joins. Text: `transform="matrix(...)"`, `textAnchor="middle"`, `dominantBaseline="central"`. Image: `width={1} height={1}` under its matrix.

- [ ] **Step 1: Write the failing test** with `renderToStaticMarkup` from `react-dom/server`:

```ts
test("draws one element per primitive, in order", () => {
  const html = renderToStaticMarkup(<svg><RideScene prims={[poly, text, circle]} /></svg>);
  expect(html.indexOf("<polygon")).toBeLessThan(html.indexOf("<text"));
  expect(html.indexOf("<text")).toBeLessThan(html.indexOf("<circle"));
  expect(html).toContain(">42%</text>");
});
test("an outline polygon has no fill", () => { /* fill: null → fill="none" */ });
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `RideScene`.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): draw ride primitives as SVG`.

---

### Task 4: Track and station places

**Files:**

- Create: `track.ts`, `track.test.ts`

**Interfaces (produces):**

```ts
export const WEEK = 1.55; // rail length of one week
export const YEAR_START = 14; // where week 0 begins
export const FIRST_PLATFORM = 4; // hello
export const SQUARE = 0.9; // a day's square
export const ROW_PITCH = 1.05; // between rows of days
export const FIRST_ROW = 2.9; // from the rail to the nearest row's centre
export const PLAZA_LATERAL = 8; // from the rail to a plaza's centre
export const PLAZA = { long: 9.6, deep: 4.8 };
export function railEnd(weeks: number): number; // YEAR_START + weeks * WEEK + 6: the buffers
export function terminus(weeks: number): number; // railEnd(weeks) - 4: closing
export function pathY(s: number): number; // 5 * sin(2π (s - 4) / 64)
export function heading(s: number): number; // radians, direction of travel at s
/** A point `lateral` to the right of the rail at distance `s`. */
export function at(s: number, lateral?: number, z?: number): V3;
export function weekS(col: number): number; // YEAR_START + col * WEEK
/** Rows 0 to 2 sit left of the rail (negative lateral), rows 3 to 6 right. */
export function dayPlace(plot: { col: number; row: number }): { s: number; lateral: number };
/** Station `index` of `count` placed stations: even intervals from FIRST_PLATFORM to terminus, sides alternating. */
export function stationPlace(
  index: number,
  count: number,
  weeks: number,
): { s: number; side: 1 | -1 };
```

`side` is 1 for the right of the rail. Index 0 gets side -1, index 1 side 1, and so on.

- [ ] **Step 1: Write the failing tests:**

```ts
test("the rail's point and heading agree", () => {
  const a = at(20),
    b = at(20.001);
  expect(Math.atan2(b[1] - a[1], b[0] - a[0])).toBeCloseTo(heading(20), 3);
});
test("lateral is to the right of travel", () => {
  // at s = 4 the heading is positive x; right of +x is -y
  expect(at(4, 2)[1]).toBeLessThan(at(4, 0)[1]);
});
test("three rows of days sit left of the rail and four right", () => {
  expect(dayPlace({ col: 0, row: 0 }).lateral).toBeCloseTo(-(FIRST_ROW + 2 * ROW_PITCH));
  expect(dayPlace({ col: 0, row: 2 }).lateral).toBeCloseTo(-FIRST_ROW);
  expect(dayPlace({ col: 0, row: 3 }).lateral).toBeCloseTo(FIRST_ROW);
  expect(dayPlace({ col: 3, row: 6 }).s).toBeCloseTo(YEAR_START + 3 * WEEK);
});
test("stations sit at even intervals from the first platform to the terminus", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  expect(places[0]?.s).toBe(FIRST_PLATFORM);
  expect(places[11]?.s).toBeCloseTo(terminus(53));
  const gaps = places.slice(1).map((p, i) => p.s - (places[i]?.s ?? 0));
  for (const g of gaps) expect(g).toBeCloseTo(gaps[0] ?? 0);
});
test("neighbouring plazas are on opposite sides, and same-side plazas clear each other", () => {
  const places = Array.from({ length: 12 }, (_, i) => stationPlace(i, 12, 53));
  places.slice(1).forEach((p, i) => expect(p.side).toBe(-(places[i]?.side ?? 0)));
  expect((places[2]?.s ?? 0) - (places[0]?.s ?? 0)).toBeGreaterThan(PLAZA.long + 2);
});
test("one station alone sits on the first platform", () => {
  expect(stationPlace(0, 1, 53).s).toBe(FIRST_PLATFORM);
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `track.ts`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the ride's rail and where stations sit`.

---

### Task 5: Gate totals

**Files:**

- Create: `gates.model.ts`, `gates.model.test.ts`
- Modify: `docs/analytics/metrics.md` (one paragraph at the end of "Contributions")

**Interfaces (produces):**

```ts
export type Gate = {
  month: number; // 0 to 11
  name: string; // "JAN" … "DEC"
  col: number; // week column of the 1st of the month (from buildCity's plots)
  /** Contributions on days before the 1st of this month, null for January and for a month that has not started. */
  before: number | null;
  /** "432 so far", or null when `before` is null. Formatted with formatCount. */
  line: string | null;
};
export function gates(data: RecapData, city: City): Gate[]; // always 12
```

"Has not started" means the 1st of the month is after `meta.periodEnd` in a provisional recap. Sum by date from `contributions.calendar`, never by week.

The `metrics.md` paragraph: the gates' "so far" is a presentation of `contributions.calendar` (a prefix sum by date), not a metric of its own; the last started gate's figure plus the days from that gate to `periodEnd` equals `contributions.total`.

- [ ] **Step 1: Write the failing tests:**

```ts
test("twelve gates, January without a total", () => {
  const g = gates(sampleRecap, buildCity(sampleRecap));
  expect(g.map((x) => x.name)).toEqual([
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ]);
  expect(g[0]).toMatchObject({ before: null, line: null });
});
test("a gate counts the days before its month, by date", () => {
  const data = withCalendar(sampleRecap, { "2026-01-31": 5, "2026-02-01": 7, "2026-02-28": 2 });
  const g = gates(data, buildCity(data));
  expect(g[1]).toMatchObject({ before: 5, line: "5 so far" }); // by date: 31 January counts, 1 February does not
  expect(g[2]).toMatchObject({ before: 14, line: "14 so far" });
});
test("the last gate plus the rest of the year is the total", () => {
  const city = buildCity(sampleRecap);
  const dec = gates(sampleRecap, city)[11];
  const december = sampleRecap.contributions.calendar
    .filter((d) => d.date >= "2026-12-01")
    .reduce((n, d) => n + d.count, 0);
  expect((dec?.before ?? 0) + december).toBe(
    sampleRecap.contributions.calendar.reduce((n, d) => n + d.count, 0),
  );
});
test("a month that has not started has no total", () => {
  const g = gates(provisionalRecap, buildCity(provisionalRecap));
  expect(g.at(-1)).toMatchObject({ before: null, line: null });
});
test("an empty year reads 0 so far, not a blank", () => {
  expect(gates(emptyRecap, buildCity(emptyRecap))[5]?.line).toBe("0 so far");
});
```

If `emptyRecap` is provisional, the last test uses a month before its `periodEnd`; read the fixture first.

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `gates`, and add the `metrics.md` paragraph.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): running totals for the month gates`.

---

### Task 6: Stops and timeline

**Files:**

- Create: `stops.ts`, `stops.test.ts`, `timeline.ts`, `timeline.test.ts`

**Interfaces:**

- Consumes: `buildStops`, `Stop`, `StopKind` from `../stops`; `WorldMode`, `Timeline`, `easeInOutCubic` from `../timeline`; `stationPlace` from Task 4.
- Produces:

```ts
// stops.ts
/** The stops this build can draw. Phase 2 grows it to every StopKind. */
export const RIDE_KINDS: readonly StopKind[] = [
  "hello",
  "city",
  "languages",
  "projects",
  "closing",
];
export type RideStop = Stop & {
  s: number; // where the train rests
  side: 1 | -1; // which side of the rail its plaza is on
  plaza: boolean; // false for hello, city and closing
};
export function rideStops(
  data: RecapData,
  city: City,
  options?: { letterPages?: number; letter?: boolean },
): RideStop[];

// timeline.ts
export const HOLD_SECONDS = 3; // video mode
export const REST_SECONDS = 2; // the rest loop, both modes
export const MOVE_MIN_SECONDS = 1.6;
export const MOVE_MAX_SECONDS = 3.2;
export const BUILD_SECONDS = 1.2; // a hero builds over the last part of the move in
export type RideTimeline = Timeline & { restFrames: number; holdFrames: number };
export function buildRideTimeline(
  stops: readonly RideStop[],
  mode: WorldMode,
  fps: number,
): RideTimeline;
/** Where the engine's nose is at a frame: at rest during a hold, eased between stops during a move. */
export function trainAt(frame: number, stops: readonly RideStop[], timeline: RideTimeline): number;
/** 0 until BUILD_SECONDS before stop i's frame, eased to 1 at that frame, 1 from then on. Stop 0 is always 1. */
export function buildProgress(
  i: number,
  frame: number,
  timeline: RideTimeline,
  fps: number,
): number;
```

Rules:

- `rideStops` keeps `buildStops`' order, drops kinds not in `RIDE_KINDS`, and gives places with `stationPlace(index, count, weeks)` over the placed stops: every stop except `city`, with the letter's pages counted once. `city` rests at the midpoint between the stops before and after it.
- `holdFrames` is `HOLD_SECONDS * fps` in `video` mode and `REST_SECONDS * fps` in `interactive` mode. `restFrames` is `REST_SECONDS * fps` in both.
- `stopFrames[0] = 0`; `stopFrames[i] = stopFrames[i-1] + holdFrames + moveFrames[i]`; `durationInFrames = last stop frame + holdFrames + 1`.
- A move takes `MOVE_MIN + (MOVE_MAX - MOVE_MIN) * min(1, distance / 16)` seconds, where distance is along the rail; 0 for an in-place move (same `s`).
- During a move the train eases from one `s` to the next with `easeInOutCubic`.

- [ ] **Step 1: Write the failing tests:**

```ts
// stops.test.ts
test("the ride keeps the story's order and only the stations it can draw", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap), { letter: false });
  expect(stops.map((s) => s.kind)).toEqual(["hello", "city", "languages", "projects", "closing"]);
});
test("stations run forward along the rail and never share a place", () => {
  const s = rideStops(sampleRecap, buildCity(sampleRecap))
    .filter((x) => x.kind !== "city")
    .map((x) => x.s);
  for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1] ?? 0);
});
test("the city overview waits between its neighbours and has no plaza", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  const i = stops.findIndex((x) => x.kind === "city");
  expect(stops[i]?.s).toBeCloseTo(((stops[i - 1]?.s ?? 0) + (stops[i + 1]?.s ?? 0)) / 2);
  expect(stops[i]?.plaza).toBe(false);
});
test("an empty year still gets every station", () => {
  expect(rideStops(emptyRecap, buildCity(emptyRecap)).map((s) => s.kind)).toEqual([
    "hello",
    "city",
    "languages",
    "projects",
    "closing",
  ]);
});

// timeline.test.ts
test("video mode holds three seconds, interactive holds the rest loop", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  expect(buildRideTimeline(stops, "video", 30).holdFrames).toBe(90);
  expect(buildRideTimeline(stops, "interactive", 30).holdFrames).toBe(60);
  expect(buildRideTimeline(stops, "interactive", 30).restFrames).toBe(60);
});
test("moves take between 1.6 and 3.2 seconds", () => {
  const t = buildRideTimeline(rideStops(sampleRecap, buildCity(sampleRecap)), "video", 30);
  for (const m of t.moveFrames.slice(1)) {
    expect(m).toBeGreaterThanOrEqual(48);
    expect(m).toBeLessThanOrEqual(96);
  }
});
test("the train rests through a hold and arrives exactly on the stop's frame", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  const t = buildRideTimeline(stops, "video", 30);
  expect(trainAt(0, stops, t)).toBe(stops[0]?.s);
  expect(trainAt(t.holdFrames, stops, t)).toBe(stops[0]?.s);
  expect(trainAt(t.stopFrames[2] ?? 0, stops, t)).toBe(stops[2]?.s);
  expect(trainAt((t.stopFrames[2] ?? 0) + 40, stops, t)).toBe(stops[2]?.s);
});
test("a hero has finished building on its stop's frame", () => {
  const stops = rideStops(sampleRecap, buildCity(sampleRecap));
  const t = buildRideTimeline(stops, "video", 30);
  const f = t.stopFrames[2] ?? 0;
  expect(buildProgress(2, f, t, 30)).toBe(1);
  expect(buildProgress(2, f - 36, t, 30)).toBe(0);
  expect(buildProgress(2, f - 18, t, 30)).toBeGreaterThan(0);
  expect(buildProgress(0, 0, t, 30)).toBe(1);
});
test("the duration ends one frame after the last hold", () => {
  /* last stop frame + holdFrames + 1 */
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the ride's stops and timeline with rest loops`.

---

### Task 7: Camera

**Files:**

- Create: `camera.ts`, `camera.test.ts`

**Interfaces:**

- Consumes: `RideStop`, `RideTimeline`, `trainAt` (Task 6); `at`, `heading`, `PLAZA_LATERAL` (Task 4); `RideCamera`, `Frame` (Task 2); `layoutForSize` from `@wyg/schema`.
- Produces:

```ts
export type Look = "ahead" | "cell" | "train" | "hero";
export type Shot = { theta: number; radius: number; height: number; fov: number; look: Look };
export const SHOTS: {
  RIDE: Shot;    // { theta: π,      radius: 4.6,  height: 2.4,  fov: 56, look: "ahead" }
  OVER: Shot;    // { theta: 0.75π,  radius: 15,   height: 8.7,  fov: 34, look: "train" }
  SIDE: Shot;    // { theta: 0.56π,  radius: 5.6,  height: 1.2,  fov: 50, look: "train" }
  ISO: Shot;     // { theta: 0.75π,  radius: 19.5, height: 11.3, fov: 25, look: "hero" }
  HELLO: Shot;   // { theta: 1.0,    radius: 3.2,  height: 1.9,  fov: 56, look: "cell" }
};
/** The shot in the middle of the move into stop i: OVER and SIDE alternate; null when the move is under 2.2 s. */
export function middleShot(i: number, moveSeconds: number): "OVER" | "SIDE" | null;
/** The camera at a stop's rest frame, for this frame's size. */
export function restCamera(stop: RideStop, stops: readonly RideStop[], frame: Frame): RideCamera;
export function rideCamera(
  frameIndex: number,
  stops: readonly RideStop[],
  timeline: RideTimeline,
  frame: Frame,
): { cam: RideCamera; roll: number; riding: boolean; speed: number };
```

Rules:

- `theta` is the camera's angle round the engine from the direction of travel: 0 in front, π straight behind, positive on the left. For a station on the left of the rail (`side === -1`) the ISO, OVER and SIDE angles are mirrored (`-theta`), so the camera always sits across the rail from the plaza.
- A move into stop `i` runs: the previous stop's rest shot, to RIDE, the middle shot if any, RIDE, to stop `i`'s rest shot, with `easeInOutCubic` between keys; `radius`, `height` and `fov` interpolate on a log scale, `theta` linearly, the look point linearly between the two keys' look points.
- Look points: `ahead` is the rail 7 units ahead at height 1; `cell` is Cell at height 1.2; `train` is 1 unit behind the nose at height 0.8; `hero` is 55% of the way from the engine (height 1.2) to the plaza's centre (height 3.4).
- `hello` rests on `HELLO`. `city` rests on OVER's angle pulled out until `at(FIRST_PLATFORM)` and `at(railEnd)` are both inside the frame with a 6% margin. Other stops rest on ISO.
- While `riding` (both keys look `ahead`, and the train is moving) the camera sways (`theta ± 0.2`, period 62 frames; height ± 0.25, period 86 frames), bumps with speed, and `roll` is non-zero. At rest and during a hold: no sway, `roll === 0`, the camera does not move.
- The lens widens by layout family so the subject fits: `portrait` multiplies `fov` by 1.42 on RIDE and up to 1.92 on ISO; `compact` and `landscape` values are the builder's, bounded by Task 13's size test.

- [ ] **Step 1: Write the failing tests** (stops and timeline from `sampleRecap`, video mode, 30 fps; `landscape = { width: 1920, height: 1080 }`):

```ts
test("the camera does not move during a hold", () => {
  const f = t.stopFrames[2] ?? 0;
  expect(rideCamera(f + 1, stops, t, landscape)).toEqual(rideCamera(f + 45, stops, t, landscape));
  expect(rideCamera(f, stops, t, landscape).roll).toBe(0);
});
test("a station's rest frame is the rest camera", () => {
  expect(rideCamera(t.stopFrames[2] ?? 0, stops, t, landscape).cam).toEqual(
    restCamera(stops[2] as RideStop, stops, landscape),
  );
});
test("the camera sits across the rail from the plaza", () => {
  // for each plaza stop: the camera's lateral offset from the rail has the opposite sign of stop.side
});
test("the camera never jumps", () => {
  // for every frame: the look point moves less than 2.5 units and the position less than 4 units from the frame before
});
test("middle shots alternate and short moves have none", () => {
  expect(middleShot(1, 3)).not.toBe(middleShot(2, 3));
  expect(middleShot(1, 1.8)).toBeNull();
});
test("the city shot holds the whole rail in every format", () => {
  // for each VIDEO_FORMATS size: projectPoint(at(FIRST_PLATFORM)) and projectPoint(at(railEnd(53))) are inside the frame
});
test("the same frame gives the same camera", () => {
  /* two calls are deeply equal */
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `camera.ts`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the ride's shots and camera`.

---

### Task 8: The land

**Files:**

- Create: `land.ts`, `land.test.ts`

**Interfaces:**

- Consumes: `City`, `Plot` from `../city`; `heatLevels` from `../../heat`; `Gate` (Task 5); `RideStop` (Task 6); track (Task 4); `Solid`, `Box` (Task 2); `random` from `remotion`.
- Produces:

```ts
export const LIGHT_AHEAD = 15; // a day lights when the train is this close behind it
export type View = {
  trainS: number;
  from: number;
  to: number; // only what lies between these rail distances is built
  /** 0 on the ride; 1 at the city overview: every day with data is lit, sleepers and props are not built. */
  overview: number;
};
export type Land = { ground: Solid[]; objects: Solid[] };
export function land(
  city: City,
  gates: readonly Gate[],
  stops: readonly RideStop[],
  view: View,
): Land;
```

Rules (sizes and tones as in `RideSpike.tsx` unless stated):

- A day: `active` and lit → a box `SQUARE` wide in its `heatLevels` tone, 0.05 + 0.06 per level tall, with a lighter inset decal on top; `active` and not yet lit, or `zero` → a dim flat square, no decal; `not-yet` → an `outline` box, 0.04 tall.
- "Lit" is `clamp((trainS + LIGHT_AHEAD - s) / 2.5)`, or 1 for every `active` day when `overview` is 1 (blend between the two by `overview`).
- Rail: ballast, sleepers every 0.7, two rails in pieces 0.72 long, each turned to the heading. With `overview > 0.5`: no sleepers, rails in pieces 4 long.
- A gate stands at `weekS(gate.col) - 0.8`: two posts on bases, a lit beam, a sign with `texts` on its `front` and `back`: the month's name, and `gate.line` under it when not null. A gate is left out when it is within 8 units along the rail of a plaza stop.
- Props (trees, bushes, rocks, lamps) are placed from `random(\`prop-${k}-${side}\`)`beyond the outermost row, left out within 8 units of a plaza stop and when`overview > 0.5`.
- A beacon (a thin lit post 3 units tall with a cap) stands on the first active day's square and on the busiest day's square when the city has them.

- [ ] **Step 1: Write the failing tests:**

```ts
test("a day that has not happened is an outline, a zero day is flat and dim", () => {
  // provisionalRecap: the box at a not-yet day's place has outline true; a zero day's box has no decals and height 0.04
});
test("days light only as the train nears", () => {
  // view.trainS = 30: an active day at s = 40 has a decal; one at s = 60 has none
});
test("the overview lights every day with data", () => {
  // overview: 1, trainS: 4 → every active day's box has a decal; no solid is a sleeper (count of soil-toned boxes is 0)
});
test("January's sign carries one line and May's two", () => {
  // the sign box nearest weekS(gate.col) - 0.8: texts on "back" → ["JAN"] and ["MAY", "<n> so far"]
});
test("a gate next to a plaza is left out", () => {
  /* a stop with plaza true 3 units from a gate → no sign with that month */
});
test("nothing is built outside the view", () => {
  /* every box's x is within [from - 2, to + 2] */
});
test("the land is the same for the same view", () => {
  /* deep equal on two calls */
});
test("an empty year builds without a beacon", () => {
  /* emptyRecap: no lit post */
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `land.ts`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the ride's squares, rail, month gates and props`.

---

### Task 9: Train and Cell

**Files:**

- Create: `train.ts`, `train.test.ts`, `cell.ts`, `cell.test.ts`

**Interfaces:**

- Consumes: track (Task 4), `Solid` (Task 2), palette.
- Produces:

```ts
// train.ts
export const CELL_SEAT = -0.35; // Cell's place along the engine, from the nose
export function train(s: number): Solid[]; // engine at s, two wagons behind, each on its own piece of rail
export function smoke(frame: number, trainAtFrame: (frame: number) => number): Solid[];

// cell.ts
export type Mood = "ride" | "idle" | "cheer";
/** Cell standing on `c`, facing `yaw`. `frame` drives the hop, blink, wave and crest. */
export function cell(c: V3, yaw: number, frame: number, mood: Mood): Solid[];
```

Rules (dimensions as in the spike's `cell()` and train block):

- Engine: chassis with a lighter stripe on its sides, boiler with a round yellow headlamp on its front, chimney with a cap, a low bunker (0.3 tall, so Cell shows from behind) with two tail lamps on its back, a front bumper, six wheels with hub decals. Two wagons with green cargo, a top inset and a dark band.
- Cell: two feet, a body with the face on `front` (two eyes with a glint, a mouth that is a thin bar, or open for `cheer`), a pack on its back with a green band, two arms, a crest of three cells in `GREENS[1..3]`.
- Every cycle divides 60 frames, so a rest loop has no jump: blink every 60 frames for 4 frames; `idle` hop period 30; crest bounce period 30; `ride` hop period 10 and wave period 30; `cheer` hop period 15. Smoke: a puff every 5 frames, living 35.

- [ ] **Step 1: Write the failing tests:**

```ts
test("Cell is the same 60 frames later in every mood", () => {
  for (const mood of ["ride", "idle", "cheer"] as const)
    expect(cell([0, 0, 0], 0, 17, mood)).toEqual(cell([0, 0, 0], 0, 77, mood));
});
test("Cell blinks: its eyes are a thin line for four frames in sixty", () => {
  // count frames 0..59 where the body's front decals have no white glint → 4
});
test("a cheer opens the mouth and raises both arms", () => {
  /* arm boxes' z higher than in idle; mouth decal taller */
});
test("Cell carries a pack on its back", () => {
  /* one box with a decal on "back" filled LIT */
});
test("the train has an engine and two wagons that follow the rail", () => {
  // wagon boxes' yaw equals heading at their own s, which differs from the engine's on a bend (s = 20)
});
test("smoke repeats every five frames while the train rests", () => {
  expect(smoke(100, () => 30)).toEqual(smoke(105, () => 30));
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the ride's train and a live Cell`.

---

### Task 10: Backdrop

**Files:**

- Create: `backdrop.ts`, `backdrop.test.ts`, `Backdrop.tsx`

**Interfaces:**

- Consumes: `projector`, `projectPoint` (Task 2), `City`.
- Produces:

```ts
// backdrop.ts
/** Screen y of the horizon: where the ground meets the sky straight ahead. Above the frame (negative) when the camera looks down. */
export function horizonY(cam: RideCamera, frame: Frame): number;
/** Screen x of a compass bearing (radians), or null when it is more than 77 degrees off the view's heading. */
export function bearingX(bearing: number, cam: RideCamera, frame: Frame): number | null;
export type Tower = { bearing: number; height: number }; // height as a share of the focal length
export function skyline(city: City): Tower[]; // 120 towers round the horizon, heights from weekly totals, 0.012 to 0.082

// Backdrop.tsx
export function Backdrop({
  cam,
  frame,
  city,
  frameIndex,
}: {
  cam: RideCamera;
  frame: Frame;
  city: City;
  frameIndex: number;
}): ReactNode;
```

`Backdrop` returns SVG elements for inside the scene's `<svg>`, in this order: the sky rectangle (`SKY`), 60 stars from seeded bearings and elevations that twinkle with the frame, a crescent moon (two circles), the skyline towers, the ground rectangle (`GROUND`) from the horizon down, and a thin haze band (`HAZE`) on the horizon line. Rectangles are oversized so the scene's roll never shows an edge.

- [ ] **Step 1: Write the failing tests:**

```ts
test("the horizon is at mid-height for a level camera and above the frame when it looks down", () => {
  expect(horizonY({ pos: [0, 0, 2], look: [10, 0, 2], fov: 50 }, f)).toBeCloseTo(f.height / 2);
  expect(horizonY({ pos: [0, 0, 12], look: [10, 0, 0], fov: 25 }, f)).toBeLessThan(0);
});
test("a bearing straight ahead is in the centre, one behind is not drawn", () => {
  expect(bearingX(0, { pos: [0, 0, 2], look: [10, 0, 2], fov: 50 }, f)).toBeCloseTo(f.width / 2);
  expect(bearingX(Math.PI, { pos: [0, 0, 2], look: [10, 0, 2], fov: 50 }, f)).toBeNull();
});
test("the skyline has 120 towers, taller where a week had more, and never zero in an empty year", () => {
  expect(skyline(buildCity(sampleRecap))).toHaveLength(120);
  for (const t of skyline(buildCity(emptyRecap))) expect(t.height).toBeCloseTo(0.012);
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `backdrop.ts` and `Backdrop.tsx`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): sky, horizon and ground for the ride`.

---

### Task 11: Stations

**Files:**

- Create: `stations/kit.ts`, `stations/kit.test.ts`, `stations/hello.ts`, `stations/city.ts`, `stations/languages.ts`, `stations/projects.ts`, `stations/closing.ts`, `stations/index.ts`, `stations/stations.test.ts`

**Interfaces:**

- Consumes: the models `helloModel`, `cityModel`, `gardenModel`, `projectsModel`, `closingModel` (read each `*.model.ts` for its fields); `languageIcon`, `languageInitials`; `repoLabel`; `staticFile` from `remotion`; `Solid`, `FaceText`, `Decal`; `inkOn`, `toneOf`; track; `RideStop`.
- Produces:

```ts
// stations/kit.ts
export type StationContext = {
  data: RecapData;
  city: City;
  stop: RideStop;
  /** The plaza's centre on the ground and the rail's heading there; for stops without a plaza, the train's place. */
  c: V3;
  yaw: number;
  build: number;      // buildProgress: 0 to 1
  frame: number;
};
export type Station = (ctx: StationContext) => Solid[];
/** A box that is part of a group sharing one pivot: dx forward, dy to the left of the group's centre. */
export function part(c: V3, yaw: number, dx: number, dy: number, z: number, size: V3, tone: Tone, extra?: Partial<Omit<Box, "kind" | "at" | "size" | "tone" | "yaw" | "pivot">>): Box;
/** The paved slab with its green rim, four bollards with lamps, and a step toward the rail. */
export function plaza(ctx: StationContext): Solid[];
/** A board on two posts across the direction of travel, `lines` printed on its front and back; the first line is the smaller one. */
export function board(c: V3, yaw: number, dx: number, dy: number, wide: number, lines: readonly string[]): Solid[];
/** `text` cut to `max` characters with a trailing "…" when longer. */
export function clip(text: string, max: number): string;

// stations/index.ts
export const STATIONS: Partial<Record<StopKind, Station>>;   // the five kinds of this phase
```

What each station builds (print exactly the model's strings; never rebuild a sentence from numbers):

| Stop      | Solids                                                                                                                                                                                                                                                                            | Printed                                                                                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hello     | a board behind the train at the first platform; a second board when `scopeLine` is set                                                                                                                                                                                            | first board: `String(year)`, `@${login}`; second: `scopeLine`                                                                                                                                                                                                                          |
| city      | one billboard beside the rail at the train's place, 24 wide, on four posts                                                                                                                                                                                                        | `headline` (the total's line) large, `caption` under it, `legend` as a third line when not null                                                                                                                                                                                        |
| languages | `plaza`; a plinth and a block per tree (all of `gardenModel().trees`, up to 5), height `3.0 + share * 4.6`, in the tree's colour, dropping in with a spring from `build`, tallest in the middle; confetti balls from the tallest block for a moment as `build` reaches 1; a board | each block, on all four sides, from the top: the logo (`languageIcon`, else a dark badge decal with `languageInitials` printed on it), the tree's `label` in large type, its `name` (clipped to 12); text in `inkOn(color)`. Board: "Top languages", `title`, and `otherNote` when set |
| projects  | `plaza`; a base and a tower of crates per stack (all of `projectsModel().stacks`), each crate with the frame decals, dropping one after another from `build`; a plaque in front of each tower; a board                                                                            | plaque: the stack's `label` (clipped to 16), and its commits with `commitsText`; the count rises with `build` and is exact at 1. Board: "Repositories", `title`, then `subtitle` and `legend` joined by " · " when set                                                                 |
| closing   | buffers across the end of the rail (a beam on two dark posts with yellow lamp caps; no new colour); a large board; fireworks of small balls that loop every 60 frames                                                                                                             | board: the model's `lines`, one per row, the first largest                                                                                                                                                                                                                             |

Empty and unavailable states (Review Focus 1 and 2):

- `gardenModel().empty`: no blocks; the plinths stand covered by a dark dust-sheet box each, and the board prints the model's `title` and `caption` (they already say there is nothing yet).
- `projectsModel().empty`: no crates; the bases stand with a closed shutter decal, and the board prints the model's `title`.
- Fewer than three trees or stacks: only that many plinths; the group stays centred on the plaza.

- [ ] **Step 1: Write the failing tests** (`ctx(kind, data, build)` is a local helper that builds a context from `rideStops` and `stationPlace`):

```ts
// kit.test.ts
test("clip keeps short names and cuts long ones with an ellipsis", () => {
  expect(clip("trailmix", 16)).toBe("trailmix");
  expect(clip("an-extremely-long-repository", 16)).toBe("an-extremely-lo…");
});
test("a board prints its lines on both faces", () => {
  const texts = board([0, 0, 0], 0, 0, 0, 4, ["Top languages", "Mostly TypeScript"]).flatMap((s) =>
    s.kind === "box" ? (s.texts ?? []) : [],
  );
  expect(texts.filter((t) => t.on === "front").map((t) => t.text)).toEqual([
    "Top languages",
    "Mostly TypeScript",
  ]);
  expect(texts.filter((t) => t.on === "back").map((t) => t.text)).toEqual([
    "Top languages",
    "Mostly TypeScript",
  ]);
});

// stations.test.ts
const printed = (solids: Solid[]) =>
  solids.flatMap((s) => (s.kind === "box" ? (s.texts ?? []).map((t) => t.text) : []));

test("languages: every tree's label and name are printed, in the model's words", () => {
  const model = gardenModel(sampleRecap);
  const text = printed(STATIONS.languages!(ctx("languages", sampleRecap, 1)));
  for (const t of model.trees) {
    expect(text).toContain(t.label);
    expect(text).toContain(clip(t.name, 12));
  }
  expect(text).toContain(model.title);
});
test("languages: a block is as tall as its share says, at rest", () => {
  // the box with texts containing trees[0].label has size[2] === 3.0 + trees[0].share * 4.6
});
test("languages: text is dark on a light block and white on a dark one", () => {
  // JavaScript (#f1e05a) → "#0d1117"; TypeScript (#3178c6) → "#ffffff"
});
test("languages: one language builds one block, none builds none and says so", () => {
  // edge-one-language → one block with a label; emptyRecap → no label printed, board carries gardenModel(emptyRecap).title
});
test("projects: every stack's label and exact commits are printed at rest, and count up before", () => {
  const model = projectsModel(sampleRecap);
  const rest = printed(STATIONS.projects!(ctx("projects", sampleRecap, 1)));
  for (const s of model.stacks) {
    expect(rest).toContain(clip(s.label, 16));
    expect(rest).toContain(commitsText(s.commits));
  }
  expect(printed(STATIONS.projects!(ctx("projects", sampleRecap, 0.3)))).not.toContain(
    commitsText(model.stacks[0]!.commits),
  );
});
test("projects: a tower has as many crates as the model says", () => {
  /* count wood boxes per dx === stacks[i].crates */
});
test("projects: long names are cut, an empty shelf says so", () => {
  // busyRecap → every printed label has length <= 16; emptyRecap → board carries projectsModel(emptyRecap).title, no crate
});
test("hello prints the year and the login", () => {
  const text = printed(STATIONS.hello!(ctx("hello", sampleRecap, 1)));
  expect(text).toContain("2026");
  expect(text).toContain(`@${sampleRecap.profile.login}`);
});
test("city prints the model's headline and caption", () => {
  /* cityModel(sampleRecap).headline and .caption are in printed(...) */
});
test("closing prints every line of the model", () => {
  /* closingModel(...).lines ⊆ printed(...) */
});
test("no station names a private repository the data hides", () => {
  // withoutPrivateNames(sampleRecap) from @wyg/analytics → printed(projects) equals the model's labels, which are already anonymised
});
test("a station at rest is the same 60 frames later", () => {
  // for each kind: STATIONS[kind](ctx at frame 10, build 1) deep-equals the same at frame 70
});
```

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `kit.ts`, the five stations and `index.ts`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(video): the first five stations of the ride`.

---

### Task 12: The model and the composition

**Files:**

- Create: `model.ts`, `model.test.ts`, `RideStory.tsx`, `RideStory.test.tsx`
- Modify: `packages/video/src/Root.tsx`, `packages/video/src/index.ts`, `packages/video/package.json` (`"./ride": "./src/world/ride/model.ts"`)

**Interfaces:**

- Consumes: everything above; `Chrome` from `../Chrome`; `reachedStop` from `../fade`; `fontFamily` from `../../theme`; `paginateLetter`, `congratsLetter` as `world/model.ts` uses them.
- Produces:

```ts
// model.ts
export type RideModel = { city: City; stops: RideStop[]; timeline: RideTimeline; gates: Gate[] };
export type RideOptions = { letter?: boolean };
export function buildRide(
  data: RecapData,
  format: Frame,
  mode: WorldMode,
  fps: number,
  options?: RideOptions,
): RideModel;
export function rideDuration(
  data: RecapData,
  format: Frame,
  mode: WorldMode,
  options?: RideOptions,
): number;
/** Everything on screen at a frame, pure: what RideStory draws and what the tests read. */
export function rideFrame(
  model: RideModel,
  data: RecapData,
  frameIndex: number,
  format: Frame,
  fps: number,
): {
  cam: RideCamera;
  roll: number;
  fog: Fog;
  ground: Solid[];
  objects: Solid[];
};

// RideStory.tsx
export type RideStoryProps = {
  data: RecapData;
  mode: WorldMode;
  music?: boolean;
  letter?: boolean;
};
export function RideStory(props: RideStoryProps): ReactNode;
```

Rules:

- `rideFrame` assembles: `land` for a view from 26 units behind the train to 56 ahead (the whole rail while the city shot is more than half pulled out, with `overview` rising as it pulls out); `train`, `smoke`, `cell`; every station whose place is inside the view, with `build = buildProgress(i, frame, …)`.
- Cell's mood: `cheer` for the last second of the move into a plaza stop and the first second after it, `ride` while the train moves, else `idle`. At a plaza stop Cell turns to face the camera over the last 20 frames of the move.
- Fog: `color: HAZE`, `near: max(20, radius * 1.5)`, `far: near + 30`, from the camera's distance to its look point.
- `RideStory`: an `AbsoluteFill` in `SKY` with the font family; one wrapper `div` with `transform: rotate(<roll>deg) scale(1.1)`; inside it one `<svg>` holding `Backdrop`, then `RideScene` for the ground primitives, then `RideScene` for the object primitives; then `Chrome` with `darkness={{ top: 1, bottom: 1 }}`. Language logos used on the podium are also mounted once as hidden Remotion `<Img>` elements so a render waits for them. No audio in this phase (`music` is accepted and ignored until phase 3).
- `Root.tsx` registers `ride-9x16`, `ride-4x5`, `ride-1x1`, `ride-16x9` like the `world-*` compositions, with `calculateMetadata` from `rideDuration`. `index.ts` exports `RideStory` and `RideStoryProps`.

- [ ] **Step 1: Write the failing tests:**

```ts
// model.test.ts
test("the same frame gives the same picture whatever was computed before it", () => {
  const m = buildRide(sampleRecap, f, "video", 30);
  const alone = rideFrame(m, sampleRecap, 400, f, 30);
  rideFrame(m, sampleRecap, 12, f, 30);
  rideFrame(m, sampleRecap, 900, f, 30);
  expect(rideFrame(m, sampleRecap, 400, f, 30)).toEqual(alone);
});
test("a rest loop ends where it began", () => {
  const m = buildRide(sampleRecap, f, "interactive", 30);
  for (const stop of m.timeline.stopFrames)
    expect(rideFrame(m, sampleRecap, stop + m.timeline.restFrames, f, 30)).toEqual(
      rideFrame(m, sampleRecap, stop, f, 30),
    );
});
test("every station has finished building on its stop's frame", () => {
  // for languages and projects: printed texts at stopFrames[i] equal printed texts 30 frames later
});
test("the ride builds for every fixture and format", () => {
  for (const data of [sampleRecap, emptyRecap, busyRecap, provisionalRecap])
    for (const format of Object.values(VIDEO_FORMATS)) {
      const m = buildRide(data, format, "video", 30);
      expect(rideDuration(data, format, "video")).toBe(m.timeline.durationInFrames);
      expect(() => rideFrame(m, data, m.timeline.stopFrames.at(-1) ?? 0, format, 30)).not.toThrow();
    }
});
test("a frame stays inside the polygon budget", () => {
  // scenePrims(ground + objects) at every stop frame and at the middle of every move, 16:9: fewer than 4000 primitives
});

// RideStory.test.tsx
test("draws one svg with the chrome after it and no overlay text outside the svg", () => {
  // render with remotion's test wrapper or renderToStaticMarkup under a mocked frame of stopFrames[2]:
  // the markup has exactly one <svg>; the only text outside it is the copyright line
});
```

If rendering `RideStory` under `bun test` needs Remotion context that is awkward to mock, keep the composition thin and assert the same thing on `rideFrame` plus a still (Step 5); say so in the commit body.

- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `model.ts`, `RideStory.tsx`, the registrations and exports.
- [ ] **Step 4:** Run `bun run typecheck && bun test`. Expected: PASS.
- [ ] **Step 5:** Render one still to see it: `REMOTION_BROWSER_EXECUTABLE=<the headless shell under packages/video/node_modules/.remotion> bunx remotion still packages/video/src/remotion-entry.ts ride-16x9 /tmp/ride.png --frame=<a stop frame>`. Expected: a picture like the spike's frame 290, with no card over it.
- [ ] **Step 6:** Commit: `feat(video): RideStory, the ride as a second composition`.

---

### Task 13: Stills script and the printed-size check

**Files:**

- Create: `scripts/ride-stills.ts`, `packages/video/src/world/ride/readable.test.ts`

**Interfaces:**

- Consumes: `buildRide`, `rideFrame` (Task 12), `scenePrims` and the text primitive's `capHeightPx` (Task 2), `renderSceneStill` from `scripts/lib/still.ts`.
- Produces: `bun scripts/ride-stills.ts <kind> [outDir] [--fixture <name>] [--format <id>] [--offset <frames>]`, with the same fixtures and defaults as `scripts/world-stills.ts`, rendering `ride-<format>`.

- [ ] **Step 1: Write the failing test** `readable.test.ts`:

```ts
const HEADLINE = 0.04,
  NAME = 0.022;
test("printed values and names are big enough at every stop, in every format", () => {
  for (const [id, format] of Object.entries(VIDEO_FORMATS)) {
    const m = buildRide(sampleRecap, format, "video", 30);
    const short = Math.min(format.width, format.height);
    m.stops.forEach((stop, i) => {
      if (stop.kind !== "languages" && stop.kind !== "projects") return;
      const at = rideFrame(m, sampleRecap, m.timeline.stopFrames[i] ?? 0, format, 30);
      const texts = scenePrims([...at.ground, ...at.objects], at.cam, format, at.fog).filter(
        (p) => p.kind === "text",
      );
      const values = texts.filter((p) => /^\d/.test(p.text)); // "42%", "312 commits"
      const biggest = Math.max(...values.map((p) => p.capHeightPx));
      expect({ id, stop: stop.kind, biggest: biggest / short >= HEADLINE }).toEqual({
        id,
        stop: stop.kind,
        biggest: true,
      });
      // every language or repository name: its largest drawn copy is at least NAME of the shorter side
    });
  }
});
test("the same holds with five languages and long repository names", () => {
  /* busyRecap */
});
```

The check takes, for each printed string, the largest copy drawn (a block prints on four sides; the faces toward the camera are the ones that count).

- [ ] **Step 2:** Run. Expected: FAIL where a format's lens or a station's layout is too small.
- [ ] **Step 3:** Fix what fails, in the spec's order: bring the camera closer or lengthen the lens for that layout family (`camera.ts`); lay the hero out in two rows; print only on the faces toward the camera. Cell must stay in frame (assert `projectPoint` of Cell's place is inside the frame at each plaza stop).
- [ ] **Step 4:** Run `bun test`. Expected: PASS.
- [ ] **Step 5:** Write `scripts/ride-stills.ts` and render `languages` and `projects` in the three default formats for `sample`, `edge-long-names` and `edge-empty`. Look at them: no text hidden behind another object, no hero cut off.
- [ ] **Step 6:** Commit: `test(video): printed sizes hold in every format; stills script for the ride`.

---

### Task 14: The gate

A development-only page that plays `RideStory` and renders it through the same browser renderer the product uses, so the gate is measured, not guessed.

**Files:**

- Create: `apps/web/src/app/recap/ride/page.tsx`, `apps/web/src/app/recap/ride/ride-gate.tsx`
- Modify: `apps/web/src/app/recap/exports.ts` only if a composition type must widen; prefer calling `renderMediaOnWeb` directly in `ride-gate.tsx`

Read `apps/web/AGENTS.md` and the Next.js 16 docs under `node_modules/next/dist/docs/` before writing the page.

- [ ] **Step 1:** `page.tsx`: a server component that calls `notFound()` unless `process.env.NODE_ENV === "development"`, then renders `<RideGate />`. It is not linked from anywhere and has `robots: { index: false }`.
- [ ] **Step 2:** `ride-gate.tsx` (client): a format `<select>` with a visible `<label>`, a `@remotion/player` `Player` of `RideStory` with `sampleRecap` in `video` mode, and two real `<button>`s, "Render ride MP4" and "Render today's story MP4". Each renders with `renderMediaOnWeb` (`h264`, `aac`, `licenseKey: "free-license"`, as `exports.ts` does), shows progress as text, and when done prints the seconds it took and a download link. Buttons are disabled while a render runs, with `cursor: not-allowed`; the result line is in an `aria-live="polite"` region. Use the page's existing tokens; this page ships to no user, so it needs no design beyond being usable (antislop R-26, R-32, R-39 still hold).
- [ ] **Step 3:** Run `bun run dev`, open `http://localhost:3000/recap/ride`, and for each of the four formats: play the ride to the end, then render today's story, then the ride, in a visible tab on the same machine. Check the console for errors.
- [ ] **Step 4:** Compare each ride MP4 with the Player at three points (a ride shot, the languages stop, the projects stop): printed text, logos and the frame's roll must look the same in both.
- [ ] **Step 5:** Write the results into the pull request's description as a table: format, today's seconds, the ride's seconds, the ratio, and "same as Player: yes/no". **The gate passes when every format renders, matches, and has a ratio of 1.5 or less.**
- [ ] **Step 6:** If the gate fails: stop. Do not start phase 2. Bring the table, and the largest contributors to a frame's primitive count, to the maintainer.
- [ ] **Step 7:** Run `bun run typecheck && bun test && bun run lint`. Commit: `feat(web): development page to measure the ride's browser render`.
- [ ] **Step 8:** On the maintainer's word: push, open the PR ("feat: story ride, phase 1: engine and proof", `Closes #<issue>`, the gate table, how to test), and post the self-review comment with what was run.

---

## Self-review notes

- **Spec coverage.** Track, squares, gates with totals, ground and sky, train and Cell, the four shots and hello's and the city's own shots, printed text with minimum sizes, even stations on alternating sides, rest loops and "everything builds on the way in", the provisional year, the gate: each has a task. Left for later phases on purpose: the other nine stations, beacons' use at first-day and busiest stations (the beacons themselves are in Task 8), the letter's sheet, sound, the player's resting clock, exports, removals, ADR-0023.
- **Not in this phase's tests:** leaving a rest loop on a tap (phase 3, with the player), and reduced motion (unchanged until phase 3).
