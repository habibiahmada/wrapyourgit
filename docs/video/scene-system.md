# Scene system

How the story and the exported files are built. Code: `packages/video/src/world`. Design and the decisions behind it: [the story world spec](../superpowers/specs/2026-11-06-story-world-design.md).

## Building blocks

| Concept       | Where                        | Notes                                                                                                                                                     |
| ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorldStory`  | `world/WorldStory.tsx`       | The one composition: the city, the stop scenes and the chrome. Props `{ data, mode, music?, letter? }`; `mode` is `interactive` (web) or `video` (files)  |
| `buildWorld`  | `world/model.ts`             | Pure model of city, stops, cameras and timeline (`@wyg/video/world`), so the web player reads stop frames without React; `worldDuration` gives the length |
| Compositions  | `src/Root.tsx`               | `world-9x16`, `world-4x5`, `world-1x1`, `world-16x9` (duration from the data via `calculateMetadata`), plus the `art-*` bake compositions                 |
| Stops         | `world/stops.ts`             | `STOP_KINDS` in story order, from `hello` to `closing`; `letter: false` (the public page) leaves the letter's pages out                                   |
| Scenes        | `world/scenes/index.ts`      | `SCENES`: the picture each stop kind draws (`SceneProps`: data, stop, size, layout, `enter`, `frame`); `SCENE_TONE` for the chrome over dark scenes       |
| City, camera  | `world/city.ts`, `camera.ts` | One plot per day of the year as an isometric city; one camera per stop, interpolated by `cameraAt`                                                        |
| Timeline      | `world/timeline.ts`          | Moves of 1.1–2 s between stops; in video mode each stop holds 3 s                                                                                         |
| Layout family | `layoutForSize()`            | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md))                                                      |
| Theme         | `src/theme.ts`               | Tokens from [DESIGN.md](../../DESIGN.md): palette, font, `useUnit()`                                                                                      |
| Fixtures      | `src/fixtures/`              | `sampleRecap` for Studio; `emptyRecap`, `busyRecap` and `provisionalRecap` for edge checks                                                                |
| Track         | `src/audio/world-track.ts`   | `WORLD_TRACK`: 90 BPM, intro, a seamless loop region and an outro; `worldBeats(n)`                                                                        |
| Sound effects | `world/sound.ts`, `WorldSfx` | Travel and arrival sound per stop; `WorldSfx` plays them in video mode on `@remotion/media`'s `<Audio>`                                                   |

## Rules

1. **Deterministic.** Animate from the frame only: `enter` (how far the stop has entered) for entrances, `frame` for idle loops, `interpolate` and `random("seed")`. See [ADR-0002](../architecture/decisions/0002-one-composition-for-web-and-video.md).
2. **Relative sizing.** Derive font sizes and spacing from the frame's `size`. Never fixed px.
3. **Safe areas.** Keep text inside the central 80% height on `portrait` (TikTok/Reels UI overlays top & bottom).
4. **Numbers stay readable.** Use `tabular-nums`. Format with `toLocaleString("en-US")`; compact (1.2k) only above 10,000.
5. **Unavailable / estimated** values have a visible treatment (e.g. "~" prefix + footnote). Unavailable data keeps its own state in the picture; it never renders as 0.
6. **Long content.** Long repo names truncate with ellipsis; scenes handle 0–5 repos and 0–N languages.
7. **Reduced motion (web).** Honour `prefers-reduced-motion`: the player crossfades between stops instead of flying the camera.
8. **Fonts & assets** load via `staticFile()` / `@remotion/google-fonts` with `delayRender`, so a render never captures a fallback font.
9. **Web-renderer limits.** Every scene stays inside what `@remotion/web-renderer` can draw (listed under Export), so the player and the files show the same picture.

## Stops

Order lives in `world/stops.ts`. Each stop sits on a day of the city: first-day, busiest and closing on their real days, the other chapters on fixed days spread through the year, so the camera never doubles back. The letter's pages share one plot, so moving between them is a page turn, not a flight.

| Stop        | Scene       | Picture                                                               |
| ----------- | ----------- | --------------------------------------------------------------------- |
| hello       | `Hello`     | Cell's head fills the frame; its face is a screen saying "hi, @login" |
| first-day   | `FirstDay`  | an empty plot with one sprout and the date of the first contribution  |
| private     | `Private`   | a locked door; the private contribution count on a plaque, no names   |
| city        | `City`      | the whole city and the year's total                                   |
| busiest     | `Busiest`   | the tallest building, Cell planting a flag with the date and count    |
| rhythm      | `Rhythm`    | a seven-car train, Sunday to Saturday, cargo heaped by weekday        |
| languages   | `Garden`    | a garden; each tree's size is a language's share                      |
| projects    | `Projects`  | a shelf of crates; each repository's stack is its commits             |
| community   | `Sky`       | a night sky; stars earned are stars, forks on a sign                  |
| engineering | `Planes`    | paper planes: pull requests in flight, merged ones landed             |
| archetype   | `Archetype` | a stage under a spotlight, Cell in the archetype's costume            |
| versus      | `Seesaw`    | a seesaw weighing last year against this year                         |
| letter      | `Letter`    | the congratulations letter, one stop per page                         |
| closing     | `Closing`   | fireworks over the last day with data and the year's headline numbers |

Cell is the only mascot (ADR-0012); its looks are baked sprite sheets and WebP loops (`src/art.ts`), so the story needs no WebGL. Re-bake after changing a look or motion: `bun scripts/render-art.ts sprite-<id>` (ADR-0013).

Privacy: scenes name repositories only through `repoLabel()` (`src/present.ts`). Which repositories reach a scene is decided before the composition, by the data it is given: `toPublicRecap` on public surfaces, the owner's choice in their own story and files ([ADR-0017](../architecture/decisions/0017-private-names-follow-the-owner.md)). Metrics go through `metricValue()`: unavailable keeps its own state, estimates get "~".

## Audio

See [ADR-0009](../architecture/decisions/0009-sound-design.md). Files in `packages/video/public/audio/`, licences in `LICENSES.md` there.

- **Track:** `world-90bpm-v1.m4a`, synthesised by `bun scripts/synth-world-track.ts` from `WORLD_TRACK`. Calm and in A minor, so a stop can rest on it for minutes. Beats 0–32 are the intro, 32–160 the loop region (rendered circular, so it repeats without a seam), 160–192 the outro.
- **Effects:** `SFX` in `src/audio/sfx.ts`, WAV files in `audio/sfx/`, synthesised by `bun scripts/synth-sfx.ts`. Each stop has a travel sound while the camera flies to it and an arrival sound when it lands (`world/sound.ts`); a page turn has no travel sound.
- **Video:** `WorldStory` in `video` mode mixes the track in (once to the loop end, then the loop region for as long as the video lasts, fading over the last two beats) and places every travel and arrival sound with `WorldSfx`.
- **Web:** the player passes `music: false` and `mode: "interactive"`, so the composition plays no audio. The music runs on Web Audio (`apps/web/src/app/recap/use-music.ts`), looping the region sample-exact; the effects play on the tap that moves (`use-sfx.ts`). Both follow the sound toggle.

## Export

| Setting | Value                                                                                       |
| ------- | ------------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                                 |
| FPS     | 30                                                                                          |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                  |
| Where   | The viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)) |

Local test render: `bun run --filter @wyg/video render world-9x16 out/test-9x16.mp4`

**The story world** (`WorldStory`) renders every file in the viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)): the MP4 with `renderMediaOnWeb`, and slides (PNG, ZIP, PDF) as one 4:5 still (1080 × 1350) per stop, letter pages included, taken at the stop's rest frame (`slideFrames` in `src/world/export.ts`). They are made from the end of `/recap` ("Keep your year") and from the dashboard ("Download your story"), both by `ExportPanel` (`apps/web/src/app/recap/export-panel.tsx`). The files use the same data as the owner's story: full data when the owner chose to show private repository names, with the reminder "These files include your private repository names.", otherwise `withoutPrivateNames` ([ADR-0017](../architecture/decisions/0017-private-names-follow-the-owner.md)). The share card always uses the public projection (`toPublicRecap`), and visitors on `/u/<login>` cannot export. World scenes stay inside the web renderer's limits listed in ADR-0016 (no `z-index`, no 3D CSS, no SVG `url()` or CSS filters, no `object-position`, fonts only in SVG text, `<Audio>` from `@remotion/media`).

No server renders the story: the Lambda path ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md)) and the server slide worker ([ADR-0011](../architecture/decisions/0011-slides-from-the-composition.md)) were removed in phase 4. The Node still renderer in `scripts/lib/still.ts` remains for the dev scripts only: the art bake (`scripts/render-art.ts`) and the story world stills (`scripts/world-stills.ts`).
