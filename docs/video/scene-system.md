# Scene system

How the story and the exported video are built. Code: `packages/video`.

## Building blocks

| Concept       | Where                                | Notes                                                                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `WrapStory`   | `src/WrapStory.tsx`                  | `<Series>` of all scenes, takes `{ data: RecapData }`                                                   |
| `SCENES`      | `src/WrapStory.tsx`                  | Ordered list `{ id, durationInFrames, Component }`. Also used by the web Player to seek scene-by-scene  |
| Compositions  | `src/Root.tsx`                       | `wrap-9x16`, `wrap-4x5`, `wrap-1x1`, `wrap-16x9`                                                        |
| Layout family | `useLayout()`                        | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md))    |
| Theme         | `src/theme.ts`                       | Tokens from [DESIGN.md](../../DESIGN.md): palette, allowed text pairings, font, `useUnit()`             |
| Fixtures      | `src/fixtures/`                      | `sampleRecap` for Studio; `emptyRecap` and `busyRecap` (long names, five-digit totals) for edge checks  |
| Track         | `src/audio/track.ts`                 | BPM, sections and `beats(n)`; scene durations are whole beats                                           |
| Transition    | `src/components/SceneTransition.tsx` | Opens every scene after the intro; each cut has its own move, set per scene in `timeline.ts`            |
| Sound effects | `src/components/Sfx.tsx`             | `<Sfx>`, `CountTicks`; rendered by the components that move (`Slam`, bars, transitions)                 |
| Accent        | `src/accents.tsx`                    | Per-scene Cell sprite (`SpriteAccent`) or silhouette, plus field motifs, passed through `AccentContext` |

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

Cast (`src/cast.ts`, drawn by `src/three/ChibiCell.tsx`, ADR-0010 and ADR-0012). Cell is the only mascot. Five scenes show it standing, looping a baked sprite sheet with `SpriteAccent` (ADR-0013), on the field with no backdrop, in the space the scene leaves empty, with a position per layout family tuned from rendered stills so it never covers a number or label. Four scenes show it as a giant faint silhouette instead. Every scene has GitHub motifs on its field (`components/Backdrop.tsx`): contribution cells in the frame margin, and a branch graph along a free edge where marked. Re-check with stills of all three families after changing a scene's layout.

| Scene         | Cell                                                                 | Motion                  | Field motifs       |
| ------------- | -------------------------------------------------------------------- | ----------------------- | ------------------ |
| intro         | standing: green squircle, lit-cell eyes, sprout                      | waves                   | cells              |
| contributions | standing, happy eyes                                                 | jumps with both arms up | cells, branch top  |
| rhythm        | silhouette, running (sweatband)                                      | rises, sways            | cells              |
| tech-dna      | silhouette, thinking                                                 | rises, sways            | cells, branch foot |
| projects      | standing, hard hat and hammer                                        | hammers on every beat   | cells, branch foot |
| community     | silhouette, cheering                                                 | rises, sways            | cells, branch top  |
| engineering   | silhouette, headset                                                  | rises, sways            | cells, branch foot |
| identity      | standing, the archetype's own colour, gear and pose (asleep without) | per archetype           | cells, branch top  |
| closing       | standing, crown and happy eyes                                       | proud, arms akimbo      | cells              |

**Cell between chapters** (`CellDash`): for the first three beats after every cut except into identity, Cell runs sideways across the frame in the next scene's gear (alternating direction; into tech-dna and community it hops), leaving a trail of contribution cells. Standing accents enter after it has left, and a chapter's last frame never shows it.

Characters are sprite sheets (`components/Sprite.tsx`, `src/art.ts`): the story itself needs no WebGL. Re-bake after changing a look or motion: `bun scripts/render-art.ts sprite-<id>` (ADR-0013).

**Projects** shows the year's commits as a 10 × 10 waffle, 1 square = 1%, coloured by repository (top four plus every other repository, `src/share.ts`, defined in `docs/analytics/metrics.md`), with a legend of names, commits and shares; the four colours pass the dataviz palette checks on paper.

Privacy: scenes name repositories only through `repoLabel()` (`src/present.ts`), which turns every private repo into "Private repository", because the MP4 is shareable. Metrics go through `metricValue()`: unavailable skips the beat, estimates get "~" and a footnote.

## Transitions

Every cut has its own move, like a camera rather than a slideshow (the reference is GitHub Unwrapped), and no move repeats (`timeline.test.ts`). `SceneTransition` wraps the new scene for its first beat and also renders the previous scene frozen on its last frame and silent, so it can move both. It lives at the start of the new scene, so a web chapter never stops on a half-finished exit and no scene length changes. Each move plays its own sound.

