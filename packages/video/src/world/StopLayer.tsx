import { AbsoluteFill } from "remotion";
import { fontFamily, formatCount, palette } from "../theme";
import { type Camera, PLOT_SPAN, project } from "./camera";
import type { City } from "./city";
import type { Stop } from "./stops";

type Frame = { width: number; height: number };

/** Camera distance, in stop spans, over which a card fades out; neighbouring plots sit past it. */
const FADE_DISTANCE = 0.35;

/**
 * How visible a stop's card is: 1 with the camera on it, 0 at the city overview or once the camera
 * has moved off towards another plot, so a card never shows at a neighbouring stop.
 */
export function stopOpacity(camera: Camera, stopCam: Camera, citySpan: number): number {
  const zoom = Math.log(camera.span / stopCam.span) / Math.log(citySpan / stopCam.span);
  const distance = Math.hypot(camera.x - stopCam.x, camera.y - stopCam.y) / stopCam.span;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return clamp(1 - zoom) * clamp(1 - distance / FADE_DISTANCE);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

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
  frame,
}: {
  stop: Stop;
  stopCam: Camera;
  camera: Camera;
  city: City;
  citySpan: number;
  frame: Frame;
}) {
  const plot = stop.plot === null ? undefined : city.plots[stop.plot];
  const opacity = stopOpacity(camera, stopCam, Math.max(citySpan, 3 * PLOT_SPAN));
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
        <div style={{ fontSize: unit * 5, fontWeight: 400 }}>{formatDate(plot.date)}</div>
        {stop.kind === "busiest" && (
          <div style={{ fontSize: unit * 6, fontWeight: 700 }}>
            {formatCount(plot.count)} contributions
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
