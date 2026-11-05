# Story motion and sound: design

Date: 2026-11-05. Status: accepted (maintainer), implemented in #20.

## Intent

The story should feel like a produced video, the way GitHub Unwrapped does, not like slides. Three things carry that feeling: animated transitions between scenes, one energetic soundtrack that never stops or stutters while the story plays, and a sound for everything that moves. The web story and the exported MP4 must sound the same: the export is the same composition with the music mixed in, nothing re-timed by hand.

## Goals

1. **Transitions.** Every cut between scenes animates the old scene out and the new one in, built from the contribution-cell motif. The cuts vary (not the same wipe nine times).
2. **One soundtrack, more energetic.** Plays from the first chapter to the end of the last. On the web, where chapters wait for the viewer, it loops with no gap or pause.
3. **Sound effects.** Every animation in every scene has a sound: transitions, things appearing, counters, bars, reveals.
4. **Same sound on web and MP4.** Effects live in the composition, so the Player and Lambda play them on the same frames.

## Non-goals

- New scenes, new metrics or new copy.
- Changing scene order, lengths or the 120 BPM beat grid.
- Licensed or sampled audio. Everything stays synthesised and CC0 (ADR-0007).

## Anti-goals (a failure even if it works)

- A transition that hides a number before its 1.5 s readable hold, or covers it on the frame a web chapter stops on.
- Effects so loud or dense they drown the music, or a click storm (one sound per calendar cell).
- Any non-determinism in scenes (ADR-0002 rules still hold).
- A hold frame on the web that shows a half-finished transition.

## Approaches

| Approach                                                                                                                                                            | Trade-off                                                                 | Picked               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------- |
| **A. Cell-themed transitions.** The old scene leaves through the cell grid: a directional sweep, a zoom through one cell, a ripple from the centre; varied per cut. | Keeps WrapYourGit's own look; more custom code than library presets.      | **Yes** (maintainer) |
| B. Camera-style transitions (push, zoom, spin) from `@remotion/transitions`.                                                                                        | Cinematic and cheap, but generic and unrelated to the contribution motif. | No                   |

## Design

> **Revised 2026-11-05 after review:** the maintainer wanted a different move for every cut, as in GitHub Unwrapped, not three variants of one cell wipe. The cell-only variants below were replaced by eight distinct moves (`SceneTransition`; see `docs/video/scene-system.md`, Transitions). The timing rule (one beat, at the start of the new scene) is unchanged.

### Transitions

- **Where the exit happens.** On the web each chapter stops on its last frame and waits for Next, so an exit inside the old scene's last beat would leave the chapter parked on an empty frame. The exit therefore plays at the **start of the next scene**: for its first beat, the next `Series.Sequence` also renders the previous scene frozen on its final frame (`<Freeze>`, with that scene's own accent), animates it out, and the cells reveal the new scene underneath. Scene lengths, beat alignment and web hold frames do not change.
- **Variants** (one `CellTransition` with a `variant` prop replacing `CellWipe`):
  - `sweep`: cells of the old field cover the old scene in a diagonal wave from one side while the frozen scene slides that way, then shrink away to reveal the new one. Direction alternates.
  - `zoom`: the frozen scene scales up into one cell that grows to fill the frame in the new field colour, then breaks into cells.
  - `ripple`: cells pop outward from the centre, then clear in the same order.
- **Assignment** lives in `timeline.ts` next to each scene (`transition: "sweep" | "zoom" | "ripple"`), so it is data and testable. The identity climax gets `zoom`.
- **Timing.** Exit and reveal fit in the first beat of the new scene (exit in the first half, reveal in the second), the same length as today's wipe, so no scene's own entrance animation moves.
- **Reduced motion (web):** a short cross-fade instead of the cell transition.

### Soundtrack

