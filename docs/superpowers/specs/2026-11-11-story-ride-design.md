# Story as a ride: design

Date: 2026-11-11, updated the same day with the answers to the builder check. Status: draft, waiting for the maintainer's approval.

Supersedes the picture and camera of [the story world](2026-11-06-story-world-design.md) (its player, exports, sound model, stops and privacy rules stay). Follows the landing's isometric style ([ADR-0021](../../architecture/decisions/0021-isometric-cell-and-dioramas.md)).

## Intent

The maintainer's reference is GitHub Unwrapped: one character carries the viewer through the whole video, the camera moves into the screen, and something moves in every second. Today's story world flies a flat camera over an isometric city and then covers the city with a side-view card per chapter, each in its own style, so it reads as fourteen separate boxes.

The new story is **a train ride through the year**. Cell drives a small engine along one winding rail. The year's 365 contribution squares lie on both sides of the rail and wake up as the train nears. Twelve gates, one per month, stand over the rail. Each chapter is a **station** beside the rail where one big object builds itself from the data. The camera rides behind Cell into the screen, lifts overhead, tracks from the side, and at each station settles on the landing's isometric angle.

The direction was found through throwaway spikes on 2026-11-11, which the maintainer watched and corrected one by one. The last spike (`packages/video/src/world/spike/RideSpike.tsx` and `persp.tsx`) is the visual reference for this design. It is not product code and is deleted when the real build lands.

## Goals

1. **One ride.** One rail, one train, one Cell from the first frame to the last. The train is on screen at every stop, and the travel between stops is the train moving along the rail.
2. **The year is the ground.** Every day of the year is a square beside the rail, coloured by its contribution level (`heatLevels`), flat until the train nears, then lit and raised a little. The month gates carry the month's name.
3. **One hero per station.** Each chapter turns its numbers into one large object on a paved plaza beside the rail. Nothing floats: there is ground, a horizon with a skyline, and a night sky.
4. **A camera that rides.** Between stations the camera sits behind Cell and moves forward into the screen, with variety: an overhead shot that follows the train, a low shot from the side. At a station it lifts to the isometric angle (45 degrees round, 30 degrees up, long lens).
5. **Numbers live on objects.** Every value and word is printed on something in the world: on the hero's faces, on a plaque, on a station board, on a month gate. Nothing is laid over the scene.
6. **Crisp and flat.** Every face is one flat colour by the way it faces. No gradients, no glows, no blur. Detail is painted on faces (windows, wheel hubs, stripes, crate frames), not added as more plain boxes.
7. **Same contract as today.** The web story, the MP4 in four formats, and the slides come from one composition (ADR-0002), render in the viewer's browser (ADR-0016), with no WebGL (ADR-0013).

## Non-goals

