# 0009. Sound design: effects in the composition, music outside the web Player

- Status: Accepted
- Date: 2026-11-05

## Context

The story should feel like a produced video: animated transitions, one energetic soundtrack that never stutters, and a sound for everything that moves. The web story and the MP4 must sound the same (ADR-0002). Two facts constrain how:

- The web story is a guided walk: each chapter plays one scene, stops on its last frame and waits for Next. The music must keep going across those waits, for however long they last.
- `<audio loop>` with an AAC file leaves a short gap at every loop, because AAC starts with encoder padding.

## Decision

1. **Effects live in the composition.** One `<Sfx>` component (`packages/video/src/components/Sfx.tsx`) is rendered by the components that move: `Slam` (default `pop`), `CountTicks` (ticks and `land`), bars and rows (`blip`, eight pitches), accents, and `SceneTransition` (the sounds of each move). A sound is placed on the same frame as its animation by construction, a skipped beat is silent, and the Player and Lambda play the same effects on the same frames.
2. **Effects are WAV.** Synthesised by `scripts/synth-sfx.ts` (CC0), mono 16-bit, a few kilobytes each. No encoder padding, so a pop lands on its frame.
3. **Music is a prop.** `WrapStory` mixes the soundtrack in when `music` is true (the default: Studio and Lambda). The web Player passes `music: false`; the web story plays the track itself.
4. **The web plays music on Web Audio.** A decoded buffer on an `AudioBufferSourceNode` with `loopStart`/`loopEnd` from `TRACK.loop` (beats 40–88, same chord at both ends, nothing building inside) loops sample-exact. Mute and fades are gain nodes on the audio clock, so a fade finishes in a background tab.
5. **Transitions belong to the scene that starts.** `SceneTransition` wraps the new scene for its first beat and renders the previous scene frozen on its last frame (`<Freeze>`, effects disabled through `SfxContext`), so each cut can move both; every cut has its own move. A web chapter that stops on its last frame never stops on a half-finished exit, and no durations change.

## Alternatives

- **Per-scene cue lists** (frame, sound) next to each scene: testable as data, but they drift from the animation constants as soon as someone moves a beat. Rejected.
- **Music inside the Player on the web:** the Player remounts per chapter and holds between them, so the music would stop at every chapter. Rejected.
- **`@remotion/transitions` `TransitionSeries`:** overlapping scenes shorten the story and move every cut off the beat. Rejected.

## Consequences

- The Player is no longer always muted; the sound toggle mutes both the music (gain) and the Player.
- Regenerate audio with `bun scripts/synth-track.ts` and `bun scripts/synth-sfx.ts` whenever `TRACK` or `SFX` change; both are deterministic.
- On the web the climax of the track is not heard while the loop runs; the MP4 plays the full arrangement on the scene grid.