| Cut                     | Move       | What happens                                                                          |
| ----------------------- | ---------- | ------------------------------------------------------------------------------------- |
| intro → contributions   | `dive`     | the camera dives into the first week's cells; a cell swells into the new field        |
| contributions → rhythm  | `tilt`     | the camera tilts down: old scene up, new scene up from below, motion blur             |
| rhythm → tech-dna       | `pan`      | whip pan sideways with blur and a slight lean                                         |
| tech-dna → projects     | `iris`     | a circle opens on the new scene, rimmed with a lit green ring                         |
| projects → community    | `blinds`   | ink and green bars sweep across like contribution rows, then fold away                |
| community → engineering | `flip`     | the frame flips like a card; the new scene is its back                                |
| engineering → identity  | `flash`    | the old scene lunges into a flash of light; the archetype lands with a camera shake   |
| identity → closing      | `pullback` | the camera pulls back: the old scene shrinks into a tilted card toward the year graph |

## Audio

See [ADR-0009](../architecture/decisions/0009-sound-design.md). Files in `packages/video/public/audio/`, licences in `LICENSES.md` there.

- **Track:** `wrapyourgit-120bpm-v2.m4a` (AAC, 66 s), synthesised by `bun scripts/synth-track.ts` from `TRACK` (120 BPM = 15 frames per beat). Intro (pad, riser), drop at contributions (four-on-the-floor kick, sixteenth hats with an open hat on the off-beat, side-chained eighth-note bass, claps from beat 24, snare fills every fourth bar), arpeggio and lead hook from beat 40, two beats of rest and a crash at the identity climax, half-time outro over closing. A soft-clip master stage keeps it dense at -1 dBFS. Regenerate whenever `TRACK` or the timeline changes.
- **Loop:** `TRACK.loop` is beats 40–88 (20–44 s): same chord at both ends, nothing building inside (`track.test.ts`).
- **Effects:** `SFX` in `src/audio/sfx.ts`, WAV files in `audio/sfx/`, synthesised by `bun scripts/synth-sfx.ts`. Rule: **the sound comes from the component that moves.** `Slam` plays `pop` (pass `sound="land"`, `"blip"`, `"shimmer"` or `null` when another element already sounds on that frame); `CountTicks` ticks on each visible change of a count-up (at most every 2 frames) and lands at the end; bars and rows use `blip` with a rising `step`; accents pop or whoosh in; each transition plays the sounds of its move (`SOUNDS` in `SceneTransition.tsx`). Slams on frame 0 are silent (the transition sounds there).
- **Video:** `WrapStory` mixes the track in (`music` defaults to true) with a two-beat fade at the end; effects are mixed by Remotion.
- **Web:** the Player gets `music: false` and plays only the effects, muted with the sound toggle. The music runs on Web Audio (`apps/web/src/app/recap/use-music.ts`): played from the first hello, it loops 20–44 s sample-exact for as long as the chapters last, and fades out over 1.4 s on the audio clock when the last chapter's animation ends or the story moves past it. Replay and sound are icon buttons at the top right.

## Export

| Setting | Value                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                                                                                   |
| FPS     | 30                                                                                                                                            |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                                                                    |
| Where   | Story world: the viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)); current story: Lambda until phase 4 |

Local test render: `bun run --filter @wyg/video render wrap-9x16 out/test-9x16.mp4`

**The story world** (`WorldStory`, development only until phase 4) renders every file in the viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)): the MP4 with `renderMediaOnWeb`, and slides (PNG, ZIP, PDF) as one 4:5 still (1080 × 1350) per stop, letter pages included, taken at the stop's rest frame (`slideFrames` in `src/world/export.ts`). Every file uses the public projection (`toPublicRecap`). They are made from the end of `/recap/world` ("Keep your year") and from the dashboard ("Download your story"), both by `ExportPanel` (`apps/web/src/app/recap/world/export-panel.tsx`). World scenes stay inside the web renderer's limits listed in ADR-0016 (no `z-index`, no 3D CSS, no SVG `url()` or CSS filters, no `object-position`, fonts only in SVG text, `<Audio>` from `@remotion/media`).

**The current story** (`WrapStory`) still exports on the server until phase 4 removes that path: the MP4 on Remotion Lambda ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md), superseded), and slides as frames of this composition: slide _n_ is the last frame of chapter _n_ in `wrap-4x5` (1080 × 1350), rendered by `renderSceneStill` (`@wyg/renderer/still`), and slide 10 is the letter ([ADR-0011](../architecture/decisions/0011-slides-from-the-composition.md), superseded). A change to a scene changes its slide automatically.
