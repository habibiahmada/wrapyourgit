import type { LayoutFamily, RecapData } from "@wyg/schema";
import { AbsoluteFill } from "remotion";
import { type Camera, project } from "./camera";
import type { City } from "./city";
import { zoomFade } from "./fade";
import { SCENES } from "./scenes";
import type { Stop } from "./stops";

type Size = { width: number; height: number };

/**
 * A stop's scene in world space: frame-sized when the camera equals the stop's camera, scaled and
 * moved with the camera otherwise. The city overview (no plot) gets a layer too, so its scene can
 * label the whole city.
 */
export function StopLayer({
  data,
  stop,
  stopCam,
  camera,
  city,
  citySpan,
  timelineOpacity,
  enter,
  frame,
  size,
  layout,
}: {
  data: RecapData;
  stop: Stop;
  stopCam: Camera;
  camera: Camera;
  city: City;
  citySpan: number;
  /** cardOpacity for this stop at the current frame. */
  timelineOpacity: number;
  /** enterProgress for this stop at the current frame. */
  enter: number;
  frame: number;
  size: Size;
  layout: LayoutFamily;
}) {
  const isCity = stop.plot === null;
  // The city's own camera is the widest there is, so zoomFade has no range to fade over: time alone
  // decides when its layer shows.
  const opacity = isCity ? timelineOpacity : timelineOpacity * zoomFade(camera, stopCam, citySpan);
  if (opacity <= 0) return null;
  const centre = project(stopCam, camera, size);
  const scale = stopCam.span / camera.span;
  const Scene = SCENES[stop.kind];
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate(${centre.x - size.width / 2}px, ${centre.y - size.height / 2}px) scale(${scale})`,
      }}
    >
      <Scene
        data={data}
        stop={stop}
        city={city}
        size={size}
        layout={layout}
        enter={enter}
        frame={frame}
      />
    </AbsoluteFill>
  );
}
