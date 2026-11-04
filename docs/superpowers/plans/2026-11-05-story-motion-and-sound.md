# Story motion and sound: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cell-themed transitions between scenes, an energetic gap-free soundtrack, and a sound for every animation, identical on the web and in the MP4.

**Architecture:** Sounds are emitted by the components that animate (`Slam`, count-ups, bars, transitions) through one `<Sfx>` component, so a sound can never drift from its animation. The previous scene is re-rendered frozen at the start of the next one for the exit half of each transition. The web plays the music through Web Audio with sample-exact loop points; the composition carries the music only when `music` is true (export, Studio).

**Tech Stack:** Remotion 4.0.540 (`Html5Audio`, `Sequence`, `Freeze`), React 19, bun scripts that synthesise audio, Web Audio API.

**Spec:** [docs/superpowers/specs/2026-11-05-story-motion-and-sound-design.md](../specs/2026-11-05-story-motion-and-sound-design.md)

## Global Constraints

- 120 BPM, 132 beats, scene order and beat lengths unchanged; `timeline.test.ts` keeps passing.
- Scenes stay deterministic: only `useCurrentFrame()`, `interpolate`, `spring`, `random(seed)`.
- All audio synthesised by scripts in `scripts/`, CC0, listed in `packages/video/public/audio/LICENSES.md`.
- Effects are mono 16-bit 44.1 kHz WAV under `packages/video/public/audio/sfx/`.
- Track file renamed to `audio/wrapyourgit-120bpm-v2.m4a`.
- Transition total length: 1 beat (15 frames), exit in the first half, reveal in the second, so no scene's first animation moves.
- Effects never louder than the music's peak; default volume 0.4, `impact` 0.7, `tick` 0.25.

## Review Focus

1. **Frozen previous scene plays its own effects again.** Expect silence from it: `SfxContext` disabled inside the frozen copy (Task 3 test).
2. **Web hold frame.** A chapter that stops on its last frame must not replay or loop an effect; the Player is paused there (manual check, Task 6).
3. **Sound off.** The mute button silences music *and* effects, including effects already scheduled (Task 6 check).
4. **Unavailable metrics.** A skipped beat renders no `Slam`, so it emits no sound; verify with `emptyRecap` in Studio (Task 4 check).
5. **Loop seam.** The web loop region starts and ends on bars of the same chord, with no riser or rest inside it (Task 1 test).

---

### Task 1: Energetic soundtrack with loop points

**Files:**
- Modify: `packages/video/src/audio/track.ts`, `scripts/synth-track.ts`, `packages/video/public/audio/LICENSES.md`
- Create: `packages/video/src/audio/track.test.ts`, `packages/video/public/audio/wrapyourgit-120bpm-v2.m4a` (generated); delete the old `.m4a`
- Modify: `apps/web/src/app/recap/story-flow.tsx` (file path only, until Task 6)

**Interfaces:**
- Produces: `TRACK.file = "audio/wrapyourgit-120bpm-v2.m4a"`, `TRACK.loop = { startBeat: 40, endBeat: 88 }`, `loopSeconds(): { start: number; end: number }`.

- [ ] Test `track.test.ts`: `loop` start and end are multiples of 4; `(startBeat/4) % 4 === (endBeat/4) % 4` (same chord); `endBeat <= sections.climax - 8` (no riser inside); `startBeat >= sections.drop`; `loopSeconds()` equals `{ start: 20, end: 44 }`.
- [ ] Run `bun test packages/video/src/audio` → fails (no `loop`).
- [ ] Add `loop` and `loopSeconds()` to `track.ts`; run → passes.
- [ ] Rework `synth-track.ts` arrangement over the same sections: kick on every beat from the drop (outro keeps half time), closed hats on 1/16 with an open hat on each off-beat, clap on 2 and 4 from beat 24, bass on 1/8 with side-chain ducking, a lead hook (8-note phrase from the chord tones, square-ish with a short decay) from beat 40, a snare fill in the last beat before each section, riser + 2-beat rest + crash kept. The file-level outro fade stays. Write to the new file name, delete the old file.
- [ ] Run `bun scripts/synth-track.ts`; listen to a 10 s excerpt around the drop and around the loop end (beats 86–90). Expected: no click at beat 88.
- [ ] Update `LICENSES.md` row; point `story-flow.tsx` `<audio src>` at `TRACK.file`.
- [ ] Commit `feat(video): more energetic soundtrack with loop points`.

### Task 2: Synthesised sound effects