- **Same grid:** still 120 BPM, 132 beats, same sections, so `timeline.ts` and `timeline.test.ts` keep working.
- **More energy (arrangement only):** four-on-the-floor kick from the drop, 1/16 hats with an off-beat open hat, a driving 1/8 bass with side-chain pumping, a lead hook over the drop, brighter claps on 2 and 4, and fills into each section. Intro stays a short build; the climax stays the loudest point.
- **Loop points.** `TRACK` gains `loop: { startBeat: 40, endBeat: 88 }` (20 s to 44 s): full arrangement, starts and ends on the same chord, no riser or rest inside, so the seam is inaudible.
- **Video:** the composition plays the track once, linearly, with the existing two-beat fade at the end (the story is exactly 132 beats, so no loop is needed there; if the timeline ever grows, `<Html5Audio loop>` takes over).
- **Web:** the music moves from `<audio loop>` to Web Audio: fetch and decode once, play with an `AudioBufferSourceNode` whose `loop`, `loopStart` and `loopEnd` are the loop points. A decoded buffer loops sample-exact, which an AAC file in `<audio loop>` cannot (encoder padding leaves a gap). Mute toggles a `GainNode`; the end-of-story fade ramps the gain. The first 44 s play once, then 20–44 s loops for as long as the viewer stays in the chapters.
- File name gains a version (`wrapyourgit-120bpm-v2.m4a`) so caches never serve the old track; `LICENSES.md` is updated.

### Sound effects

- **Synthesised** in a new `scripts/synth-sfx.ts` (same seeded approach as the track), written as short mono **WAV** files in `packages/video/public/audio/sfx/` (WAV, not AAC, so there is no encoder delay and an effect lands on its frame).
- **Palette** (about 8 sounds, tuned to the track's key, A minor): `whoosh` (transition exit), `cells` (transition reveal, a quick granular patter), `pop` (an element or chip appears), `tick` (counter step, used as a rolling sequence while a number counts up, capped to a few per beat), `land` (a big number or title settles), `blip` (a bar or row grows; pitch rises along a list), `shimmer` (heatmap or graph draws in, one sound for the whole sweep), `impact` (archetype reveal).
- **Sound comes from the component that moves.** One `<Sfx at sound>` component (a `<Sequence from>` with `<Html5Audio>`) is rendered by the animation primitives themselves: `Slam` plays `pop` by default, count-ups play ticks and a `land`, bars and rows play `blip`, transitions play `whoosh` + `cells`. Moving an animation moves its sound; a skipped beat renders nothing, so it is silent. The frozen previous scene inside a transition disables effects through a context. (Builder's call: replaces per-scene cue lists, which could drift from the animations.)
- **Mix.** Effects sit under the music (default volume around 0.35–0.5, impacts higher). Groups get one sound, not one per item (a calendar draw is one `shimmer`; five bars are five `blip`s; 365 cells are never 365 pops).
- **Missing data.** A beat that is skipped because its metric is unavailable skips its cues too.

### Composition and web wiring

- `WrapStory` takes `{ data, music?: boolean }`. MP4 export and Studio pass `music: true` (track inside the composition, mixed by Remotion). The web Player passes `music: false`, because the web plays its own looping track.
- The Player is no longer always muted: its mute follows the story's sound toggle, so effects play on the web. Effects play only while the chapter is playing; the hold frame is silent.
- `<Html5Audio>` effects must preload: the Player gets `numberOfSharedAudioTags` large enough for the busiest scene, or effects use `pauseWhenBuffering` off; the builder picks after measuring.

### Tests and docs

- `timeline.test.ts`: every scene has a transition except intro; neighbouring transitions differ.
- New tests: every effect file exists and is a small WAV; count-up tick frames are spaced and bounded; loop points are whole bars on the same chord with no riser inside.
- Update `docs/video/scene-system.md` (transitions, audio, cue rules), `DESIGN.md` if it describes the wipe, `LICENSES.md`, and a new ADR (`0009-sound-design.md`) recording: effects in the composition, music outside the Player on the web, WAV for effects, Web Audio looping.

## Constraints

- Remotion 4.0.540: `<Html5Audio>` (not `<Audio>`), `<Freeze>`, `<Sequence>`.
- Lambda renders must stay within today's cost: a frozen previous scene is rendered only during one beat and a half per cut.
- 3D accents are baked PNGs, so freezing a scene is cheap.

## Left to the builder

- Exact cue frames per scene (read each scene's animation constants).
- Exact synthesis of each effect and the arrangement details, judged by listening to a render.
- `numberOfSharedAudioTags` value and preload strategy after testing in Chrome and Firefox.
