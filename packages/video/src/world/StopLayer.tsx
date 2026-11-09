import { AbsoluteFill } from "remotion";
import { fontFamily, formatCount, palette } from "../theme";
import { type Camera, project } from "./camera";
import type { City } from "./city";
import { formatDay, zoomFade } from "./fade";
import type { Stop } from "./stops";

type Frame = { width: number; height: number };

/**
 * Placeholder for a stop's scene (phase 2 replaces it). It lives in world space: frame-sized when
 * the camera equals the stop's camera, scaled and moved with the camera otherwise.
 */
export function StopLayer({
  stop,
  stopCam,
  camera,
  city,
  citySpan,
  timelineOpacity,
  frame,
}: {
  stop: Stop;
  stopCam: Camera;
  camera: Camera;
  city: City;
  citySpan: number;
  /** cardOpacity for this stop at the current frame. */
  timelineOpacity: number;
  frame: Frame;
}) {
  const plot = stop.plot === null ? undefined : city.plots[stop.plot];
  const opacity = timelineOpacity * zoomFade(camera, stopCam, citySpan);
  if (!plot || opacity <= 0) return null;
  const centre = project(stopCam, camera, frame);
  const scale = stopCam.span / camera.span;
  const unit = Math.min(frame.width, frame.height) / 100;
  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate(${centre.x - frame.width / 2}px, ${centre.y - frame.height / 2}px) scale(${scale})`,
        backgroundColor: palette.paper,
        color: palette.ink,
        fontFamily,
      }}
    >
      {/* Inset so the card's edge stays clear of the progress bar and the copyright line. */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          top: unit * 8,
          left: unit * 8,
          right: unit * 8,
          bottom: unit * 8,
          alignItems: "center",
          justifyContent: "center",
          gap: unit * 2,
          border: `${unit * 0.5}px solid ${palette.ink}`,
          borderRadius: unit * 3,
        }}
      >
        <div style={{ fontSize: unit * 11, fontWeight: 800, textTransform: "uppercase" }}>
          {stop.page ? `${stop.kind} ${stop.page}` : stop.kind}
        </div>
        <div style={{ fontSize: unit * 5, fontWeight: 400 }}>{formatDay(plot.date)}</div>
        {stop.kind === "busiest" && (
          <div style={{ fontSize: unit * 6, fontWeight: 700 }}>
            {formatCount(plot.count)} contributions
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
