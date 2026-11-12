import { Audio } from "@remotion/media";
import { interpolate, Sequence, staticFile } from "remotion";
import { WORLD_TRACK, worldBeats } from "../audio/world-track";

/**
 * The story's track, as the web player plays it: once from the top to the loop end, then the loop
 * region again for as long as the video lasts. The loop region is rendered circular, so the cut
 * back to its start is seamless. Fades out over the composition's last two beats.
 *
 * `@remotion/media`'s `<Audio>` (the browser renderer has no `Html5Audio`). With `loop`, its
 * `durationInFrames` is the length of the looped source region (trimBefore + durationInFrames is
 * the effective trimAfter), not the length on screen; the enclosing Sequence bounds that.
 * `loopVolumeCurveBehavior="extend"` hands the volume curve frames that keep counting across
 * passes, so one fade over composition frames covers every pass.
 */
export function StoryMusic({ end, fps }: { end: number; fps: number }) {
  const loopStart = worldBeats(WORLD_TRACK.loop.startBeat, fps);
  const loopEnd = worldBeats(WORLD_TRACK.loop.endBeat, fps);
  const fade = (frame: number) =>
    interpolate(frame, [end - worldBeats(2, fps), end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const src = staticFile(WORLD_TRACK.file);
  return (
    <>
      <Audio src={src} durationInFrames={loopEnd} volume={fade} />
      {end > loopEnd && (
        <Sequence from={loopEnd} durationInFrames={end - loopEnd} layout="none">
          <Audio
            src={src}
            trimBefore={loopStart}
            durationInFrames={loopEnd - loopStart}
            loop
            loopVolumeCurveBehavior="extend"
            volume={(f) => fade(loopEnd + f)}
          />
        </Sequence>
      )}
    </>
  );
}