**Files:**
- Create: `scripts/synth-sfx.ts`, `packages/video/src/audio/sfx.ts`, `packages/video/src/audio/sfx.test.ts`, `packages/video/public/audio/sfx/*.wav`
- Modify: `packages/video/public/audio/LICENSES.md`

**Interfaces:**
- Produces: `type SfxName = "whoosh" | "cells" | "pop" | "tick" | "land" | "blip" | "shimmer" | "impact"`; `SFX: Record<SfxName, { file: string; volume: number }>` with `file = "audio/sfx/<name>.wav"`.

- [ ] Test `sfx.test.ts`: every `SFX[name].file` exists on disk under `packages/video/public/`, is a RIFF/WAVE file under 200 KB, and every volume is in (0, 0.8].
- [ ] Run → fails.
- [ ] Write `sfx.ts` and `synth-sfx.ts` (shared seeded noise, A-minor pitches): `whoosh` 0.45 s filtered noise sweep up then down; `cells` 0.35 s, 12 tiny seeded clicks; `pop` 0.12 s pitched blip with fast decay (A5); `tick` 0.03 s high click; `land` 0.25 s low thump + short noise; `blip` 0.1 s sine at A5 (rate varied by callers); `shimmer` 1.2 s rising bell partials; `impact` 1.0 s sub drop + noise tail. Each normalised to −3 dBFS peak.
- [ ] Run `bun scripts/synth-sfx.ts`, then the test → passes.
- [ ] Add one `LICENSES.md` row for `sfx/*.wav`.
- [ ] Commit `feat(video): synthesised sound effects`.

### Task 3: `<Sfx>` and sounds from the animation primitives

**Files:**
- Create: `packages/video/src/components/Sfx.tsx`, `packages/video/src/components/Sfx.test.tsx`
- Modify: `packages/video/src/components/Slam.tsx`, `packages/video/src/components/useCountUp.ts`, `packages/video/src/components/Accent.tsx`

**Interfaces:**
- Consumes: `SFX`, `SfxName` (Task 2).
- Produces:
  - `SfxContext = createContext<boolean>(true)`.
  - `<Sfx at: number; sound: SfxName; volume?: number; rate?: number />` → `null` when context is false, else `<Sequence from={at} durationInFrames={length} layout="none"><Html5Audio src={staticFile(SFX[sound].file)} volume={volume ?? SFX[sound].volume} playbackRate={rate} /></Sequence>`.
  - `Slam` gains `sound?: SfxName | null` (default `"pop"`).
  - `<CountTicks from: number; to: number; value: number />`: one `tick` per frame where the displayed number changes, at most one every 2 frames, plus `land` at `to`.
  - `Accent` entrance gets `pop` at its `at`.
- [ ] Test `Sfx.test.tsx`: a pure helper `tickFrames(value, from, to, minGap = 2): number[]` (exported from `Sfx.tsx`) returns ascending frames within `[from, to]`, gaps ≥ 2, empty for `value === 0`; `tickFrames(3, 0, 30)` has exactly 3 frames.
- [ ] Run → fails; implement; run → passes.
- [ ] Implement `Sfx`, `CountTicks`, `Slam.sound`, Accent sound. `Html5Audio` must not use `loop`.
- [ ] `bun run typecheck` → passes.
- [ ] Commit `feat(video): sounds from slams, count-ups and accents`.

### Task 4: Per-scene sounds beyond the primitives

**Files:** `packages/video/src/scenes/*.tsx`

**Interfaces:** Consumes `Sfx`, `CountTicks`, `Slam.sound`.

- [ ] Intro: `blip` per lit cell (rate rising 1.0 → 1.5 across the week); title slam `land`.
- [ ] Contributions: `CountTicks` over beats 1–4; facts `pop` (default).
- [ ] Rhythm: one `shimmer` at beat 1 (heatmap draw); one `blip` per weekday bar at beat 12 + index × 2 frames, rate rising.
- [ ] Tech DNA and Projects: each row `blip` at its `at`, rate rising by row; top language / top repo slam `land`.
- [ ] Community and Engineering: `CountTicks` for each count-up.
- [ ] Identity: `impact` at beat 2 (the reveal spring); reasons `pop`.
- [ ] Closing: year graph slam `shimmer`; facts `pop`.
- [ ] Two slams on the same frame: keep the first's sound, pass `sound={null}` to the rest.
- [ ] Check in Studio (`bun run studio`) with `sampleRecap`, `emptyRecap`, `busyRecap`: every visible motion has a sound, skipped beats are silent.
- [ ] Commit `feat(video): a sound for every animation in every scene`.

