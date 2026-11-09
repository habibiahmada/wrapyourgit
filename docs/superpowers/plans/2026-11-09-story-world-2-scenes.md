# Story world, phase 2: chapter scenes and soundtrack — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every placeholder stop card in the world with its approved scene (data drawn inside the illustration), add an arrival sound per scene and a new soundtrack made for the world, and make "busiest day" a real metric first.

**Architecture:** Each scene is a React component in `packages/video/src/world/scenes/`, drawn frame-sized inside the existing `StopLayer`, fed by a pure, unit-tested model function that turns `RecapData` into the numbers and geometry it draws. Scenes animate only from an `enter` progress (0 → 1 over the move into the stop) and the frame number, so they play backwards correctly. A registry maps every `StopKind` to its scene. A new soundtrack (`WORLD_TRACK`) replaces the old track for the world only.

**Tech Stack:** Remotion 4.0.540, React 19, SVG, Bun test, Web Audio.

**Spec:** `docs/superpowers/specs/2026-11-06-story-world-design.md`, in particular "Phase 2 decisions (2026-11-09)" (the approved scene table, soundtrack, arrival sounds). Phase 1's plan (`docs/superpowers/plans/2026-11-09-story-world-1-engine.md`) describes the engine this builds on.

## Global Constraints

- AGENTS.md rules 1-8. Rule 1: a number shown on screen is a schema metric, defined in `docs/analytics/metrics.md` and computed in `packages/analytics` with a test. Rule 2: unavailable data gets its own state in the picture, never a zero.
- Everything a scene draws comes from `useCurrentFrame()`-derived values (`enter`, `frame`), `interpolate`, `spring`, seeded `random`. No CSS transitions, timers, `Date.now()`, `Math.random()`.
- Branch on layout family (`portrait | compact | landscape`); size from the frame's `width`/`height`, never fixed pixels. Every scene must fit 9:16, 4:5, 1:1 and 16:9 without clipping a number or a label.
- Web-renderer limits (phase 3 renders these scenes in the browser): no `z-index` (DOM order back to front), no 3D CSS transforms, no SVG `url()` clip paths or filters, no `object-position`, no CSS filters. Text inside SVG uses the project font from `theme.ts`.
- "Every stop is a picture never shown at another stop": no scene reuses another scene's main picture.
- Scene copy is English, short, and every number carries its label. Estimated values say so (rule 2's `estimated` flag).
- Repository names go through `repoLabel()` (`packages/video/src/present.ts`); scenes never print `nameWithOwner` directly.
- Cell is the baked art only: sprite sheets via `Sprite` (`components/Sprite.tsx`) or the still `art/<id>.png` via Remotion `Img`. No WebGL.
- The old story (`WrapStory`, `TRACK`, `timeline.ts`) is untouched: users still see it until phase 4.
- Commits: Conventional Commits in English, no AI attribution; work on `feat/49-story-world-scenes`.

## Review Focus

- A sparse year: one language, no repositories with commits, zero stars, no pull requests, no archetype. Each scene shows an honest empty state, no division by zero, no empty chart. (Each model test includes an empty case.)
- Huge numbers: 50,000 contributions, 40 languages, a repository name 60 characters long, 12,000 stars. Labels shrink or truncate with an ellipsis and never overflow the frame. (Model tests with `edge-recaps.ts` fixtures; stills of the long-name fixture.)
- Unavailable metrics (`status: "unavailable"`): private count, merged PRs, previous year, stars gained. The scene states what couldn't be read. (Model tests.)
- A long letter in 16:9: pagination never splits mid-word and every page fits. (Task 12 tests across all four formats.)
- Going backwards through a scene: entrance animations run in reverse, no element pops in at full size when arriving from the next stop. (Covered by `enter` being a pure function of frame; Task 2 test.)

---

### Task 1: Busiest day as a metric (#47)

**Files:**
- Modify: `packages/schema/src/recap.ts` (add `contributions.busiestDay`, bump `SCHEMA_VERSION` 3 → 4), `docs/analytics/metrics.md` (row next to `busiestMonth`), `packages/analytics/src/calendar.ts` (+ `busiestDay`), `packages/analytics/src/recap.ts` (wire it), fixtures `packages/video/src/fixtures/sample-recap.ts` and `edge-recaps.ts`, `packages/analytics/src/public.test.ts` fixture, `packages/video/src/world/city.ts` (read the metric)
- Test: `packages/analytics/src/calendar.test.ts`, `packages/video/src/world/city.test.ts`

**Interfaces:**
- Produces: `contributions.busiestDay: { date: string; count: number } | null` in `RecapData`; `busiestDay(calendar: CalendarDay[]): { date: string; count: number } | null` in analytics (highest count, earliest date on a tie, null when every day is 0).
- `buildCity` sets `busiestIndex` from `data.contributions.busiestDay` (index of that date), not its own scan. `maxCount` stays computed from plots.

- [ ] **Step 1: Write the failing tests:** `busiestDay` — highest wins; tie → earlier date; all zero → null; empty → null. `buildCity` — `busiestIndex` follows `busiestDay` even when a later day in a test calendar has the same count.
- [ ] **Step 2: Run** `bun test packages/analytics/src/calendar.test.ts packages/video/src/world/city.test.ts` → FAIL.
- [ ] **Step 3: Implement**; metrics.md row: `contributions.busiestDay` | Day with the most contributions; ties → earlier day; null when no day has any | calendar → `busiestDay` | ✅. Bump `SCHEMA_VERSION`; stored recaps of version 3 are then rebuilt on the next sync (existing behaviour of `getRecap`).
- [ ] **Step 4: Run** `bun test && bun run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(analytics): busiest day as a metric` (body: `Closes #47` is in the PR, not the commit).

### Task 2: Scene framework

**Files:**
- Create: `packages/video/src/world/scenes/types.ts`, `packages/video/src/world/scenes/index.ts`, `packages/video/src/world/scenes/Placeholder.tsx` (the phase 1 card, moved), `packages/video/src/world/scenes/kit.tsx` (shared drawing helpers), `scripts/world-stills.ts`
- Modify: `packages/video/src/world/StopLayer.tsx` (render the registry), `packages/video/src/world/fade.ts` (+ `enterProgress`), `packages/video/src/world/WorldStory.tsx` (pass `enter`)
- Test: `packages/video/src/world/fade.test.ts`, `packages/video/src/world/scenes/index.test.ts`

**Interfaces:**
- `type SceneProps = { data: RecapData; stop: Stop; city: City; size: { width: number; height: number }; layout: LayoutFamily; enter: number; frame: number }` — `size` is the frame's size (the scene draws frame-sized), `enter` is 0 at the start of the move into this stop and 1 from the rest frame on, `frame` the composition frame for idle loops.
- `type Scene = (props: SceneProps) => ReactNode`; `SCENES: Record<StopKind, Scene>`; until a later task replaces it, every kind maps to `Placeholder`.
- `enterProgress(i: number, frame: number, timeline: Timeline): number` in `fade.ts`: 0 before the move into stop i, eased 0 → 1 over that move, 1 from the rest frame through the hold and the move out.
- `kit.tsx` exports: `SceneSvg` (an `<svg>` with `viewBox="0 0 1000 H"` where `H = 1000 × height / width`, so scenes draw in 1000-unit width), `Label({ x, y, text, size, weight, anchor, maxWidth })` using `fitFontSize`, `CellArt({ pose, x, y, width })` (still PNG of `cutout-cell-<pose>` via `Img`), `HeadArt({ x, y, size })` (`art/head-cell.png`).
- `scripts/world-stills.ts <kind> [outDir]`: builds the world for `sampleRecap` (and `--fixture edge-long-names` etc. from `edge-recaps.ts`), finds the first stop of that kind, and renders the rest frame of `world-9x16`, `world-4x5`, `world-16x9` with Remotion's `renderStill` into `outDir` (default `/tmp/claude-1000/world-stills/`). Every scene task uses it for its visual check.

- [ ] **Step 1: Tests:** `enterProgress` is 0 at the previous stop's rest frame, strictly between at mid-move, 1 at its own rest frame and through its hold, in both modes; `SCENES` has an entry for every `STOP_KINDS` value.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; `StopLayer` drops its placeholder markup and renders `SCENES[stop.kind]` inside the frame-sized box; the city stop (plot `null`) gets a layer too so Task 4 can draw its label.
- [ ] **Step 4: Run** `bun test && bun run typecheck && bun run lint`; run `bun scripts/world-stills.ts busiest` and look at the three PNGs (placeholder unchanged).
- [ ] **Step 5: Commit** `feat(video): a scene for every stop of the world`.

### Scene tasks (3-11, 13): the shared pattern

Every scene task follows these steps; each task below lists only what differs.

1. Write the model test for `<scene>Model(data, …)` in `packages/video/src/world/scenes/<scene>.model.test.ts`, covering the normal case, the empty case and the unavailable case from Review Focus.
2. Run it → FAIL.
3. Implement `<scene>.model.ts` (pure) and `<Scene>.tsx` (draws from the model, enters with `enter`), and register it in `SCENES`.
4. Run `bun test && bun run typecheck && bun run lint`, then `bun scripts/world-stills.ts <kind>` (and the long-names fixture where labels matter). Look at all three PNGs: nothing clipped, numbers labelled, matches the approved mockup's idea.
5. Commit `feat(video): the <name> scene`.

The approved mockups are `.superpowers/brainstorm/*/content/data-in-illustration.html`, `story-world-v3.html`, `contribution-city.html` and `chapter-scenes.html` (local only; the spec's scene table is the authority).

### Task 3: Hello, first day, private

- `hello`: `HeadArt` fills ~70% of the short side; its face screen (a dark rounded panel over the baked face) shows "hi," and `@login` via `Label`, sized to fit any login length. Below: "Ready for your {year}?". Model: `helloModel(data) → { login: string; year: number }`.
- `first-day`: soil band, one sprout growing with `enter`, sign with "first square" and the date ("Jan 3"); `firstDayModel(data) → { date: string; weekday: string } | null` from the first calendar day with count > 0; null → the sign says "Every year starts with a blank graph".
- `private`: locked door, brass plaque with the count and "private contributions, counted"; `privateModel(data) → { kind: "count"; count: number } | { kind: "none" } | { kind: "unavailable" }` from `contributions.privateCount`. `none` → the door is open, "Nothing private this year"; `unavailable` → "Private contributions couldn't be read".
- Commit: `feat(video): the hello, first-day and private scenes`.

### Task 4: City total and busiest flag

- City stop: a sign above the city, "This year you made" / total / "contributions · one building per day", visible with the city stop's `cardOpacity`; when `!meta.isFinal`, "so far" is added and the legend explains the "not yet" outlines ("not yet: days still to come").
- `busiest`: a tall building close-up (lit windows) with Cell (`proud`) and a flag: "busiest day", "{weekday}, {date} · {count}". `busiestModel(data) → { date; weekday; count } | null` from `contributions.busiestDay` (Task 1). The stop doesn't exist when null (phase 1 already drops it).
- Commit: `feat(video): the city's total and the busiest-day flag`.

### Task 5: Rhythm train

- Seven cars Sunday → Saturday; cargo height ∝ `contributions.weekday[i] / max`; the busiest weekday's car is darker and carries Cell (`cheer`); title "{Weekday}s carried the most", caption "contributions per weekday · {Weekday} {count}". Landscape: the train runs across; portrait/compact: two rows are not allowed — shrink cars to fit one row.
- `rhythmModel(data) → { cars: { day: string; count: number; fill: number; busiest: boolean }[]; busiest: { day: string; count: number } | null }`; all zero → no busiest, caption "No contributions on any weekday yet".
- Commit: `feat(video): the rhythm train`.

### Task 6: Language garden

- One tree per language in `languages.top` (at most 5 drawn; the rest summed into "other"), crown radius ∝ √share so area reads as share; signs with name and percentage (`Math.round(share × 100)`, sums shown as given, "other" stated); tree colours from the language colour (`languages.ts` fallback for null). Cell (`think`) waters the largest.
- `gardenModel(data) → { trees: { name; share; percent; color; radius }[]; other: number }`; no languages → bare soil, "No language data yet".
- Commit: `feat(video): the language garden`.

### Task 7: Projects crates

- Up to 4 repositories from `repositories.top` as crate stacks on a shelf; crates per stack = `ceil(commits / unit)` where `unit` is the smallest of 10, 25, 50, 100, 250, 500 that keeps the tallest stack ≤ 8 crates; the legend says "one crate ≈ {unit} commits". Labels via `repoLabel()` (truncate with an ellipsis to fit), commits under each. Title "{createdThisYear} new repositories" (singular for 1; 0 → "Where your commits went").
- `projectsModel(data) → { stacks: { label: string; commits: number; crates: number }[]; unit: number; created: number }`; no repositories → empty shelf, "No repository commits yet".
- Commit: `feat(video): the projects shelf`.

### Task 8: Night sky

- Stars earned (`community.starsGained` when ok, else `totalStars` labelled "stars on your repositories") drawn as up to 80 small stars at seeded positions (`random("sky-" + login)`), with the total as the brightest star and its label. The sign shows forks gained (or total forks when unavailable): followers are not a metric (spec: Phase 2 decisions). Cell (`sleep`) on a hill.
- `skyModel(data) → { stars: { value: number; label: string; estimated: boolean }; forks: { value: number; label: string }; drawn: number }`; 0 stars → a dark sky with one faint star and "No stars yet".
- Commit: `feat(video): the night sky`.

### Task 9: Paper planes

- Planes in flight = PRs opened − merged (when merged is ok), landed = merged; at most 12 planes drawn of each, scaled; arrivals board with "pull requests sent {prsOpened}", "landed (merged) {prsMerged}" or "merged: couldn't be read", "reviews given {reviews}". Cell (`cheer`) on the tarmac.
- `planesModel(data) → { sent: number; merged: number | null; reviews: number; drawnFlying: number; drawnLanded: number }`; all zero → empty runway, "No pull requests this year".
- Commit: `feat(video): the paper-plane airfield`.

### Task 10: Archetype stage

- Spotlight and stage; Cell in the archetype costume (`cutout-<archetype>` still); "This year you were" / archetype title (from the existing archetype copy in `copy.ts`); up to 3 reasons from `identity.reasons`.
- `archetypeModel(data) → { id: ArchetypeId; title: string; reasons: string[] } | null`; null → Cell (`think`) alone on the stage, "Not enough activity to name your style yet".
- Commit: `feat(video): the archetype stage`.

### Task 11: Comparison seesaw

- Two weights on a seesaw: last year's `sameSpan.contributions` and this year's total for the same span; tilt angle = `clamp(12° × (b − a) / max(a, b), −12°, 12°)`; headline change `+18%` / `−7%` / "same as last year" (|Δ| < 1%); subtitle "{span start} – {span end}, both years".
- `seesawModel(data) → { last: { year; value }; current: { year; value }; angle: number; change: string } | { unavailable: true }`; unavailable → the seesaw rests level with an empty pan, "Last year couldn't be read from GitHub". Last year 0 → change "new this year".
- Commit: `feat(video): the comparison seesaw`.

### Task 12: Letter pages

**Files:** Create `packages/video/src/world/scenes/letter.model.ts` (+ test), `packages/video/src/world/scenes/Letter.tsx`; modify `packages/video/src/world/model.ts` (`buildWorld` passes the real page count to `buildStops`).

**Interfaces:**
- `paginateLetter(letter: Letter, size: { width: number; height: number }): string[][]` — pages of lines; lines wrap at word boundaries using the same character-width estimate as `fitFontSize` (0.62 em) at the letter's body size (4.2% of the frame's short side); paragraphs separated by one blank line; a page holds what fits between the letterhead and the page tab; never an empty page.
- `buildWorld` calls `paginateLetter(congratsLetter(data), format)` and passes `letterPages: pages.length`.
- Scene: paper sheet, `HeadArt` letterhead, the page's lines, "n / N" tab and a folded corner; arriving from the previous page the sheet turns (rotate around its left edge with `enter`, 2D only: `scaleX` and `skewY`, no 3D CSS).

- [ ] Tests: every format paginates the sample letter and a 3× longer letter; every line fits the width estimate; no word is split; page count ≥ 1; text joined back equals the input words.
- [ ] Then the shared pattern's steps 3-5. Commit `feat(video): the letter as pages`.

### Task 13: Closing fireworks

- Night sky, 2-3 firework bursts expanding with `enter` and fading by seeded timing on `frame`; "{date}, so far. That's your" (provisional) or "Dec 31. That was your" (final) / year; headline numbers: total contributions, active days, archetype title if any. Cell (`wave`).
- `closingModel(data) → { date: string; final: boolean; year: number; lines: string[] }`.
- Commit: `feat(video): the closing fireworks`.

### Task 14: Arrival sounds

**Files:** `packages/video/src/audio/sfx.ts`, `scripts/synth-sfx.ts`, `packages/video/src/world/sound.ts` (+ test), `packages/video/src/world/WorldStory.tsx`, `apps/web/src/app/recap/world/world-player.tsx`.

**Interfaces:**
- New SFX (synthesised, peak −3 dBFS, RMS not above `whoosh`): `sprout` (0.5 s), `lock` (0.35 s), `flag` (0.4 s), `chug` (0.8 s), `bloom` (0.6 s), `crate` (0.35 s), `twinkle` (0.8 s), `landing` (0.6 s), `spotlight` (0.7 s), `seesaw` (0.6 s), `page` (0.35 s), `firework` (1.2 s), `hello` (0.4 s).
- `arrivalSound(kind: StopKind): SfxName | null` — exhaustive switch with a `never` check; `city` → null (the wind already covers it).
- Video mode: `Sfx` at each `stopFrames[i]`. Web player: play the arrival sound when a move settles (not when it is cancelled by a format change).

- [ ] Tests: every kind maps to null or an existing file; durations ≤ 1.2 s. Numeric check of each new WAV as in phase 1 (length, peak, RMS); the maintainer listens before merge.
- [ ] Commit `feat(video): an arrival sound for every scene`.

### Task 15: The world's soundtrack

**Files:** Create `packages/video/src/audio/world-track.ts` (+ test), `scripts/synth-world-track.ts`; output `packages/video/public/audio/world-90bpm-v1.m4a`; modify `WorldStory.tsx` and `world-player.tsx` to use it; `packages/video/public/audio/LICENSES.md` row.

**Interfaces:**
- `WORLD_TRACK = { file: "audio/world-90bpm-v1.m4a", bpm: 90, beats: 192, loop: { startBeat: 32, endBeat: 160 } }` and `worldLoopSeconds(): { start: number; end: number }`.
- Character: calm, warm, A minor like the effects (so they sit in key); soft pads and plucked arpeggios, a light brushed beat entering at beat 32, no build-ups or drops inside the loop region (it may loop for minutes); intro beats 0-32 without drums; outro 160-192 fades for the video's ending.
- Video mode: one `Html5Audio` plays the file from 0 to the loop end; when the video is longer, a `<Loop>` of length (loop end − loop start) follows it with an `Html5Audio` trimmed to the loop region (`startFrom`/`endAt` in frames). Keep the fade over the last two beats of the composition.
- Web player: `useMusic(WORLD_TRACK.file, worldLoopSeconds())`.

- [ ] Tests: loop start/end fall on bar lines (multiples of 4 beats), loop length ≥ 64 beats, file exists and its duration equals `beats × 60 / bpm` ± 50 ms (read the M4A duration with the Remotion FFmpeg or `ffprobe`).
- [ ] Generate with `bun scripts/synth-world-track.ts`; numeric check (peak ≤ −1 dBFS, no clipping, the loop seam's last and first 50 ms within 3 dB of each other); the maintainer listens before merge.
- [ ] Commit `feat(audio): a soundtrack for the story world`.

---

## After this phase

PR `feat: story world phase 2, scenes and soundtrack` with `Closes #49` and `Closes #47`, stills of every scene per layout family, and the self-review. Merge after green CI and the maintainer has listened to the new sounds and the soundtrack. Then plan phase 3 (exports in the browser).