- New metrics, schema changes, or changes to `packages/analytics`. Every number shown comes from the existing scene models (`world/scenes/*.model.ts`).
- The landing page, the dashboard, the share card and the public page's layout. They keep the baked isometric art of ADR-0021.
- The organisation-access flow (issue #79).
- A day sky, weather, or seasons along the ride.

## Anti-goals (a failure even if it works)

- A wrong, unlabelled or unreadable number, or an estimated value without its mark (AGENTS.md rules 1 and 2). "Unavailable" never draws as an empty hero that looks like zero.
- Text that cannot be read at the stop's rest frame on a phone: printed too small, at too steep an angle, hidden behind another object, or below WCAG AA contrast.
- Any card, chip, panel or caption laid over the scene.
- A hero that reads as a pile of plain boxes, or a frame where the subject floats on an empty background.
- Gradients, glows or blur anywhere in the story.
- The web story and the files showing different pictures, or a file that renders much slower than today's.
- A private repository's name where the owner hid names, or any private data on a public surface (AGENTS.md rule 6).

## What the previous design said that changes

- "Every stop is a new picture; nothing seen at one stop appears at another" is dropped. The train and Cell are in every picture on purpose.
- "Every chapter lives inside a day's building; the camera dives into it" is dropped. Chapters are stations beside the rail.
- "Each stop sits on a day of the city" is dropped as a position. Stations stand at even intervals along the rail (the maintainer's choice on 2026-11-11), because real dates can sit days apart and a station needs room.
- "The web story shows one still frame at rest" is dropped. A resting station keeps moving in a short loop (the maintainer's choice on 2026-11-11).
- Kept: the stops and their order from `buildStops`, the letter's pages sharing one place, tap to move and tap back to reverse, the progress bar and copyright line, the sound model, exports in the browser, and every privacy rule.

## Approaches considered

1. **Isometric map with a following camera** (spikes 1 to 6). One orthographic view, districts on a map, later a train with the camera chasing from the side. Rejected by the maintainer: the direction of travel never changes and the camera never goes into the screen.
2. **2D cartoon with fake depth** (spike 9). Flat rounded drawings scaled by distance, parallax layers, gradients. Rejected by the maintainer: too many gradients, and it does not match the landing.
3. **Crisp boxes through a perspective camera, drawn as SVG** (spikes 7, 8, 10, 11). Chosen. A small pinhole camera projects boxes to SVG polygons, so the camera can ride into the screen and also sit at the isometric angle (far away with a long lens), all in the landing's flat-face style and without WebGL.

Live WebGL stays ruled out by ADR-0013.

## The world

### Track

- One rail along the year. A week is a fixed length of track (`WEEK`); the year starts a little after the first station. The rail winds gently left and right (a smooth curve, no sharp corners) so the horizon turns during the ride.
- Sleepers and two rails are drawn in short pieces that follow the curve, on a strip of ballast.
- The 7 days of each week sit beside the rail, 3 on the left and 4 on the right, turned to the rail's heading.

### Squares

- A day with contributions is a square in its `heatLevels` colour, with a lighter inset on top. It lies flat and dim until the train is within a set distance, then lights and rises by a small height per level. A day with zero stays a dim flat square.
- In a provisional year, days after `periodEnd` are outlines only, never dim squares: a day that has not happened must not look like a day with zero (same rule as today's city).

### Month gates

- One gate at the first week of each month: two posts on bases, a lit beam, a sign with the month's three-letter name.
- A gate that would stand between the camera and a station's hero is left out.

### Ground, horizon, sky

- Flat ground colour to the horizon; a thin haze band at the horizon line; flat night sky above with small stars and a crescent moon that turn with the camera.
- A far skyline all round the horizon: one flat tower per week, height from that week's total.
- Beside the rail, outside the squares: trees, bushes, rocks and lamp posts, placed from a seed (`random(seed)`), left out near stations.
- Distance fog toward the haze colour hides the far end of the rail.

### Where the rail starts and ends

- The rail always runs the whole year, from a first platform a little before the first week to a terminus with buffers a little after 31 December. A week is a fixed length of rail, chosen so the stations fit at even intervals along the year.
- In a provisional year the days after `periodEnd` are outline squares, and the gates of months that have not started carry the month's name and no total. The train still rides to the terminus, past days that have not happened, so the year visibly is not over. The closing station's board carries the model's date line, as today.

### The city stop

- The train waits on the rail between the stations before and after it; the camera lifts far above it until the whole rail is in frame.
- For this one shot every day with data lights, in a wave that spreads out from the train as the camera rises, and settles back as it comes down. A day with zero stays dim.
- The total is printed on one very large billboard beside the rail, sized so it reads at this distance.
- At this distance sleepers and small props are not drawn and the rail is drawn as long strips, so the shot stays inside the polygon budget.

### Train and Cell

- Engine: chassis with a stripe, boiler with a round headlamp, chimney with a cap, a low bunker with tail lamps, six wheels with hubs, a front bumper. Two wagons of green cargo follow, each turned to its own piece of rail.
- Smoke puffs rise from the chimney and fade.
- Cell rides on the engine: one block with eyes and mouth on its front, a small pack on its back (so it reads from behind), two arms, two feet, and the crest of three cells. It is drawn live from boxes every frame. Moods: `ride` (small bounce, one arm waving), `idle`, `cheer` (both arms up, mouth open, bigger hops). It blinks. At a station it turns to face the camera.
- At the archetype station Cell wears the archetype's gear and colour (the gear of `IsoCell` in ADR-0021, rebuilt as boxes for this renderer).
- The baked PNG art stays for pages and the card; the story no longer uses it.

## Stations

The stops and their order come from `buildStops` unchanged; the plots it assigns are no longer used for position. Stations stand at even intervals along the rail in story order, from the first platform to the terminus, so two stations never crowd each other and the train never reverses during the story. Plazas alternate between the two sides of the rail, which lets a station be about half as far from its neighbour as a plaza is long; at a rest frame the neighbouring plazas are out of frame or behind the camera. The letter's pages share one station. The city stop has no plaza and takes no interval of its own.

Real dates are told in two ways: printed on the station (the first day's date on its flag, the busiest day's date and count on its tower), and marked on the year itself, where the first active day's square and the busiest day's square each carry a tall lit beacon that the train passes on its way.

Each station is a paved plaza beside the rail with a green rim, bollards with lamps, and a step toward the rail. Every number comes from the stop's existing model.

| Stop        | Hero on the plaza                                                                                                                                                                                                                                                                                                                | What is printed, and where                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hello       | Cell on the engine at the first platform                                                                                                                                                                                                                                                                                         | The platform's board: the year and `@login`; the model's scope line on a second board when present                                                        |
| first-day   | One large square on the plaza with a sprout growing from it, a flag beside it                                                                                                                                                                                                                                                    | The flag: the date and weekday. Board: "First square"                                                                                                     |
| private     | A locked vault; no names anywhere                                                                                                                                                                                                                                                                                                | A plaque on the vault door: the private count, or the model's unavailable text. Board: the model's note                                                   |
| city        | No plaza: the camera is high above the whole rail and the lit year                                                                                                                                                                                                                                                               | A long board beside the rail: the total and the model's headline; its caption and legend on the board's second line                                       |
| busiest     | The tallest tower on the plaza, a flag on top                                                                                                                                                                                                                                                                                    | The tower's faces: the count. The flag: the date. Board: the model's headline                                                                             |
| rhythm      | A siding with seven wagons, Sunday to Saturday, cargo by weekday                                                                                                                                                                                                                                                                 | Each wagon's side: the weekday and its count; the busiest wagon in the brightest green. Board: the title                                                  |
| languages   | A podium, one block per language (up to 5), height by share                                                                                                                                                                                                                                                                      | Each block's sides: logo (`languageIcon`, or `languageInitials` in a badge), share, name. Board: "Top languages", the title, the "everything else" note   |
| projects    | A stack of shipping containers, one level per repository, the largest at the bottom. Every level is a rack of the same length; its painted part is as long as the repository's share of the largest (changed from crate towers on the maintainer's word: boxes were already the languages' hero, and the plaques hid the towers) | Each container's long sides: `repoLabel` and the commits. A low sign on the ground between the rail and the plaza: the model's title                      |
| community   | An observatory; stars earned rise from it as small lit cubes; a signpost                                                                                                                                                                                                                                                         | The observatory's face: the stars value and label. The signpost: forks. Both in the model's wording                                                       |
| engineering | A small airfield: box planes in the air for pull requests in flight, parked ones for merged                                                                                                                                                                                                                                      | A departures board on the plaza: the model's three rows (sent, merged, reviews)                                                                           |
| archetype   | A stage with a flat spotlight shape on its floor; Cell in costume                                                                                                                                                                                                                                                                | The stage's front: the archetype's title. Board: "This year you were" and the reasons                                                                     |
| versus      | A balance with two stacks, last year and this year                                                                                                                                                                                                                                                                               | Each stack's face: its year and value. Board: the model's comparison or its unavailable text                                                              |
| letter      | A post box and a writing desk beside the rail; on arrival the letter opens as today's paper sheet, filling the frame as it does now, one page per stop                                                                                                                                                                           | The sheet: the page's text. `letterGeometry`, the pagination and the baked `HeadArt` letterhead are unchanged, so page counts per format stay as they are |
| closing     | The terminus: buffers at the end of the rail, fireworks of small cubes                                                                                                                                                                                                                                                           | A large board at the buffers: the year, the date and the model's headline lines                                                                           |

Rules for all stations:

- Counting-up numbers are allowed on the way in, but the value at the rest frame is the exact value.
- An unavailable metric shows the model's unavailable text on the station's board and a hero in a visibly "closed" state (shutters down, covered), never an empty hero.
- Estimated values are printed exactly as the model words them ("about 12.9k" from `countText`, "~" from `metricValue`). No new wording and no new footnote text is written for this design.
- Long repository and language names truncate with an ellipsis; stations handle 0 to 5 repositories and 0 to 5 languages.
- Heroes build with a spring (drop in, land, settle) and keep a small idle motion, so no rest frame is frozen.

## Camera

A pinhole camera placed by its angle round the engine (`theta`), distance, height, lens and what it looks at. Four shots:

| Shot | Where                                                                                        | Used                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| RIDE | Straight behind Cell, low, wide lens, looking down the rail                                  | The default between stations; sways a little, bumps at rail joints, rolls into bends; speed streaks while fast |
| OVER | 45 degrees round, high, following the train                                                  | Part of a long move                                                                                            |
| SIDE | Low beside the train, wheels at eye level                                                    | Part of a long move                                                                                            |
| ISO  | 45 degrees round, 30 degrees up, far away, long lens, looking between the train and the hero | Every station's rest frame                                                                                     |

- A move between two stations runs ISO, down to RIDE, optionally OVER or SIDE in the middle, up to ISO. Which middle shot a move uses is fixed by the stop's index, so it is the same on every play and in every file, and neighbours differ. Short moves skip the middle shot.
- Distance, height and lens change on a log scale so a lift-out is one smooth pull.
- hello is stop 0, so its rest frame is frame 0 with no move into it: a medium shot from the front and a little to the side, Cell and the engine on one side of the frame and the platform board (year, `@login`) readable on the other. The swing round behind Cell is the start of the move to first-day. hello is the one station that does not rest at ISO.
- city is OVER pulled far out (see The city stop). A letter page turn does not move the camera.
- The rest frame of every stop is still except for idle motion: no sway, no roll.
- Formats: the lens widens for portrait so the hero and the train both fit; framing is by layout family (`portrait`, `compact`, `landscape`), not by ratio.

## Text: every number lives on an object

Visual reference: `RideSpike.tsx` at frames 290 (languages) and 570 (projects).

The maintainer rejected three overlay treatments on 2026-11-11: a small card ("not visible enough"), a large slide panel ("unbalanced with the illustration"), and a ranked list card with floating chips ("slop; labels pile up"). The rule that came out of it, taken from GitHub Unwrapped: **numbers and words are part of the illustration**. Nothing is laid over the scene, so nothing can cover or fight the animation.

- **On the hero.** A value is printed on the object it measures, lying on its face in perspective: a language block carries its logo, then its share in large type, then its name, on every side; a crate tower has a plaque in front of it with the repository and its commit count; the busiest day's tower carries its count; and so on for each station.
- **On signs.** Each station has a name board on two posts at the end of its plaza: the chapter's name and the model's headline. The first platform has a board with the year and `@login`.
- **On the gates.** Each month gate's sign carries the month and the contributions made before the 1st of that month ("MAY", "432 so far"), summed by date from `contributions.calendar`, so the running total rides along without a counter on screen. January's gate shows the month only. This is a presentation of the calendar, not a new metric: it gets a small pure model with a test (the last gate's figure plus the days after it equals `contributions.total`) and one line in `docs/analytics/metrics.md`. The spike summed whole weeks; that is wrong by up to six days and must not be copied.
- **Ink.** Text on a coloured face is white or dark by the face's luminance; text on a board is white or near-white on the board's dark face. Both meet WCAG AA at the stop's rest frame. A printed line shrinks to fit its face; a name too long for it truncates with an ellipsis.
- **No overlays.** No cards, chips, panels or captions over the scene. The only things drawn over the picture are the chrome's progress segments and copyright line, as today. The letter's paper sheet is the one exception (see Calls).
- **Exact at rest.** A number may count up while its object builds; at the rest frame it is the exact value, in the model's own wording, estimates included.

### How big printed text must be

At a stop's rest frame, in every format:

- A headline value's capital height is at least 4% of the frame's shorter side; a name or a second line at least 2.2%.
- When a station cannot meet that (five languages, five repositories, seven wagons), give way in this order: bring the camera closer or lengthen the lens; lay the hero out in two rows; print only on the faces toward the camera. The train may then be partly out of frame, but Cell stays in it.

## Renderer

- A new module in `packages/video/src/world/ride/`: a pure projection (`project`, face culling, depth sort, decals) and a React layer that paints the result on one `<canvas>` (2D context, not WebGL). The first build drew SVG elements, and failed the gate: `@remotion/web-renderer` writes an `<svg>` out as text and loads it back as an image on every frame, which cost about 129 ms a frame for some 2,000 shapes; it draws a canvas as it is. Ground pieces and standing objects are sorted in two passes so the ground never covers an object.
- Boxes may be turned about the vertical axis. Faces carry decals: rectangles or discs in the face's own units. Logos print on faces as images drawn under the face's matrix.
- Only what the camera can see is built for a frame (squares, sleepers, props and gates within a window along the rail).
- Everything is a function of the frame: `interpolate`, `spring`, `random(seed)`. No `Math.random`, no time, no CSS transitions (AGENTS.md rule 3).
- Inside the web-renderer limits of ADR-0016: no z-index, no 3D CSS transforms, no filters, no clip paths. The frame's roll uses a 2D rotate on one wrapper.

## Timeline, player, sound, exports

- `buildWorld` keeps `stops` and a timeline with `stopFrames`, `moveFrames`, `inPlace` and `durationInFrames`, which is all the player, the controller and `slideFrames` read. Stations are evenly spaced, so moves are about the same length: between 1.6 and 4.2 seconds, the longer ones where a middle shot plays. The train pulls away, cruises and pulls in, so its top speed is a third over its average and a gate's sign can be read on the way past. Holds stay 3 seconds in video mode.
- **Everything builds on the way in.** A hero's build (blocks dropping, crates stacking, numbers counting up) plays during the last part of the move into its station and is finished at the stop's frame. The rest frame is therefore complete and exact in the web story, in the MP4 and in the slides. The spike built its heroes after stopping; that is not the rule.
- **A station is alive at rest.** The timeline gains a rest loop per stop: a short run of frames after the stop's frame (two seconds) in which only idle motion plays: smoke, Cell blinking and waving, small sway on the hero. Every idle cycle divides the loop's length, so the loop's last frame leads back into its first without a jump (the rule `three/pose.ts` already follows). In interactive mode the player plays this loop while it waits for a tap; in video mode the 3 second hold plays the same motion.
- The player changes for this: it needs a clock while resting, and a tap must start the move without a visible jump from wherever the loop is. How (finish the loop quickly, or start the move from the loop's current phase) is the builder's choice. Under `prefers-reduced-motion` there is no rest loop and stops crossfade as today.
- Interactive mode otherwise works as today: a tap plays the move to the next station; a tap back plays it in reverse (the train reverses).
- Slides are taken at the stop's frame, the first frame of the rest loop.
- Sound: the track and the arrival sounds stay. A new travel sound, wheels on rails, plays for every move that is not a page turn and replaces the per-stop travel sounds. It is synthesised by `scripts/synth-sfx.ts` like the others (CC0, ADR-0009).
- Exports: the same four MP4 formats and the 4:5 slides, one per stop at its rest frame, where the camera is at ISO and every printed value is at its exact figure.

## Build order

1. **Engine and proof.** The renderer with tests (projection, culling, sorting, decals, printed text), the track, squares, gates with their totals, ground and sky, the train and Cell, the camera shots, the station board. Stations: hello, city, languages, projects, closing. It runs as a second composition beside today's story. **Gate:** it renders through `renderMediaOnWeb` in a real browser in all four formats, the picture matches the Player, and an MP4 takes no more than 1.5 times as long as today's. There is no automated harness for this: it is checked by hand through `ExportPanel`, timing today's story first on the same machine. If the gate fails, stop and bring the numbers back to the maintainer before building more.
2. **All stations.** The remaining nine, each with its edge fixtures (`emptyRecap`, `busyRecap`, `provisionalRecap`, one language, public sample).
3. **Switch over.** Timeline with rest loops, the player's resting clock, sound, and exports on the new composition, the old scenes, `CityLayer` and `camera.ts` removed (`world/city.ts` stays: the landing uses `buildCity`), the spikes deleted, ADR-0022 (supersedes the picture and camera of the story world, amends ADR-0013's story section), `DESIGN.md` and `docs/video/scene-system.md` updated.

Each phase is its own issue, branch and pull request.

## Left to the builder

- Exact sizes, colours within the existing palette, spring constants and prop density.
- How each hero's detail is drawn, within goal 6.
- File layout inside `world/ride/` and how scenes share helpers.
- Which moves get OVER and which get SIDE, as long as neighbours differ.
- How the player leaves a rest loop on a tap without a visible jump.
- The exact week length and station interval, and how neighbouring plazas stay out of a rest frame.
- The polygon budget per frame that keeps the gate.

## Calls made by the author, for the maintainer to check

- The story stays at night (dark), matching the landing.
- Moves get longer (1.6 to 4.2 s, from 1.1 to 2 s), so a full video grows by roughly 15 to 20 seconds.
- One travel sound (rails) replaces the per-stop travel sounds.
- The letter stays a paper sheet over the scene; it is the one place where text covers the picture, because a letter cannot be read printed on a block.
- The story's Cell is drawn live from boxes, so it will differ slightly from the baked Cell on the pages.
- The rhythm stop's seven wagons stand on a siding; the engine and its two wagons stay as the ride's train.
- Plazas alternate sides of the rail so evenly spaced stations fit inside the year.
- The train rides the whole year even when the year is provisional, past outline days, to a terminus after 31 December.
- The gate totals are treated as a presentation of the calendar, not a new metric.
- hello rests on a front medium shot, not at ISO.
- The minimum printed sizes above (4% and 2.2% of the shorter side).
- The colours are the GitHub-dark tones of the isometric kit (`three/diorama/isokit.tsx`), not `theme.ts`'s paper palette.
