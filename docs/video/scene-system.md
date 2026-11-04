# Scene system

How the story and the exported video are built. Code: `packages/video`.

## Building blocks

| Concept       | Where                         | Notes                                                                                                  |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `WrapStory`   | `src/WrapStory.tsx`           | `<Series>` of all scenes, takes `{ data: RecapData }`                                                  |
| `SCENES`      | `src/WrapStory.tsx`           | Ordered list `{ id, durationInFrames, Component }`. Also used by the web Player to seek scene-by-scene |
| Compositions  | `src/Root.tsx`                | `wrap-9x16`, `wrap-4x5`, `wrap-1x1`, `wrap-16x9`                                                       |
| Layout family | `useLayout()`                 | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md))   |
| Theme         | `src/theme.ts`                | Tokens from [DESIGN.md](../../DESIGN.md): palette, allowed text pairings, font, `useUnit()`            |
| Fixtures      | `src/fixtures/`               | `sampleRecap` for Studio; `emptyRecap` and `busyRecap` (long names, five-digit totals) for edge checks |
| Track         | `src/audio/track.ts`          | BPM, sections and `beats(n)`; scene durations are whole beats                                          |
| Motif         | `src/components/CellWipe.tsx` | Contribution-cell transition that opens every scene after the intro                                    |
| Accent        | `src/accents.tsx`             | Per-scene illustration (baked cutout) passed to `Field` through `AccentContext`, drawn behind the text |

## Rules

1. **Deterministic.** Animate from `useCurrentFrame()` only (`interpolate`, `spring`, `random("seed")`). See [ADR-0002](../architecture/decisions/0002-one-composition-for-web-and-video.md).
2. **Relative sizing.** Derive font sizes and spacing from `width`/`height` of `useVideoConfig()`. Never fixed px.
3. **Safe areas.** Keep text inside the central 80% height on `portrait` (TikTok/Reels UI overlays top & bottom).
4. **Numbers stay readable.** Final value is on screen ≥ 1.5 s after any count-up. Use `tabular-nums`. Format with `toLocaleString("en-US")`; compact (1.2k) only above 10,000.
5. **Unavailable / estimated** values have a visible treatment (e.g. "~" prefix + footnote). Unavailable metrics skip their beat; they never render as 0.
6. **Long content.** Long repo names truncate with ellipsis; scene must handle 0–5 repos and 0–N languages.
7. **Reduced motion (web).** Honour `prefers-reduced-motion`: Player shows scenes at their final frame with simple fades.
8. **Fonts & assets** load via `staticFile()` / `@remotion/google-fonts` with `delayRender` so Lambda renders don't flash fallback fonts.

## Scenes (66 s at 30 fps, 132 beats at 120 BPM)

Order, length and field color live in `src/timeline.ts`; `timeline.test.ts` checks that the story is as long as the track and that music sections start on scene cuts.

| #   | id            | Beats | Field     | Content                                                                         | Music              |
| --- | ------------- | ----- | --------- | ------------------------------------------------------------------------------- | ------------------ |
| 1   | intro         | 8     | ink       | first week lights up, `@login · 2026`, title                                    | pad, riser         |
| 2   | contributions | 16    | persimmon | total count-up, active days, streak                                             | drop: kick enters  |
| 3   | rhythm        | 20    | paper     | calendar heatmap draws in, busiest month, weekday bars                          |                    |
| 4   | tech-dna      | 16    | cobalt    | top language, rows of 5% cells per language                                     | arpeggio enters    |
| 5   | projects      | 16    | paper     | top repo spotlight, then rows scaled to its commits; new / contributed-to       |                    |
| 6   | community     | 12    | cobalt    | stars gained (or current total, labelled as such), forks, most starred          |                    |
| 7   | engineering   | 14    | ink       | non-zero counters only: PRs, merged, reviews, issues, external repos            | riser, 2-beat rest |
| 8   | identity      | 16    | persimmon | archetype reveal (heavier spring) and its reasons; honest line when null        | climax: crash      |
| 9   | closing       | 14    | ink       | handle, four headline facts, the year as a small graph, "Made with WrapYourGit" | outro, fade        |

Accents (`src/accents.tsx`, art from `bun scripts/render-art.ts`):

| Scene         | Accent                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| intro         | Cell waving in from the right edge                                             |
| contributions | Cell cheering, peeking in from the right edge, tilted                          |
| rhythm        | `skin-consistent` as a giant ink silhouette, cut off by the right edge         |
| tech-dna      | Cell thinking, bottom-right corner (plus a logo sticker per language)          |
| projects      | `skin-builder` as a giant ink silhouette leaning in from the right             |
| community     | Open sourcer group beside the counters                                         |
| engineering   | `skin-collaborator` as a giant paper silhouette rising from the bottom, on ink |
| identity      | the person's own `skin-<archetype>` in full colour, rising from the bottom     |
| closing       | Cell proud, bottom corner                                                      |

Accents use a CSS filter for silhouettes (not a mask image), because Remotion waits for `<Img>` to load but not for CSS masks.

Privacy: scenes name repositories only through `repoLabel()` (`src/present.ts`), which turns every private repo into "Private repository", because the MP4 is shareable. Metrics go through `metricValue()`: unavailable skips the beat, estimates get "~" and a footnote.

## Audio

- Files in `packages/video/public/audio/`, licences in `LICENSES.md` there ([ADR-0007](../architecture/decisions/0007-soundtrack-sourcing.md)).
- `<Html5Audio>` (`<Audio>` is deprecated in Remotion 4.0.540) with a volume curve that fades the last two beats; SFX via `<Sequence>`-scoped `<Html5Audio>`.
- Track: `wrapyourgit-120bpm.m4a` (AAC, 66 s), synthesised by `bun scripts/synth-track.ts` from `TRACK` (120 BPM = 15 frames per beat). Sections: intro (pad, riser), drop at contributions (kick, hats, bass; claps from beat 24, arpeggio from beat 40), two beats of rest and a crash at the identity climax, half-time outro over closing. Regenerate it whenever `TRACK` or the timeline changes.
- Track metadata (`bpm`, `offsetMs`, sections) drives scene durations: each scene snaps to a whole number of beats.
- Web: the guided story plays the track through its own looping `<audio>` element, started by the first "Start my story" tap, so music keeps going across chapters. The Player itself is always muted, plays one scene between `inFrame`/`outFrame` and holds its last frame (`moveToBeginningWhenEnded={false}`). Replay and sound are icon buttons at the top right.

## Export

| Setting | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                               |
| FPS     | 30                                                                                        |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                |
| Where   | Remotion Lambda ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md)) |

Local test render: `bun run --filter @wyg/video render wrap-9x16 out/test-9x16.mp4`
