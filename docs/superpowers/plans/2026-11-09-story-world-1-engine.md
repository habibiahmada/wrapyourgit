# Story world, phase 1: world engine and player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable, data-driven world: the contribution city, every stop of the story in order, a camera that pans and zooms between them, the full-screen tap player (forward and reverse) with sound, behind a development-only route. Chapter scenes are placeholders until phase 2.

**Architecture:** Pure, tested modules in `packages/video/src/world/` turn `RecapData` into a city, a list of stops, a frame timeline and a camera at any frame. One Remotion composition, `WorldStory`, draws the city and the stop layers from that camera. The web player in `apps/web/src/app/recap/world/` drives a `@remotion/player` forward with `play()` and backward by seeking frame by frame, and plays music and effects with Web Audio.

**Tech Stack:** Remotion 4.0.540 (`remotion`, `@remotion/player`), React 19, Next.js 16, Bun test, Web Audio.

**Spec:** `docs/superpowers/specs/2026-11-06-story-world-design.md` (approved 2026-11-09).

## Phases

This plan is phase 1 of 4. Each phase ships working, tested software; users keep the current story until phase 4 switches over.

1. **World engine and player** (this plan): city, stops, timeline, camera, `WorldStory`, transition sounds, the full-screen player at `/recap/world` (development only).
2. **Chapter scenes:** the scene drawn inside each stop (Hello head with face screen, busiest-day flag, language garden, night sky, a new Rhythm picture, Projects, Engineering, Archetype, comparison, letter pages with the page-turn, closing) and the "not yet" plots. Each scene gets a mockup the maintainer approves before it is built.
3. **Exports in the browser:** `@remotion/web-renderer`, MP4 with 3 s holds, stop PNGs, ZIP and PDF assembled client-side, the "Keep your year" screen, the dashboard's "Download your story", the WebCodecs fallback, the ADR superseding ADR-0004 and ADR-0011, removal of the slide worker, the slide routes and `SLIDE_EXPORTS`. Audio moves from `Html5Audio` to `<Audio>` from `@remotion/media`, which the web renderer requires.
4. **Private names, public page and switch-over:** the "Show your private repository names?" choice (stored per user, editable in Settings), the ADR amending AGENTS.md rule 6, the `/u/<login>` card and player (public projection, no letter pages), `/recap` switched to the world player, the old `WrapStory`, `StoryFlow` and their scenes removed.

## Global Constraints

- AGENTS.md rules 1-8. Inside `WorldStory` and everything it renders, animate only from `useCurrentFrame()`, `interpolate`, `spring` and seeded `random`: no CSS transitions, timers, `Date.now()` or `Math.random()`.
- Branch on layout family (`useLayout()` → `portrait | compact | landscape`), size from `width`/`height` of `useVideoConfig()`, never fixed pixels.
- Formats from `VIDEO_FORMATS` (9:16, 4:5, 1:1, 16:9) at `VIDEO_FPS` (30).
- Build only with what `@remotion/web-renderer` can draw, so phase 3 needs no rewrite: no `z-index` (order layers in the DOM, back to front), no 3D CSS transforms, no SVG `url()` clip paths or filters, no `object-position`, no CSS filters.
- Every stop is a picture never shown at another stop (spec goal 2).
- A plot with zero contributions and a day that hasn't happened yet must never look alike (rule 2).
- Player UI: WCAG 2.2 AA, antislop R-39 to R-41 (real buttons with accessible names, `cursor: pointer`, visible focus, no console errors), `prefers-reduced-motion` respected.
- `/recap/world` answers 404 in production until phase 4.
- Commit messages: Conventional Commits, English, no AI attribution. Work on a branch from an issue (AGENTS.md "Git workflow").

## Review Focus

- A year with zero contributions: no busiest day, so no busiest stop; the city is all flat plots; no division by zero in heights. (Task 1 and Task 2 tests.)
- A provisional recap in a leap year or with `periodEnd` early in January: "not yet" plots fill the rest of the year and the closing stop sits on `periodEnd`. (Task 1 test with a 2028 fixture date range.)
- Two stops that would land on the same plot (busiest day on Jan 1, or first active day equal to busiest day): every stop still gets its own plot. (Task 2 test.)
- Tapping repeatedly during a move: the player never skips a stop silently or runs two moves at once; a tap during a move finishes the current move first and queues at most one more. (Task 6 test.)
- Going back from the first stop, or forward from the last: nothing moves, no sound. (Task 6 test.)

