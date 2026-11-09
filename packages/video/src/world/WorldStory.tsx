import { layoutForSize, type RecapData } from "@wyg/schema";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Html5Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { beats, TRACK } from "../audio/track";
import { Sfx } from "../components/Sfx";
import { palette } from "../theme";
import { Chrome } from "./Chrome";
import { CityLayer } from "./CityLayer";
import { cameraAt } from "./camera";
import { cardOpacity, enterProgress, reachedStop } from "./fade";
import { buildWorld } from "./model";
import { StopLayer } from "./StopLayer";
import { transitionSound } from "./sound";
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
      <Chrome stops={stops.length} current={current} year={data.meta.year} frame={size} />
      {mode === "video" && (
        <>
          {stops.slice(1).map((stop, k) => {
            const i = k + 1;
            const at = (timeline.stopFrames[i] ?? 0) - (timeline.moveFrames[i] ?? 0);
            return <Sfx key={stop.id} at={at} sound={transitionSound(stop.kind)} />;
          })}
          {music && (
            <Html5Audio
              src={staticFile(TRACK.file)}
              // The track is shorter than the world; looping holds until phase 3 brings its own.
              loop
              // "extend" keeps the volume curve on composition frames across loops, so the fade
              // below lands on the composition's last two beats, not on each pass of the track.
              loopVolumeCurveBehavior="extend"
              volume={(f) =>
                interpolate(f, [end - beats(2, fps), end], [1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              }
            />
          )}
        </>
      )}
    </AbsoluteFill>
  );
}
