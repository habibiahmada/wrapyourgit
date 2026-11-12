import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import {
  CUT_FADE_SECONDS,
  loops,
  RAILS_IN_SECONDS,
  SFX,
  type SfxName,
  sfxFile,
} from "../audio/sfx";

/**
 * A sound effect at frame `at` of the world, on `@remotion/media`'s `<Audio>`: the browser
 * renderer (`@remotion/web-renderer`) cannot play `Html5Audio`. Volume and length come from
 * `SFX`.
 */
export function WorldSfx({
  at,
  sound,
  frames,
}: {
  at: number;
  sound: SfxName;
  /**
   * How many frames the sound lasts, fading out over the last of them (a move's length). A
   * looping sound (the rails) plays round for as long as that, rolling in at the start.
   */
  frames?: number;
}) {
  const { fps } = useVideoConfig();
  const looping = loops(sound);
  const whole = Math.ceil(SFX[sound].seconds * fps) + 1;
  const length =
    frames === undefined
      ? whole
      : Math.max(1, Math.round(looping ? frames : Math.min(whole, frames)));
  const fadeOut = frames === undefined ? 0 : Math.min(length, Math.round(CUT_FADE_SECONDS * fps));
  const fadeIn = looping ? Math.min(length, Math.round(RAILS_IN_SECONDS * fps)) : 0;
  const { volume } = SFX[sound];
  const level = (f: number) =>
    volume *
    Math.min(
      fadeIn > 0 ? Math.min(1, f / fadeIn) : 1,
      fadeOut > 0 ? Math.min(1, Math.max(0, (length - f) / fadeOut)) : 1,
    );
  return (
    <Sequence from={Math.round(at)} durationInFrames={length} layout="none" name={`sfx:${sound}`}>
      <Audio
        src={staticFile(sfxFile(sound))}
        loop={looping}
        loopVolumeCurveBehavior="extend"
        volume={fadeIn === 0 && fadeOut === 0 ? volume : level}
      />
    </Sequence>
  );
}
