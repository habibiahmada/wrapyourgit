# Scene system

How the story and the exported video are built. Code: `packages/video`.

## Building blocks

| Concept       | Where                          | Notes                                                                                                  |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `WrapStory`   | `src/WrapStory.tsx`            | `<Series>` of all scenes, takes `{ data: RecapData }`                                                  |
| `SCENES`      | `src/WrapStory.tsx`            | Ordered list `{ id, durationInFrames, Component }`. Also used by the web Player to seek scene-by-scene |
| Compositions  | `src/Root.tsx`                 | `wrap-9x16`, `wrap-4x5`, `wrap-1x1`, `wrap-16x9`                                                       |
| Layout family | `useLayout()`                  | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md))   |
| Theme         | `src/theme.ts`                 | Placeholder tokens until the design system (M4)                                                        |
| Fixture       | `src/fixtures/sample-recap.ts` | Fake data for Studio; add edge-case fixtures (empty year, huge numbers, long names)                    |

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

| #   | id            | Content                                                | Climax                |
| --- | ------------- | ------------------------------------------------------ | --------------------- |
| 1   | intro         | logo reveal, `@login · 2026`                           | music start           |
| 2   | contributions | total count-up, active days, streak                    | ✅ placeholder exists |
| 3   | rhythm        | calendar heatmap draws in, busiest month, weekday bars |                       |
| 4   | tech-dna      | kinetic typography for top language, animated bars     |                       |
| 5   | projects      | repo cards one by one, top repo spotlight              |                       |
| 6   | community     | stars/forks gained, most starred                       |                       |
| 7   | engineering   | PRs/merged/issues/reviews counters                     |                       |
| 8   | identity      | archetype reveal + reasons                             | music drop            |
| 9   | closing       | summary grid, wrapyourgit.app/u/login                  | outro                 |

## Audio

- Files in `packages/video/public/audio/`, licences in `LICENSES.md` there ([ADR-0007](../architecture/decisions/0007-soundtrack-sourcing.md)).
- `<Audio>` with volume curve for fade-in/out; SFX via `<Sequence>`-scoped `<Audio>`.
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
