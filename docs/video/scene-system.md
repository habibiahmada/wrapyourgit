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

## Rules

1. **Deterministic.** Animate from `useCurrentFrame()` only (`interpolate`, `spring`, `random("seed")`). See [ADR-0002](../architecture/decisions/0002-one-composition-for-web-and-video.md).
2. **Relative sizing.** Derive font sizes and spacing from `width`/`height` of `useVideoConfig()`. Never fixed px.
3. **Safe areas.** Keep text inside the central 80% height on `portrait` (TikTok/Reels UI overlays top & bottom).
4. **Numbers stay readable.** Final value is on screen ≥ 1.5 s after any count-up. Use `tabular-nums`. Format with `toLocaleString("en-US")`; compact (1.2k) only above 10,000.
5. **Unavailable / estimated** values have a visible treatment (e.g. "~" prefix + footnote). Unavailable metrics skip their beat; they never render as 0.
6. **Long content.** Long repo names truncate with ellipsis; scene must handle 0–5 repos and 0–N languages.
7. **Reduced motion (web).** Honour `prefers-reduced-motion`: Player shows scenes at their final frame with simple fades.
8. **Fonts & assets** load via `staticFile()` / `@remotion/google-fonts` with `delayRender` so Lambda renders don't flash fallback fonts.

## Planned scenes (target ~90 s at 30 fps)

| #   | id            | Content                                                | Climax                                         |
| --- | ------------- | ------------------------------------------------------ | ---------------------------------------------- |
| 1   | intro         | first week lights up, `@login · 2026`, title           | ✅ 8 beats, ink                                |
| 2   | contributions | total count-up, active days, streak                    | ✅ 16 beats, persimmon; kick enters on its cut |
| 3   | rhythm        | calendar heatmap draws in, busiest month, weekday bars | ✅ 20 beats, paper                             |
| 4   | tech-dna      | top language, rows of 5% cells per language            | ✅ 16 beats, cobalt                            |
| 5   | projects      | repo cards one by one, top repo spotlight              |                                                |
| 6   | community     | stars/forks gained, most starred                       |                                                |
| 7   | engineering   | PRs/merged/issues/reviews counters                     |                                                |
| 8   | identity      | archetype reveal + reasons                             | music drop                                     |
| 9   | closing       | summary grid, wrapyourgit.app/u/login                  | outro                                          |

## Audio

- Files in `packages/video/public/audio/`, licences in `LICENSES.md` there ([ADR-0007](../architecture/decisions/0007-soundtrack-sourcing.md)).
- `<Html5Audio>` (`<Audio>` is deprecated in Remotion 4.0.540) with a volume curve that fades the last two beats; SFX via `<Sequence>`-scoped `<Html5Audio>`.
- Spike B placeholder: `placeholder-120bpm.wav`, synthesised by `scripts/synth-placeholder-track.ts` from `TRACK` (120 BPM = 15 frames per beat; pad and riser for 8 beats, then kick, hats and bass).
- Track metadata (`bpm`, `offsetMs`, sections) drives scene durations: each scene snaps to a whole number of beats.
- Web: Player starts muted or waits for a tap; never autoplay sound.

## Export

| Setting | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                               |
| FPS     | 30                                                                                        |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                |
| Where   | Remotion Lambda ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md)) |

Local test render: `bun run --filter @wyg/video render wrap-9x16 out/test-9x16.mp4`
