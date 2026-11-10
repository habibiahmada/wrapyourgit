# Story world, phase 3: exports in the browser — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The story world's MP4 (four formats) and its stop slides (PNG, ZIP, PDF) render in the user's browser with `@remotion/web-renderer`, from a "Keep your year" screen after the last stop and a "Download your story" section on the dashboard, with progress, cancel and an honest fallback.

**Architecture:** `packages/video/src/world/export.ts` describes what to render: the composition for a format, the frames that become slides, and the file names. It is pure and tested. `apps/web/src/app/recap/world/exports.ts` drives `renderMediaOnWeb` / `renderStillOnWeb` and assembles the ZIP (fflate) and PDF (pdf-lib) in the browser. One client component, `ExportPanel`, holds the UI and is used by the player's end screen and by the dashboard. The world's audio moves to `@remotion/media`'s `<Audio>`, which the web renderer requires.

**Tech Stack:** Remotion 4.0.540 (`@remotion/web-renderer`, `@remotion/media`), WebCodecs via Mediabunny, fflate, pdf-lib, Next.js 16, Bun test.

**Spec:** `docs/superpowers/specs/2026-11-06-story-world-design.md` ("Exports", "Where exports live", "Private repository names"). Phase 1 and 2 plans: `docs/superpowers/plans/2026-11-09-story-world-1-engine.md`, `…-2-scenes.md`.

## Decisions this plan makes (the maintainer can override them)

- **Still behind the development gate.** The spec says the old and new story never ship to users at once. So the "Keep your year" screen lives in `/recap/world` (development only), and the dashboard's "Download your story" section renders only where `/recap/world` does (`process.env.NODE_ENV !== "production"`). Phase 4 turns both on and switches the story over.
- **Removals move to phase 4.** The old story (`StoryFlow`) still uses `/api/story/slide/10` and the slide routes. Deleting `apps/renderer`'s worker, Lambda, `/api/story/{pdf,zip,slide}`, `server/slides.tsx` and `SLIDE_EXPORTS` happens with the switch-over. This phase writes the ADR that decides it.
- **Public projection for every file.** Until phase 4 adds the "Show your private repository names?" choice, exports render `toPublicRecap(data)` (AGENTS.md rule 6). The page passes it alongside the full data.
- **Slides are 4:5** (1080 × 1350, the Instagram feed size the current slides use), one per stop, letter pages included, taken at each stop's rest frame in video mode.

## Global Constraints

- AGENTS.md rules 1-8. Rule 6: nothing exported contains a private repository's name in this phase (public projection). Rule 3: the composition stays deterministic.
- Web-renderer limits (spec): no `z-index`, no 3D CSS, no SVG `url()` references or CSS filters, no `object-position`; fonts embed only inside SVG text via `@remotion/google-fonts`; single-threaded; the tab must stay visible while rendering.
- `Html5Audio` is unsupported by the web renderer. The world uses `<Audio>` from `@remotion/media`. The old story keeps its `Html5Audio`.
- The web-facing module guard (`packages/video/src/web-modules.test.ts`) must keep passing: server code never imports Remotion.
- Player UI: WCAG 2.2 AA, antislop R-39 to R-41 (real buttons with names, pointer and not-allowed cursors, visible focus, keyboard, reduced motion, no console errors). Load `antislop:antislop`, `antislop-human`, `antislop-ui` before UI edits.
- Commits: Conventional Commits in English, no AI attribution, on `feat/56-story-world-exports`.

## Review Focus

- A browser without WebCodecs (or without AAC encoding): the panel says what can't be made and still offers the share card; nothing hangs. (Task 3 test with a stubbed capability result; Task 4 UI state.)
- Cancelling mid-render, then starting again: no orphaned render keeps running, progress resets. (Task 3 test with an `AbortSignal`.)
- Switching tabs while rendering: the panel warns to keep the tab open; a hidden tab slows but doesn't break. (Task 4 copy; Task 6 manual check.)
- A recap with private repositories: no exported file names one. (Task 2 test on the export data.)
- Very long stories (many letter pages): the MP4 duration equals `worldDuration` for that format, and slides equal the stop count. (Task 2 tests.)