---

### Task 1: The city model

**Files:**

- Create: `packages/video/src/world/city.ts`
- Test: `packages/video/src/world/city.test.ts`

**Interfaces:**

- Produces:
  - `type PlotState = "active" | "zero" | "not-yet"`
  - `type Plot = { index: number; date: string; col: number; row: number; count: number; state: PlotState }`
  - `type City = { plots: Plot[]; maxCount: number; busiestIndex: number | null; firstActiveIndex: number | null; lastDataIndex: number }`
  - `buildCity(data: RecapData): City`
  - `isoPoint(col: number, row: number): { x: number; y: number }` with `TILE_W = 1`, `TILE_H = 0.5`: `x = (col - row) * TILE_W`, `y = (col + row) * TILE_H`
  - `plotHeight(plot: Plot, maxCount: number): number` (world units)
  - `cityBounds(city: City): { minX: number; maxX: number; minY: number; maxY: number }`, including building heights

- [ ] **Step 1: Write the failing tests**

```ts
// city.test.ts — use sampleRecap from ../fixtures/sample-recap, overriding fields per test
test("one plot per day of the edition year, Jan 1 first", () => {
  const city = buildCity(sampleRecap); // year 2026
  expect(city.plots).toHaveLength(365);
  expect(city.plots[0]?.date).toBe("2026-01-01");
  expect(city.plots[364]?.date).toBe("2026-12-31");
});
test("weeks are columns and weekdays rows, like the GitHub graph", () => {
  const city = buildCity(sampleRecap);
  expect(city.plots[0]).toMatchObject({ col: 0, row: 4 }); // 2026-01-01 is a Thursday
  expect(city.plots[3]).toMatchObject({ col: 1, row: 0 }); // Sunday Jan 4
});
test("days after periodEnd are not-yet while the recap is provisional, zero days stay zero", () => {
  const data = withMeta(sampleRecap, { periodEnd: "2026-11-09", isFinal: false });
  const city = buildCity(data);
  expect(city.plots.find((p) => p.date === "2026-11-10")?.state).toBe("not-yet");
  expect(city.plots.filter((p) => p.state === "zero").every((p) => p.date <= "2026-11-09")).toBe(
    true,
  );
  expect(city.lastDataIndex).toBe(city.plots.findIndex((p) => p.date === "2026-11-09"));
});
test("a final recap has no not-yet plots and ends on Dec 31", () => {
  const city = buildCity(withMeta(sampleRecap, { periodEnd: "2026-12-31", isFinal: true }));
  expect(city.plots.some((p) => p.state === "not-yet")).toBe(false);
  expect(city.lastDataIndex).toBe(364);
});
test("leap year 2028 has 366 plots", () => {
  expect(buildCity(withYear(sampleRecap, 2028)).plots).toHaveLength(366);
});
test("busiest is the highest count, earliest on a tie; tallest building", () => {
  const city = buildCity(
    withCalendar(sampleRecap, { "2026-03-12": 38, "2026-07-01": 38, "2026-02-02": 5 }),
  );
  expect(city.plots[city.busiestIndex ?? -1]?.date).toBe("2026-03-12");
  const tallest = Math.max(...city.plots.map((p) => plotHeight(p, city.maxCount)));
  expect(plotHeight(city.plots[city.busiestIndex ?? 0] as Plot, city.maxCount)).toBe(tallest);
});
test("an empty year: no busiest, no first active day, all heights finite", () => {
  const city = buildCity(withCalendar(sampleRecap, {}));
  expect(city.busiestIndex).toBeNull();
  expect(city.firstActiveIndex).toBeNull();
  expect(city.plots.every((p) => Number.isFinite(plotHeight(p, city.maxCount)))).toBe(true);
});
```

