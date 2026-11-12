# Scene system

How the story and the exported files are built. Code: `packages/video/src/world/ride`. Design and the decisions behind it: [the story ride spec](../superpowers/specs/2026-11-11-story-ride-design.md) and [ADR-0023](../architecture/decisions/0023-the-story-is-a-train-ride.md).

## Building blocks

| Concept       | Where                                     | Notes                                                                                                                                                              |
| ------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RideStory`   | `ride/RideStory.tsx`                      | The one composition: the scene on one canvas, the letter's sheet, the chrome, and in a video its sound. Props `{ data, mode, music?, letter?, idle? }`             |
| `buildRide`   | `ride/model.ts`                           | Pure model of the city, the stops and the timeline (`@wyg/video/ride`); `rideFrame` gives everything on screen at a frame; `rideDuration` gives the length         |
| Compositions  | `src/Root.tsx`                            | `ride-9x16`, `ride-4x5`, `ride-1x1`, `ride-16x9` (duration from the data via `calculateMetadata`), plus the `art-*` bake compositions                              |
| Stops         | `world/stops.ts`, `ride/stops.ts`         | `RIDE_KINDS` in story order, from `hello` to `closing`, each with a place on the rail; `letter: false` (the public page) leaves the letter's pages out             |
| Stations      | `ride/stations/`                          | `STATIONS`: what each stop builds on its plaza from the scene models (`world/scenes/*.model.ts`), and the town round it (`scenery.ts`)                             |
| Track, land   | `ride/track.ts`, `ride/land.ts`           | The rail through the year, a square per day beside it, a sign per month with the total so far (`gates.model.ts`), the island and the sky                           |
| Camera        | `ride/camera.ts`                          | The station shot, fitted to each hero in each format; one glide from one station to the next; the overview of the whole year at the city stop                      |
| Timeline      | `ride/timeline.ts`                        | Moves of 1.6–4.2 s; the train pulls away, cruises and pulls in; a hero builds over the end of the move in; a stop holds 3 s in a video, a 2 s rest loop on the web |
| Drawing       | `ride/project.ts`, `prims.ts`, `paint.ts` | A pinhole camera projects boxes to flat polygons sorted far to near (`under` floors first); `RideCanvas` paints them on one `<canvas>`                             |
| Layout family | `layoutForSize()`                         | `portrait` / `compact` / `landscape` ([ADR-0003](../architecture/decisions/0003-layout-families.md)); a station lays its hero out by family                        |
| Fixtures      | `src/fixtures/`                           | `sampleRecap` for Studio; `emptyRecap`, `busyRecap` and `provisionalRecap` for edge checks                                                                         |
| Track (music) | `src/audio/world-track.ts`                | `WORLD_TRACK`: 90 BPM, intro, a seamless loop region and an outro; `worldBeats(n)`                                                                                 |
| Sound effects | `world/sound.ts`, `WorldSfx`              | The rails for every move, an arrival sound per stop; `WorldSfx` plays them in video mode on `@remotion/media`'s `<Audio>`                                          |

## Rules

1. **Deterministic.** Everything comes from the frame: `rideFrame` is a pure function of it, idle motion repeats every 60 frames, and noise comes from `random("seed")`. See [ADR-0002](../architecture/decisions/0002-one-composition-for-web-and-video.md).
2. **Numbers live on objects.** A value is printed on what it measures or on the station's sign; nothing is laid over the scene except the letter's sheet.
3. **Printed text must be readable.** At a stop's rest frame, in every format, a headline value's capital height is at least 4% of the frame's shorter side and any other line at least 2.2% (`ride/readable.test.ts`). A line too long for its face goes onto two rows instead of shrinking.
4. **Nothing pops.** A hero is lowered in as the train comes in and stands until it is out of the frame; signs stand still; the camera glides once a move.
5. **Unavailable / estimated** values keep their own state: an estimate says "about", unavailable is said in words and never drawn as 0.
6. **Long content.** Long names are clipped with an ellipsis; a station handles none up to as many as its model shows (the top repositories, five languages).
7. **Reduced motion (web).** Under `prefers-reduced-motion` there is no rest loop and the player crossfades between stops.
8. **Fonts and pictures** load before a frame is captured: `RideCanvas` holds the render until the font and every logo or archetype frame have been painted.
9. **Web-renderer limits.** The scene is one canvas; everything else on screen (the letter's sheet, the chrome) stays inside what `@remotion/web-renderer` can draw ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)).

## Stations

Order lives in `world/stops.ts`; places on the rail in `ride/stops.ts`. Stations stand at even intervals on alternating sides of the rail. The letter's pages share one place, so moving between them is a page turn.

| Stop        | Station                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hello       | the first platform; a board with the year and `@login` (and the public-data line on a public recap)                                                                                                                                                        |
| first-day   | the start of the contribution graph as a wall, the first day lit; the square large on a plinth with a flag                                                                                                                                                 |
| private     | a locked vault with the private count on its side and no names; open and empty when there is nothing                                                                                                                                                       |
| city        | the overview of the whole year, a billboard with the year's total                                                                                                                                                                                          |
| busiest     | the tallest tower of the year beside the calendar page of that day; the count on its base                                                                                                                                                                  |
| rhythm      | a siding with seven wagons, Sunday to Saturday, each loaded by its share of the busiest weekday                                                                                                                                                            |
| languages   | a podium of blocks, one per language, as tall as its share, with its logo, share and name                                                                                                                                                                  |
| projects    | a stack of shipping containers, one per repository, each painted as long as its share of the largest                                                                                                                                                       |
| community   | an observatory with the stars on its hall and small stars rising from the dome; forks on the sign                                                                                                                                                          |
| engineering | a junction: merged pull requests on the main line, open ones on the branches, a board of the three counts                                                                                                                                                  |
| archetype   | the landing's city block for the archetype, playing its loop, its name on a board behind it                                                                                                                                                                |
| versus      | a seesaw with one weight per year, tipped by the model's angle                                                                                                                                                                                             |
| letter      | a writing desk and a pillar box; the letter comes up as a sheet of paper, one stop per page                                                                                                                                                                |
| closing     | the terminus: buffers, and a party on a plaza: a gate with the year crowned by the months, a podium with the numbers and a trophy that Cell hops off the train to stand by, balloons on strings, a carpet, gifts, spotlights, bunting, confetti, fireworks |

Cell is the only mascot ([ADR-0012](../architecture/decisions/0012-one-mascot-photo-backdrops.md)). On the ride it is built from boxes on the engine (`ride/cell.ts`); the archetype station shows its baked city block ([ADR-0022](../architecture/decisions/0022-archetype-art-is-a-city-block.md)). Re-bake after changing a look or motion: `bun scripts/render-art.ts <id>` ([ADR-0013](../architecture/decisions/0013-baked-animation-no-webgl.md)).

Check a station by eye: `bun scripts/ride-stills.ts <kind> [outDir] [--fixture <name>] [--offset <frames>] [--format <id>]` renders its rest frame.

Privacy: stations name repositories only through `repoLabel()` (`src/present.ts`). Which names reach the ride is decided before the composition, by the data it is given: `toPublicRecap` on public surfaces, the owner's choice in their own story and files ([ADR-0017](../architecture/decisions/0017-private-names-follow-the-owner.md)).

## Audio

See [ADR-0009](../architecture/decisions/0009-sound-design.md). Files in `packages/video/public/audio/`, licences in `LICENSES.md` there.

- **Track:** `world-90bpm-v1.m4a`, synthesised by `bun scripts/synth-world-track.ts` from `WORLD_TRACK`. Beats 0–32 are the intro, 32–160 the loop region (rendered circular), 160–192 the outro.
- **Effects:** `SFX` in `src/audio/sfx.ts`, WAV files in `audio/sfx/`, synthesised by `bun scripts/synth-sfx.ts`. Every move that is not a page turn plays `rails`, the wheels on the rails: a short loop played for as long as the move, rolling in as the train pulls away and fading as it pulls in. Each stop has its arrival sound (`world/sound.ts`).
- **Video:** `RideStory` in `video` mode mixes the track in (`StoryMusic`: once to the loop end, then the loop region, fading over the last two beats) and places every sound with `WorldSfx`.
- **Web:** the player passes `music: false` and `mode: "interactive"`, so the composition plays no audio. The music runs on Web Audio (`apps/web/src/app/recap/use-music.ts`); the effects play on the tap that moves (`use-sfx.ts`), the rails cut to the move's length. Both follow the sound toggle.

## Export

| Setting | Value                                                                                       |
| ------- | ------------------------------------------------------------------------------------------- |
| Codec   | H.264 + AAC                                                                                 |
| FPS     | 30                                                                                          |
| Sizes   | 1080×1920, 1080×1350, 1080×1080, 1920×1080                                                  |
| Where   | The viewer's browser ([ADR-0016](../architecture/decisions/0016-exports-in-the-browser.md)) |

Local test render: `bun run --filter @wyg/video render ride-9x16 out/test-9x16.mp4`. In the browser, `/recap/ride` (development only) renders the ride and shows its time a frame against the budget.

`RideStory` renders every file in the viewer's browser: the MP4 with `renderMediaOnWeb`, and slides (PNG, ZIP, PDF) as one 4:5 still (1080 × 1350) per stop, letter pages included, taken on the stop's own frame, where every figure is exact (`slideFrames` in `src/world/export.ts`, `@wyg/video/export`). They are made from the end of the story ("Keep your year") and from the dashboard ("Download your story"), both by `ExportPanel` (`apps/web/src/app/recap/export-panel.tsx`). The files use the same data as the owner's story: full data when the owner chose to show private repository names, with the reminder "These files include your private repository names.", otherwise `withoutPrivateNames` ([ADR-0017](../architecture/decisions/0017-private-names-follow-the-owner.md)). The share card always uses the public projection (`toPublicRecap`).

No server renders the story: the Lambda path ([ADR-0004](../architecture/decisions/0004-render-on-remotion-lambda.md)) and the server slide worker ([ADR-0011](../architecture/decisions/0011-slides-from-the-composition.md)) were removed. The Node still renderer in `scripts/lib/still.ts` remains for the dev scripts only: the art bake (`scripts/render-art.ts`) and the ride's stills (`scripts/ride-stills.ts`).