---

### Task 1: World audio for the web renderer

**Files:** Modify `packages/video/package.json` (add `@remotion/media` 4.0.540), `packages/video/src/world/WorldStory.tsx` (music and effects via `<Audio>`), create `packages/video/src/world/WorldSfx.tsx` (the world's effect component on `@remotion/media`; the old `components/Sfx.tsx` stays for the old story). Update `bun.lock`.

**Interfaces:** `WorldSfx({ at, sound }: { at: number; sound: SfxName })` with the same volume rule as `Sfx`. `WorldMusic` keeps its frame arithmetic (first pass 0 → loop end, then the loop region, fade over the last two beats) on `<Audio>` with `trimBefore`/`trimAfter` (check the exact prop names in `@remotion/media`'s types).

- [ ] Verify the props in `node_modules/@remotion/media` types before writing; keep `loopVolumeCurveBehavior` semantics (the fade must target the composition's last two beats).
- [ ] Render a short check with the Node renderer: `bunx remotion render src/remotion-entry.ts world-9x16 /tmp/claude-1000/p3/check.mp4 --frames=0-300` from `packages/video`, and confirm with `bunx remotion ffprobe` that the file has an audio stream and the effects land (peak in the first second for hello).
- [ ] `bun test && bun run typecheck && bun run lint`, and the web production build (`cd apps/web && bunx next build`).
- [ ] Commit `feat(video): world audio the browser renderer can play`.

### Task 2: What to export

**Files:** Create `packages/video/src/world/export.ts` (+ `export.test.ts`); re-export from `model.ts` (the `./world` entry).

**Interfaces:**
- `type ExportFormat = "9x16" | "4x5" | "1x1" | "16x9"`.
- `worldExportComposition(data: RecapData, format: ExportFormat): { id: string; width: number; height: number; fps: number; durationInFrames: number; defaultProps: { data: RecapData; mode: "video" } }` — `durationInFrames = worldDuration(data, VIDEO_FORMATS[format], "video")`; `id = "world-" + format`.
- `slideFrames(data: RecapData): { stopId: string; frame: number }[]` — one per stop of the 4:5 world in video mode, at `stopFrames[i] + 1` (inside the hold, after the arrival).
- `exportFileName(kind: "mp4" | "png" | "zip" | "pdf", data: RecapData, extra?: { format?: ExportFormat; index?: number; stopId?: string }): string` — `wrapyourgit-{year}-{login}-{format}.mp4`, `wrapyourgit-{year}-{login}-{nn}-{stopId}.png`, `…-slides.zip`, `….pdf`; logins sanitised to `[a-z0-9-]`.

- [ ] Tests: durations match `worldDuration` for all four formats and a long-letter fixture; `slideFrames(sample).length` equals the 4:5 stop count and every frame is within that stop's hold; file names for each kind, zero-padded index; `toPublicRecap(fixtureWithPrivateRepos)` exported data contains no private `nameWithOwner` (scan the JSON).
- [ ] Commit `feat(video): describe the world's exports`.

### Task 3: The export engine in the browser

**Files:** Create `apps/web/src/app/recap/world/exports.ts` (+ `exports.test.ts`); add `@remotion/web-renderer` 4.0.540 to `apps/web/package.json`.

**Interfaces:**
- `exportSupport(): Promise<{ mp4: boolean; stills: boolean; reason: string | null }>` — wraps `canRenderMediaOnWeb` (H.264/AAC MP4) and a still check; `reason` is a short sentence for the UI when something can't render.
- `renderMp4(data, format, { onProgress(p: number), signal }): Promise<Blob>` — `renderMediaOnWeb` with `container: "mp4"`, the composition from Task 2 (`component: WorldStory`), `inputProps`, `signal`.
- `renderSlides(data, { onProgress(done: number, total: number), signal }): Promise<{ name: string; blob: Blob }[]>` — `renderStillOnWeb` (PNG) per `slideFrames`, sequentially.
- `zipSlides(slides): Promise<Blob>` (fflate, stored, no recompression) and `pdfSlides(slides, { title }): Promise<Blob>` (pdf-lib, one 1080 × 1350 page per slide).
- `download(blob, name)` — object URL + `<a download>`, revoked after.

- [ ] Tests (bun, no browser): `zipSlides` and `pdfSlides` with two tiny generated PNGs (round-trip: unzip lists both names; the PDF has two pages of the right size); `exportSupport` maps a stubbed `canRenderMediaOnWeb` result with issues to `mp4: false` and a reason; `renderSlides` stops and rejects with an AbortError when the signal aborts between slides (inject the still renderer).
- [ ] Commit `feat(web): render the story's files in the browser`.

### Task 4: `ExportPanel` and the "Keep your year" screen

Load the antislop skills first.

**Files:** Create `apps/web/src/app/recap/world/export-panel.tsx`; modify `world-player.tsx` (after the last stop, a web-only screen over the paused player: "Keep your year", the panel, "Go to dashboard") and `page.tsx` (pass `exportData = toPublicRecap(recap.data)`).

**Behaviour:**
- Format picker for MP4 (9:16 default, 4:5, 1:1, 16:9, labels from `VIDEO_FORMATS[...].label`), buttons "Video (MP4)", "Slides (PNG, ZIP)", "PDF", and "Share card (PNG)" (`/api/card`, unchanged).
- While rendering: a progress bar with percent and an `aria-live` label, a Cancel button (aborts), "Keep this tab open while your video renders", other buttons disabled (`not-allowed`).
- On `exportSupport()` false: the affected buttons are disabled with the reason shown; the share card stays.
- Errors: a plain message ("The video couldn't be made in this browser. Try Chrome on a computer.") and the button re-enabled.
- In the player: the end screen appears after the closing stop's settle; Back returns to the closing stop; it is not part of the composition.

- [ ] Verify in the browser at `/recap/world` (development): reach the end, see the panel, keyboard through it, start and cancel an MP4, check the console for errors; 375 px and desktop widths.
- [ ] Commit `feat(web): keep your year at the end of the story`.

### Task 5: Dashboard "Download your story" and the ADR

**Files:** Modify `apps/web/src/app/dashboard/page.tsx` (a small section rendering `ExportPanel` with the public projection, only when `process.env.NODE_ENV !== "production"`, in a client boundary); create `docs/architecture/decisions/0016-exports-in-the-browser.md` (supersedes ADR-0004 and ADR-0011; records the four decisions above, the web-renderer limits, the public-projection rule until phase 4, and that removals land with phase 4); mark ADR-0004 and ADR-0011 "Superseded by 0016"; update `docs/video/scene-system.md` (export section) and `AGENTS.md`'s data-flow line if it mentions Lambda for MP4.

- [ ] The dashboard still builds as a server component (the web-module guard passes; the panel is a client component imported dynamically or as a leaf).
- [ ] `bun test && bun run typecheck && bun run lint` and the production build.
- [ ] Commit `feat(web): download your story from the dashboard` and `docs: ADR-0016, exports in the browser`.

### Task 6: End-to-end check in a real browser

**Files:** none (a verification task; fixes found here become their own commits).

- [ ] In the built-in browser at `/recap/world` (dev, sample data): export the 9:16 MP4; read the downloaded file with `bunx remotion ffprobe` — duration equals `worldDuration(sample, 9x16, "video") / 30` s ± 0.1, one video stream 1080 × 1920, one audio stream.
- [ ] Export the slides ZIP and the PDF; confirm the ZIP has one PNG per stop (1080 × 1350) and the PDF the same number of pages; open two PNGs and compare with the composition (fonts, sprites, chrome).
- [ ] Record any web-renderer visual differences (fonts in HTML text, opacity, transforms) and fix the ones that change a number or a label; list the rest in the PR.
- [ ] Commit fixes as `fix(...)` commits; the PR body records the check.

---

## After this phase

PR `feat: story world phase 3, exports in the browser` with `Closes #56`, the end-to-end check results, and the self-review. Then phase 4: private-names choice, the public page, the switch-over, and the removals.
