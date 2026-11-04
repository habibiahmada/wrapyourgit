import { createContext, useContext } from "react";
import { Html5Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SFX, type SfxName, sfxFile } from "../audio/sfx";
import { tickFrames } from "./ticks";

/**
 * False inside the frozen copy of the previous scene that a transition animates out, so that
 * copy's slams don't play their sounds a second time.
 */
export const SfxContext = createContext(true);

/**
 * A sound effect at frame `at` of the enclosing sequence. Rendered by the component that moves
 * (Slam, CountTicks, bars, transitions), so the sound can't drift from its animation and a beat
 * that is skipped is silent.
 */
export function Sfx({
  at,
  sound,
  step,
  volume,
}: {
  at: number;
  sound: SfxName;
  /** Pitch step, `blip` only (sfxFile). */
  step?: number;
  volume?: number;
}) {
  const enabled = useContext(SfxContext);
  const { fps } = useVideoConfig();
  if (!enabled) return null;
  return (
    <Sequence
      from={Math.round(at)}
      durationInFrames={Math.ceil(SFX[sound].seconds * fps) + 1}
      layout="none"
      name={`sfx:${sound}`}
    >
      <Html5Audio
        src={staticFile(sfxFile(sound, step))}
        volume={volume ?? SFX[sound].volume}
        // An effect is a few frames long; waiting for it to buffer would stall the story.
        pauseWhenBuffering={false}
      />
    </Sequence>
  );
}

/** Ticks while a number counts up from frame `from` to `to`, then `land` when it settles. */
export function CountTicks({ value, from, to }: { value: number; from: number; to: number }) {
  if (value <= 0) return null;
  return (
    <>
      {tickFrames(value, from, to).map((frame) => (
        <Sfx key={frame} at={frame} sound="tick" />
      ))}
      <Sfx at={to} sound="land" />
    </>
  );
}