`withMeta`, `withYear` and `withCalendar` are small helpers in the test file: they return a copy of `sampleRecap` with `meta` fields replaced, with `meta.year`/`periodStart`/`periodEnd` moved to that year, or with `contributions.calendar` rebuilt from a `{ date: count }` map (missing days count 0).

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/video/src/world/city.test.ts`
Expected: FAIL, `buildCity` not found.

- [ ] **Step 3: Implement `city.ts`**

Dates are plain `YYYY-MM-DD` strings computed in UTC (no timezone shifts). A day after `periodEnd` is `not-yet` only when `meta.isFinal` is false. Heights: `zero` and `not-yet` are 0.12; `active` is `0.4 + 7.6 * count / maxCount` (so the busiest is 8 world units). `maxCount` is 0 for an empty year, and heights must not divide by it then.

- [ ] **Step 4: Run to verify it passes**

Run: `bun test packages/video/src/world/city.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/video/src/world/city.ts packages/video/src/world/city.test.ts
git commit -m "feat(video): model the year as a city of daily plots"
```

### Task 2: The stops and the day each lives in

**Files:**

- Create: `packages/video/src/world/stops.ts`
- Test: `packages/video/src/world/stops.test.ts`

**Interfaces:**

- Consumes: `City`, `Plot` from Task 1.
- Produces:
  - `type StopKind = "hello" | "first-day" | "private" | "city" | "busiest" | "rhythm" | "languages" | "projects" | "community" | "engineering" | "archetype" | "versus" | "letter" | "closing"`
  - `type Stop = { id: string; kind: StopKind; plot: number | null; page?: number }` (`plot` is a plot index; `null` only for `city`; `page` is 1-based, letter only)
  - `buildStops(data: RecapData, city: City, options?: { letterPages?: number }): Stop[]` (`letterPages` defaults to 1; phase 2 passes the real count)

Stop order: `hello`, `first-day`, `private`, `city`, `busiest` (only when `city.busiestIndex` is not null), `rhythm`, `languages`, `projects`, `community`, `engineering`, `archetype`, `versus`, `letter` × `letterPages` (ids `letter-1`, `letter-2`, …), `closing`. The closing stop is last, not before `versus` as the spec's list reads: it lives on the last day with data, and putting it last keeps the camera from flying back in time after the year has ended. Flag this to the maintainer at handoff.

Plots:

- Natural dates: `hello` → plot 0 (Jan 1), `first-day` → `city.firstActiveIndex`, `busiest` → `city.busiestIndex`, `closing` → `city.lastDataIndex`.
- Every other stop gets a fixed plot, spread evenly in stop order from plot 7 to `lastDataIndex - 7` (or the nearest valid range in a short provisional year), moved forward to the next plot no other stop uses.
- `first-day` with no active day falls back to a fixed plot like the others.

- [ ] **Step 1: Write the failing tests**

```ts
test("stops come in story order, letter pages expanded", () => {
  const city = buildCity(sampleRecap);
  const ids = buildStops(sampleRecap, city, { letterPages: 2 }).map((s) => s.id);
  expect(ids).toEqual([
    "hello",
    "first-day",
    "private",
    "city",
    "busiest",
    "rhythm",
    "languages",
    "projects",
    "community",
    "engineering",
    "archetype",
    "versus",
    "letter-1",
    "letter-2",
    "closing",
  ]);
});
test("natural dates: hello Jan 1, busiest on the busiest plot, closing on the last day with data", () => {
  /* assert plots */
});
test("every stop but the city has its own plot", () => {
  const stops = buildStops(sampleRecap, buildCity(sampleRecap));
  const plots = stops.flatMap((s) => (s.plot === null ? [] : [s.plot]));
  expect(new Set(plots).size).toBe(plots.length);
});
test("fixed-plot stops move forward through the year", () => {
  /* plots of fixed stops strictly increasing */
});
test("collisions: busiest on Jan 1 and first day equal to busiest still give distinct plots", () => {
  /* withCalendar({"2026-01-01": 9}) */
});
test("an empty year has no busiest stop", () => {
  /* ids exclude "busiest" */
});
test("a provisional year ending 2026-01-20 still fits every stop before the closing plot", () => {
  /* all plots <= lastDataIndex */
});
```

Put the fixture helpers from Task 1 in `packages/video/src/world/test-fixtures.ts` and import them from both test files.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/video/src/world/stops.test.ts`
Expected: FAIL, `buildStops` not found.

- [ ] **Step 3: Implement `buildStops` in `stops.ts`**

- [ ] **Step 4: Run to verify it passes**