### Task 5: Cell transitions

**Files:**
- Create: `packages/video/src/components/CellTransition.tsx`
- Delete: `packages/video/src/components/CellWipe.tsx`
- Modify: `packages/video/src/timeline.ts`, `packages/video/src/timeline.test.ts`, `packages/video/src/WrapStory.tsx`

**Interfaces:**
- Produces: `type TransitionVariant = "sweep" | "zoom" | "ripple"`; each `TIMELINE` entry after intro gets `transition: TransitionVariant`; `<CellTransition variant from to seed previous: ReactNode />`.
- Assignment: contributions `sweep`, rhythm `ripple`, tech-dna `sweep`, projects `ripple`, community `sweep`, engineering `ripple`, identity `zoom`, closing `sweep`. Sweep direction alternates by index.
- [ ] Test in `timeline.test.ts`: intro has no transition; every other scene has one; no two neighbouring scenes share a variant; identity is `zoom`.
- [ ] Run → fails; add the data; run → passes.
- [ ] Implement `CellTransition` (frames 0–7 exit, 7–15 reveal, cell size `min(w,h)/8`, seeded order as today):
  - `sweep`: frozen `previous` translates 12% toward the sweep side and dims; old-field cells grow in a diagonal wave covering it by frame 7, then shrink in the same wave order revealing the new scene.
  - `zoom`: frozen `previous` scales 1 → 3 around the centre cell and fades; that cell grows from 0 to full frame in the new field colour by frame 7, then breaks into cells that shrink away.
  - `ripple`: cells grow outward by distance from centre by frame 7, then shrink in the same order.
  - Plays `whoosh` at 0 and `cells` at 7. Reduced motion is the web's concern (`prefers-reduced-motion` keeps today's fade on the Player).
- [ ] In `WrapStory`, each non-intro sequence renders `<CellTransition previous={<SfxContext value={false}><AccentContext value={…previous accent}><Freeze frame={previous.durationInFrames - 1}><Prev data /></Freeze></AccentContext></SfxContext>} …/>` only while `frame < beats(1)`.
- [ ] Render stills at frames 3, 7, 11 of each cut in 9:16 and 16:9 (`bunx remotion still`) and look: no number of the new scene is covered after frame 15.
- [ ] Commit `feat(video): cell transitions with an exit for every cut`.

### Task 6: Music prop and web audio

**Files:**
- Modify: `packages/video/src/WrapStory.tsx`, `apps/web/src/app/recap/story-flow.tsx`
- Create: `apps/web/src/app/recap/use-music.ts`

**Interfaces:**
- Produces: `WrapStoryProps = { data: RecapData; music?: boolean }` (default `true`); `useMusic(src: string, loop: { start: number; end: number }) → { play(): void; fadeOut(ms?: number): () => void; setMuted(m: boolean): void; playing: boolean }`.
- [ ] `WrapStory` renders the track only when `music !== false`.
- [ ] `useMusic`: lazily creates an `AudioContext` on first `play()` (user gesture), fetches + decodes once, plays an `AudioBufferSourceNode` with `loop = true`, `loopStart`/`loopEnd` from `loopSeconds()`, through a `GainNode`. Mute sets gain to 0; `fadeOut` ramps gain with `linearRampToValueAtTime` then stops the source. Closes the context on unmount.
- [ ] `story-flow.tsx`: replace the `<audio>` element and `fadeOut` helper with `useMusic`; Player gets `inputProps={{ data, music: false }}`, no `initiallyMuted`, and mutes/unmutes via `player.current.mute()/unmute()` following the sound toggle; reduced motion keeps current behaviour.
- [ ] Verify in the browser (`bun run dev`, `/recap`): music runs across chapters without a gap past 44 s; effects play during a chapter, silence on the hold frame; sound off silences both; music fades after the last chapter.
- [ ] Commit `feat(web): gap-free looping music and story sound effects`.

### Task 7: Docs and checks

**Files:** `docs/video/scene-system.md`, `DESIGN.md` (cell wipe line), `docs/architecture/decisions/0009-sound-design.md`, `CHANGELOG.md`

- [ ] Update the docs: transitions table, audio section (track v2, loop points, effects, cue rule "sound comes from the component that moves"), ADR-0009 (effects in composition, music outside the Player on web, WAV effects, Web Audio loop), CHANGELOG Added/Changed.
- [ ] Run `bun run typecheck && bun test && bun run lint` → all pass.
- [ ] Render `wrap-9x16` locally and listen end to end.
- [ ] Commit `docs: transitions and sound design`.
