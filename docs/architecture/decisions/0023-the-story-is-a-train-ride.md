# 0023. The story is a train ride, painted on one canvas

- Status: Accepted
- Date: 2026-11-12
- Supersedes: the picture and camera of the story world ([spec 2026-11-06](../../superpowers/specs/2026-11-06-story-world-design.md)): an isometric city of the year, a camera flying between fourteen separate scenes
- Amends: [0013](0013-baked-animation-no-webgl.md) point 4 (how the story draws Cell)

## Context

The story world was fourteen scenes, each its own picture, joined by a camera that flew over a city of the year. The maintainer found the scenes did not read as one world, the illustrations unequal, and the numbers laid over the pictures on cards and panels. They asked for one world the camera travels through, like GitHub Unwrapped: a train ride, crisp flat-colour 3D boxes with no gradients, and every number printed on an object in the scene. The design is [the story ride spec](../../superpowers/specs/2026-11-11-story-ride-design.md); it was built in three phases (#86, #88, #92).

## Decision

1. **One ride.** Cell drives an engine along one winding rail through the year. The year's contribution squares lie beside the rail, a sign per month stands beside it with the total so far, and each chapter is a station on a plaza in a town: fourteen stops, from `hello` to `closing`. Code: `packages/video/src/world/ride`, the composition `RideStory`.
2. **Every number lives on an object.** A value is printed on what it measures (a language's block, a repository's container, the vault, the junction's board) or on the station's sign. Nothing is laid over the scene, except the letter's sheet of paper at its stops.
3. **Plain maths, one canvas.** A pinhole camera projects boxes to flat polygons, sorted far to near (wide floors first), and paints them on one 2D `<canvas>`, with no WebGL ([0013](0013-baked-animation-no-webgl.md)). The first build drew SVG elements and was 3.7 times slower in the browser renderer, which writes an `<svg>` out as text on every frame; a canvas it draws as it is. Measured with all fourteen stations in Chrome at 16:9: 47.5 ms a frame against 35.9 ms for the old story, within the 1.5 times the switch-over allowed.
4. **The camera glides.** At a station it stands ahead of the train and to the side, looking back at Cell with the hero over its shoulder, fitted so the hero and its words fill the frame in every format. A move is one glide round the front of the train from one station's side to the next: no shot behind the train, no shot in the middle of the move. A hero stays standing once built, and is taken down only when out of the frame.
5. **A station is alive at rest.** In the web story a stop plays a two second rest loop (smoke, Cell blinking, the station's own small loop) until the next tap; a tap carries the loop's phase into the move, so nothing jumps. Under reduced motion there is no loop and stops crossfade.
6. **Cell on the engine is built from boxes in the scene.** The archetype station plays the landing's `skin-*` city block ([0022](0022-archetype-art-is-a-city-block.md)) frame by frame from its baked loop, as a flat picture standing on the plaza, square to the screen: the one baked picture in the ride ([0013](0013-baked-animation-no-webgl.md)).
7. **Sound.** The soundtrack and each stop's arrival sound stay ([0009](0009-sound-design.md)). Every move that is not a page turn plays one new sound, the wheels on the rails (`rails`), a short loop played for as long as the move, in the video and in the web player.

## Alternatives

- **Keep the story world and redraw its scenes.** Cheaper, but fourteen pictures joined by a flight stay fourteen pictures.
- **A 2D cartoon ride.** Spiked and rejected by the maintainer: too many gradients next to the landing's isometric look.
- **Live WebGL.** Ruled out by [0013](0013-baked-animation-no-webgl.md): phones, and the browser renderer.

## Consequences

- One composition still serves the web story, the MP4s and the slides ([0002](0002-one-composition-for-web-and-video.md), [0016](0016-exports-in-the-browser.md)); slides are each stop's own frame.
- A video is longer: about 100 seconds for the sample, against 78.
- The old scenes, `WorldStory`, its city layer and camera are removed; the scene models (`world/scenes/*.model.ts`), the stops and `world/city.ts` (the landing's `buildCity`) remain, used by the ride.
- `/recap/ride` stays as a development page that times the ride's render against the budget.