Run: `bun test packages/video/src/world`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/video/src/world/stops.ts packages/video/src/world/stops.test.ts packages/video/src/world/test-fixtures.ts packages/video/src/world/city.test.ts
git commit -m "feat(video): place every story stop on a day of the city"
```

### Task 3: Timeline and camera

**Files:**

- Create: `packages/video/src/world/timeline.ts`, `packages/video/src/world/camera.ts`
- Test: `packages/video/src/world/timeline.test.ts`, `packages/video/src/world/camera.test.ts`

**Interfaces:**

- Consumes: `City`, `isoPoint`, `cityBounds`, `plotHeight` (Task 1); `Stop` (Task 2); `LayoutFamily` from `@wyg/schema`.
- Produces:
  - `type Camera = { x: number; y: number; span: number }` — centre in world units, and `span` = world units across the frame's shorter side
  - `stopCamera(stop: Stop, city: City, frame: { width: number; height: number }): Camera` — a plot stop centres on the top of that plot's building with `span = PLOT_SPAN` (2.4); the city stop centres on `cityBounds` and fits it with a 10% margin
  - `type WorldMode = "interactive" | "video"`
  - `type Timeline = { stopFrames: number[]; moveFrames: number[]; durationInFrames: number }` — `stopFrames[i]` is the frame where the camera rests on stop `i`; `moveFrames[i]` is the length of the move from stop `i - 1` to `i` (`moveFrames[0] = 0`)
  - `buildTimeline(cameras: Camera[], mode: WorldMode, fps: number): Timeline`
  - `cameraAt(frame: number, cameras: Camera[], timeline: Timeline): Camera`
  - `MOVE_MIN_SECONDS = 1.1`, `MOVE_MAX_SECONDS = 2`, `HOLD_SECONDS = 3`

Timeline rules:

- A move lasts between `MOVE_MIN_SECONDS` and `MOVE_MAX_SECONDS`, longer for a bigger change of position or zoom: `1.1 + 0.9 * min(1, (centreDistance / max(spanA, spanB) + |ln(spanB / spanA)|) / 6)` seconds, rounded to whole frames.
- `interactive`: stop 0 rests on frame 0; each stop rests on the last frame of its move; `durationInFrames = stopFrames.at(-1) + 1`.
- `video`: each stop also holds for `HOLD_SECONDS` before the next move starts, and the last stop holds too.

Camera rules inside a move from A to B with eased progress `e = easeInOutCubic(t)`:

- The centre moves linearly with `e`.
- `ln(span)` moves linearly with `e`, so zooming in and out feel alike.
- When both ends are close-ups (`span <= 2 * PLOT_SPAN`) and the centres are more than `4 * PLOT_SPAN` apart, `ln(span)` rises by `1.2 * sin(π e)` mid-flight (the zoom-out hop).

- [ ] **Step 1: Write the failing tests**

```ts
test("the camera rests exactly on each stop's frame", () => {
  /* cameraAt(stopFrames[i]) deep-equals cameras[i] */
});
test("moves last between 1.1 s and 2 s at 30 fps", () => {
  /* every moveFrames[i>0] in [33, 60] */
});
test("video mode holds each stop for 3 s, interactive mode does not", () => {
  // same cameras: video durationInFrames === interactive durationInFrames + 90 * cameras.length
});
test("zoom is log-linear: halfway between span 1 and span 4 is span 2 when there is no hop", () => {
  /* at e = 0.5 */
});
test("a long hop between two close-ups zooms out mid-flight and lands back in", () => {
  /* max span along the move > both ends */
});
test("the city stop frames the whole city in every format", () => {
  // for each VIDEO_FORMATS entry: every plot corner projected through stopCamera(city) lies inside the frame
});
test("cameraAt is deterministic and clamps outside the timeline", () => {
  /* frame -5 → first camera, frame 1e6 → last */
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test packages/video/src/world/timeline.test.ts packages/video/src/world/camera.test.ts`
Expected: FAIL, functions not found.

- [ ] **Step 3: Implement `timeline.ts` and `camera.ts`**

- [ ] **Step 4: Run to verify they pass**

Run: `bun test packages/video/src/world`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/video/src/world/timeline.ts packages/video/src/world/camera.ts packages/video/src/world/timeline.test.ts packages/video/src/world/camera.test.ts
git commit -m "feat(video): time the camera's moves between stops"
```

### Task 4: Tap and transition sounds

**Files:**

- Modify: `packages/video/src/audio/sfx.ts` (add entries), `scripts/synth-sfx.ts` (add voices)
- Create: `packages/video/src/world/sound.ts`
- Test: `packages/video/src/world/sound.test.ts`; extend `packages/video/src/audio/sfx.test.ts` only if it enumerates names
- Generated: `packages/video/public/audio/sfx/{tap,wind,leaves,crickets,dive}.wav`

**Interfaces:**

- Consumes: `StopKind` (Task 2), `SFX`, `SfxName` (existing).
- Produces:
  - New `SfxName`s with `SFX` entries: `tap` (volume 0.35, 0.06 s, a soft click), `wind` (0.4, 1.6 s, low-passed noise swelling and fading), `leaves` (0.35, 1.4 s, band-passed rustle bursts), `crickets` (0.3, 1.6 s, chirps near 4.5 kHz in pairs), `dive` (0.45, 1.2 s, muffled whoosh falling in cutoff)
  - `transitionSound(to: StopKind): SfxName` — `languages` → `leaves`; `community` → `crickets`; `city` and `closing` → `wind`; every stop on a plot → `dive` unless listed; reverse moves use the sound of the stop they arrive at
  - `TAP_SOUND: SfxName = "tap"`

- [ ] **Step 1: Write the failing test**

```ts
test("every stop kind has a transition sound with a file", () => {
  for (const kind of STOP_KINDS) {
    const name = transitionSound(kind);
    expect(existsSync(join(PUBLIC, sfxFile(name)))).toBe(true);
    expect(SFX[name].seconds).toBeLessThanOrEqual(2); // never longer than the longest move
  }
});
test("the garden rustles, the sky chirps, the city blows", () => {
  expect(transitionSound("languages")).toBe("leaves");
  expect(transitionSound("community")).toBe("crickets");
  expect(transitionSound("city")).toBe("wind");
});
```

Export `STOP_KINDS` (the list of `StopKind` values) from `stops.ts` for this test.

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/video/src/world/sound.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the `SFX` entries and voices, then generate**

Run: `bun scripts/synth-sfx.ts`
Expected: five new WAV files in `packages/video/public/audio/sfx/`, each at the length in `SFX`, peak −3 dBFS like the others. Listen to each once in the browser before committing; a sound that clips or is louder than `whoosh` is a fail.

- [ ] **Step 4: Implement `sound.ts`, run the tests**

Run: `bun test packages/video/src`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/video/src/audio/sfx.ts scripts/synth-sfx.ts packages/video/src/world/sound.ts packages/video/src/world/sound.test.ts packages/video/src/world/stops.ts packages/video/public/audio/sfx
git commit -m "feat(video): tap and transition sounds for the world"
```

### Task 5: The `WorldStory` composition

**Files:**

- Create: `packages/video/src/world/WorldStory.tsx`, `packages/video/src/world/CityLayer.tsx`, `packages/video/src/world/StopLayer.tsx`, `packages/video/src/world/Chrome.tsx`, `packages/video/src/world/model.ts`
- Modify: `packages/video/src/Root.tsx` (register `world-<format>` compositions), `packages/video/src/index.ts` (export), `packages/video/package.json` (export `./world` → `./src/world/model.ts`)
- Test: `packages/video/src/world/model.test.ts`

**Interfaces:**

- Consumes: Tasks 1-4.
- Produces:
  - `type WorldModel = { city: City; stops: Stop[]; cameras: Camera[]; timeline: Timeline }`
  - `buildWorld(data: RecapData, format: { width: number; height: number }, mode: WorldMode, fps: number): WorldModel` in `model.ts` (pure; the web player imports it through `@wyg/video/world` to know the stop frames)
  - `WorldStory({ data, mode, music }: { data: RecapData; mode: WorldMode; music?: boolean })` — reads `width`/`height`/`fps` from `useVideoConfig()` and builds the model with `useMemo`
  - `worldDuration(data: RecapData, format: { width: number; height: number }, mode: WorldMode): number` for `calculateMetadata`
  - Compositions `world-9x16`, `world-4x5`, `world-1x1`, `world-16x9` in `Root.tsx`, `mode: "video"`, duration from `calculateMetadata` → `worldDuration`

Layers, back to front in the DOM (no `z-index`):

1. `CityLayer`: one SVG. Each plot is three polygons (top, left face, right face) from `isoPoint` and `plotHeight`, projected through the current camera. Draw order: ascending `col + row`, then `col`. Colours: GitHub's greens by contribution level (`heat.ts` levels) with darker side faces; `zero` plots in the paper tone; `not-yet` plots as an outline only (1 px at 1080 wide, ink at 35% opacity) with no fill. The whole layer's opacity is 1 at the city stop's span and fades to 0 by `span <= 3 * PLOT_SPAN`.
2. `StopLayer` for each plot stop within reach (current or neighbour stops): a full-frame placeholder card for now, scaled and translated so it is exactly frame-sized when the camera equals that stop's camera, transparent at the city span. Placeholder content: the stop's `kind`, its date and, for `busiest`, the count. Phase 2 replaces the placeholder.
3. `Chrome`: the progress bar flush with the top (one segment per stop, 4 px tall at 1080 px wide, `#30A14E` filled up to the current stop, 18% ink for the rest, 3 px gaps) and the copyright line at the bottom (`© {year} WrapYourGit · wrapyourgit.habibiahmada.dev`, 22 px at 1080 wide, ink at 70%).

Sound in `video` mode only: `Sfx` of `transitionSound(stops[i].kind)` at the first frame of each move, and the soundtrack via the existing `Html5Audio` pattern from `WrapStory` (phase 3 swaps it). `interactive` mode renders no audio; the web player plays it.

- [ ] **Step 1: Write the failing test**

```ts
test("buildWorld: one camera per stop and a duration that covers the last stop", () => {
  const world = buildWorld(sampleRecap, VIDEO_FORMATS["9x16"], "interactive", 30);
  expect(world.cameras).toHaveLength(world.stops.length);
  expect(world.timeline.durationInFrames).toBe((world.timeline.stopFrames.at(-1) ?? 0) + 1);
});
test("worldDuration in video mode is longer than interactive by the holds", () => {
  /* difference = 90 * stops */
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test packages/video/src/world/model.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `model.ts`, the three layers and `WorldStory`; register the compositions**

- [ ] **Step 4: Verify**

Run: `bun test packages/video/src && bun run typecheck && bun run lint`
Expected: all pass.

Run: `bun run studio`, open `world-9x16`, scrub the timeline and check:

- The city builds at the city stop.
- Every move is smooth with no jumps at the stops.
- The progress bar and copyright are on every frame.
- `world-16x9` frames the whole city.
- The console shows no errors.

Take one screenshot per layout family for the PR.

- [ ] **Step 5: Commit**

```bash
git add packages/video/src/world packages/video/src/Root.tsx packages/video/src/index.ts packages/video/package.json
git commit -m "feat(video): the story world as one composition"
```

### Task 6: Player controller

**Files:**

- Create: `apps/web/src/app/recap/world/controller.ts`
- Test: `apps/web/src/app/recap/world/controller.test.ts`

**Interfaces:**

- Consumes: `Timeline` (Task 3).
- Produces (pure, no React):
  - `type ControllerState = { stop: number; moving: null | { from: number; to: number; startFrame: number; endFrame: number; direction: 1 | -1 }; queued: 1 | -1 | null }`
  - `initialState(): ControllerState` (stop 0, not moving)
  - `request(state: ControllerState, direction: 1 | -1, timeline: Timeline): { state: ControllerState; start: boolean }` — starts a move, or queues one direction while moving (a later request replaces the queue), or does nothing at either end
  - `frameAt(state: ControllerState, elapsedMs: number, fps: number): number` — the frame to show during a move; forward and backward both advance one frame per `1000 / fps` ms
  - `settle(state: ControllerState): { state: ControllerState; next: 1 | -1 | null }` — called when a move reaches its end frame: rests on `to`, hands back the queued direction

- [ ] **Step 1: Write the failing tests**

```ts
test("forward from stop 0 moves to stop 1 over its move frames", () => {
  /* start true, endFrame = stopFrames[1] */
});
test("backward plays the same frames in reverse", () => {
  /* from stop 2 back: startFrame = stopFrames[2], endFrame = stopFrames[1]; frameAt decreases */
});
test("nothing happens before the first stop or after the last", () => {
  /* start false, state unchanged */
});
test("taps during a move queue one direction, the last one wins", () => {
  /* request(+1) twice then (-1): queued -1 */
});
test("settle rests on the target and returns the queued move", () => {
  /* next === queued, queued cleared */
});
test("frameAt never passes the end frame", () => {
  /* huge elapsed → endFrame */
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test apps/web/src/app/recap/world/controller.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `controller.ts`**

- [ ] **Step 4: Run to verify they pass**

Run: `bun test apps/web/src/app/recap/world`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/recap/world/controller.ts apps/web/src/app/recap/world/controller.test.ts
git commit -m "feat(web): a controller for moving the story camera both ways"
```

### Task 7: The full-screen world player at `/recap/world`

Load `antislop:antislop`, `antislop:antislop-human` and `antislop:antislop-ui` before the first edit (user instructions).

**Files:**

- Create: `apps/web/src/app/recap/world/page.tsx`, `apps/web/src/app/recap/world/world-player.tsx`, `apps/web/src/app/recap/world/use-sfx.ts`
- Modify: `apps/web/next.config.ts` only if `@wyg/video/world` needs it (it is already transpiled as `@wyg/video`)

**Interfaces:**

- Consumes: `buildWorld`, `WorldStory` (`@wyg/video`, `@wyg/video/world`), controller (Task 6), `transitionSound`, `TAP_SOUND`, `sfxFile` (Task 4), `useMusic` and `loopSeconds()` (existing), `getCurrentUser`, `getRecap` (existing).
- Produces:
  - `page.tsx`: server component. In production (`process.env.NODE_ENV === "production"`) calls `notFound()`. Otherwise it requires a signed-in user with a recap, like `/recap`, and renders `<WorldPlayer data={recap.data} />` with the site navbar left out.
  - `WorldPlayer({ data }: { data: RecapData })` (client component).
  - `useSfx(): { play(name: SfxName): void; setMuted(muted: boolean): void }`: decodes each WAV once into a Web Audio buffer and plays it on demand.

Behaviour:

- **Layout:** the Player fills the viewport (`100svw` × `100svh`, `object-fit`-style letterboxing on the paper colour) in the format of the viewport's layout family (`FORMAT_FOR_LAYOUT` as in `story-player.tsx`), with `inputProps={{ data, mode: "interactive", music: false }}`, `clickToPlay={false}`, no controls.
- **Tap zones:** two transparent `<button>`s over the Player. The left one covers the left third, named "Previous" (`aria-label`); the right one covers the rest, named "Next". Both have `cursor: pointer` and a visible `:focus-visible` ring inset 4 px.
- **Keyboard:** ArrowRight, Space and Enter go forward; ArrowLeft goes back; Escape goes to `/dashboard`.
- **Controls:** two quiet controls in the top-right corner, below the progress bar: a mute toggle (`aria-pressed`, label "Sound") and a close link to `/dashboard` (label "Close story").
- **Moving forward and back:** on a move, play `TAP_SOUND` and `transitionSound(stops[to].kind)`, then drive frames with `requestAnimationFrame`: `playerRef.seekTo(frameAt(state, now - start, fps))` each tick until the end frame, then `settle`. Use `seekTo` for both directions, not `play()`, so forward and reverse share one code path and the frame cadence matches.
- **Music:** `useMusic` starts the soundtrack on the first move (a user gesture) and loops it for as long as the viewer stays.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, a move seeks straight to the end frame, and the player wrapper crossfades over 200 ms with a CSS opacity transition. The transition is allowed here because it sits outside the composition.
- **Pending stops:** while a move runs, further taps go through `request` (queued, not lost).

- [ ] **Step 1: Build the page and player as described**

- [ ] **Step 2: Verify in the browser**

Run: `bun run dev`, open `http://localhost:3000/recap/world` signed in (or with a local seeded user).

Check:

- Full screen with no navbar.
- Tapping right moves stop by stop with sound, and tapping left plays the move backwards.
- Five fast taps never skip a stop silently.
- Keyboard: Tab reaches Previous, Next, Sound and Close, each with a visible focus ring; the arrow keys work; Escape leaves.
- Reduced motion (DevTools emulation) jumps with a crossfade.
- No console errors.
- At 375 × 812 and 1440 × 900 the city and chrome fit.

Take screenshots for the PR.

Run: `NODE_ENV=production` build check: `bun run build`, then `next start` and confirm `/recap/world` is a 404.

- [ ] **Step 3: Run the full checks**

Run: `bun run typecheck && bun test && bun run lint`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/recap/world
git commit -m "feat(web): full-screen world player behind a development route"
```

---

## After this phase

Open the PR for the phase (Conventional title, `Closes #<phase issue>`, screenshots per layout family), post a self-review, and merge only with the maintainer's OK and green CI. Then write the phase 2 plan, starting with the scene mockups.
