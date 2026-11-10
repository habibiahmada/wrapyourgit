import { layoutForSize, type RecapData } from "@wyg/schema";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  Loop,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { WORLD_TRACK, worldBeats } from "../audio/world-track";
import { Sfx } from "../components/Sfx";
import { palette } from "../theme";
import { Chrome } from "./Chrome";
import { CityLayer } from "./CityLayer";
import { cameraAt } from "./camera";
import { chromeDarkness } from "./chrome-tone";
import { cardOpacity, enterProgress, reachedStop } from "./fade";
import { buildWorld } from "./model";
import { StopLayer } from "./StopLayer";
import { SCENE_TONE } from "./scenes";
import { videoSounds } from "./sound";
import type { WorldMode } from "./timeline";

export type WorldStoryProps = {
  data: RecapData;
  mode: WorldMode;
  /** Mix the soundtrack in (video mode only; the web player plays music itself). */
  music?: boolean;
};

export function WorldStory({ data, mode, music = true }: WorldStoryProps) {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const world = useMemo(
    () => buildWorld(data, { width, height }, mode, fps),
    [data, width, height, mode, fps],
  );
  const { city, stops, cameras, timeline } = world;
  const size = { width, height };
  const layout = layoutForSize(width, height);
  const camera = cameraAt(frame, cameras, timeline);
  const current = reachedStop(frame, timeline.stopFrames);
  const citySpan = cameras[stops.findIndex((s) => s.kind === "city")]?.span ?? camera.span;
  const end = timeline.durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      <CityLayer city={city} camera={camera} citySpan={citySpan} frame={size} />
      {/* Only the stops either side of the current move can be on screen. */}
      {[current - 1, current, current + 1].map((i) => {
        const stop = stops[i];
        const stopCam = cameras[i];
        if (!stop || !stopCam) return null;
        return (
          <StopLayer
            key={stop.id}
            data={data}
            stop={stop}
            stopCam={stopCam}
            camera={camera}
            city={city}
            citySpan={citySpan}
            timelineOpacity={cardOpacity(i, frame, timeline)}
            enter={enterProgress(i, frame, timeline)}
            compFrame={frame}
            size={size}
            layout={layout}
          />
        );
      })}
      <Chrome
        stops={stops.length}
        current={current}
        year={data.meta.year}
        frame={size}
        darkness={chromeDarkness(
          stops.map((stop) => SCENE_TONE[stop.kind] ?? "light"),
          frame,
          timeline,
        )}
      />
      {mode === "video" && (
        <>
          {videoSounds(world).map(({ frame: at, sound }, k) => (
            // Index keys: the list is fixed for a given world, and one frame can hold two sounds.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <Sfx key={`${k}-${sound}`} at={at} sound={sound} />
          ))}
          {music && <WorldMusic end={end} fps={fps} />}
        </>
      )}
    </AbsoluteFill>
  );
}

/**
 * The world's track, as the web player plays it: once from the top to the loop end, then the loop
 * region again for as long as the video lasts. The loop region is rendered circular, so the cut
 * back to its start is seamless. Fades out over the composition's last two beats.
 */
function WorldMusic({ end, fps }: { end: number; fps: number }) {
  const loopStart = worldBeats(WORLD_TRACK.loop.startBeat, fps);
  const loopEnd = worldBeats(WORLD_TRACK.loop.endBeat, fps);
  const loopLength = loopEnd - loopStart;
  const fade = (frame: number) =>
    interpolate(frame, [end - worldBeats(2, fps), end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const src = staticFile(WORLD_TRACK.file);
  return (
    <>
      <Html5Audio src={src} durationInFrames={loopEnd} volume={fade} />
      {end > loopEnd && (
        <Sequence from={loopEnd} durationInFrames={end - loopEnd}>
          <Loop durationInFrames={loopLength}>
            <LoopedRegion
              src={src}
              trimBefore={loopStart}
              length={loopLength}
              fade={fade}
              from={loopEnd}
            />
          </Loop>
        </Sequence>
      )}
    </>
  );
}

/** One pass of the loop region; the volume curve reads composition frames across passes. */
function LoopedRegion({
  src,
  trimBefore,
  length,
  fade,
  from,
}: {
  src: string;
  trimBefore: number;
  length: number;
  fade: (frame: number) => number;
  from: number;
}) {
  const iteration = Loop.useLoop()?.iteration ?? 0;
  const passStart = from + iteration * length;
  return (
    <Html5Audio
      src={src}
      trimBefore={trimBefore}
      durationInFrames={length}
      volume={(f) => fade(passStart + f)}
    />
  );
}
