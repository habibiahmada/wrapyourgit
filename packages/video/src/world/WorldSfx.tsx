import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { SFX, type SfxName, sfxFile } from "../audio/sfx";

/**
 * A sound effect at frame `at` of the world, on `@remotion/media`'s `<Audio>`: the browser
 * renderer (`@remotion/web-renderer`) cannot play `Html5Audio`. Same volume and length as the old
 * story's `Sfx`, which stays on `Html5Audio`.
 */
export function WorldSfx({ at, sound }: { at: number; sound: SfxName }) {
  const { fps } = useVideoConfig();
  return (
    <Sequence
      from={Math.round(at)}
      durationInFrames={Math.ceil(SFX[sound].seconds * fps) + 1}
      layout="none"
      name={`sfx:${sound}`}
    >
      <Audio src={staticFile(sfxFile(sound))} volume={SFX[sound].volume} />
    </Sequence>
  );
}
