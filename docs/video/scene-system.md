# Scene system

How the story and the exported video are built. Code: `packages/video`.

## Building blocks

| Concept       | Where                               | Notes                                                                                                  |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `WrapStory`   | `src/WrapStory.tsx`                 | `<Series>` of all scenes, takes `{ data: RecapData }`                                                  |
| `SCENES`      | `src/WrapStory.tsx`                 | Ordered list `{ id, durationInFrames, Component }`. Also used by the web Player to seek scene-by-scene |
| Compositions  | `src/Root.tsx`                      | `wrap-9x16`, `wrap-4x5`, `wrap-1x1`, `wrap-16x9`                                                       |
| Layout family | `useLayout()`                       | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md))   |
| Theme         | `src/theme.ts`                      | Tokens from [DESIGN.md](../../DESIGN.md): palette, allowed text pairings, font, `useUnit()`            |
| Fixtures      | `src/fixtures/`                     | `sampleRecap` for Studio; `emptyRecap` and `busyRecap` (long names, five-digit totals) for edge checks |
| Track         | `src/audio/track.ts`                | BPM, sections and `beats(n)`; scene durations are whole beats                                          |
| Transition    | `src/components/CellTransition.tsx` | Cell transition that opens every scene after the intro; variant per scene in `timeline.ts`             |
| Sound effects | `src/components/Sfx.tsx`            | `<Sfx>`, `CountTicks`; rendered by the components that move (`Slam`, bars, transitions)                |
| Accent        | `src/accents.tsx`                   | Per-scene illustration (baked cutout) passed to `Field` through `AccentContext`, drawn behind the text |

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

Accents (`src/accents.tsx`, art from `bun scripts/render-art.ts`). Each is full colour and sits in the space its scene leaves empty, with its own position per layout family, tuned from rendered stills so it never covers a number or label. Re-check with stills of all three families after changing a scene's layout.

| Scene         | Accent                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| intro         | Cell waving in from the right edge                                      |
| contributions | Cell cheering on the side away from the stat chips                      |
| rhythm        | `skin-consistent` in the gap between the calendar and the busiest month |
| tech-dna      | Cell thinking between the language name and the list                    |
| projects      | `skin-builder` between the top repository and the list                  |
| community     | Open sourcer group in the open space beside the star count              |
| engineering   | `skin-collaborator` below (portrait) or beside (landscape) the counters |
| identity      | the person's own `skin-<archetype>`, rising from the bottom             |
| closing       | Cell proud, bottom corner                                               |

Accents use a CSS filter for silhouettes (not a mask image), because Remotion waits for `<Img>` to load but not for CSS masks.

Privacy: scenes name repositories only through `repoLabel()` (`src/present.ts`), which turns every private repo into "Private repository", because the MP4 is shareable. Metrics go through `metricValue()`: unavailable skips the beat, estimates get "~" and a footnote.

## Transitions

Each scene after the intro opens with `CellTransition` (one beat). For the first half, the previous scene, frozen on its last frame and silent, moves out while cells of its field cover it (about one in ten is lit green); in the second half the cells clear in the same order and reveal the new scene. It lives at the start of the new scene so a web chapter never stops on a half-finished exit, and no scene length changes.

| Variant  | Old scene              | Cells                                     | Used by                                     |
| -------- | ---------------------- | ----------------------------------------- | ------------------------------------------- |
| `sweep`  | slides toward the wave | diagonal wave, direction alternates       | contributions, tech-dna, community, closing |
| `ripple` | shrinks slightly       | from the centre outward, seeded jitter    | rhythm, projects, engineering               |
| `zoom`   | rushes forward         | one lit cell fills the frame, then breaks | identity (the climax)                       |

## Audio

See [ADR-0009](../architecture/decisions/0009-sound-design.md). Files in `packages/video/public/audio/`, licences in `LICENSES.md` there.

- **Track:** `wrapyourgit-120bpm-v2.m4a` (AAC, 66 s), synthesised by `bun scripts/synth-track.ts` from `TRACK` (120 BPM = 15 frames per beat). Intro (pad, riser), drop at contributions (four-on-the-floor kick, sixteenth hats with an open hat on the off-beat, side-chained eighth-note bass, claps from beat 24, snare fills every fourth bar), arpeggio and lead hook from beat 40, two beats of rest and a crash at the identity climax, half-time outro over closing. A soft-clip master stage keeps it dense at -1 dBFS. Regenerate whenever `TRACK` or the timeline changes.
- **Loop:** `TRACK.loop` is beats 40–88 (20–44 s): same chord at both ends, nothing building inside (`track.test.ts`).
- **Effects:** `SFX` in `src/audio/sfx.ts`, WAV files in `audio/sfx/`, synthesised by `bun scripts/synth-sfx.ts`. Rule: **the sound comes from the component that moves.** `Slam` plays `pop` (pass `sound="land"`, `"blip"`, `"shimmer"` or `null` when another element already sounds on that frame); `CountTicks` ticks on each visible change of a count-up (at most every 2 frames) and lands at the end; bars and rows use `blip` with a rising `step`; accents pop or whoosh in; transitions play `whoosh` then `cells`. Slams on frame 0 are silent (the transition sounds there).
- **Video:** `WrapStory` mixes the track in (`music` defaults to true) with a two-beat fade at the end; effects are mixed by Remotion.
- **Web:** the Player gets `music: false` and plays only the effects, muted with the sound toggle. The music runs on Web Audio (`apps/web/src/app/recap/use-music.ts`): played from the first hello, it loops 20–44 s sample-exact for as long as the chapters last, and fades out over 1.4 s on the audio clock when the last chapter's animation ends or the story moves past it. Replay and sound are icon buttons at the top right.

## Export

| Setting | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                               |
| FPS     | 30                                                                                        |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                |
| Where   | Remotion Lambda ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md)) |

Local test render: `bun run --filter @wyg/video render wrap-9x16 out/test-9x16.mp4`
