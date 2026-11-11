import type { ReactNode } from "react";
import { random } from "remotion";
import type { City } from "../city";
import { bearingX, horizonY, skyline } from "./horizon";
import { GROUND, HAZE, SKY } from "./palette";
import { type Frame, projector, type RideCamera } from "./project";

const STARS = 60;
const MOON_BEARING = 0.5;

/**
 * The sky, the far skyline and the ground, as SVG elements for inside the scene's <svg>, drawn
 * before the scene. Flat colours only. The rectangles are far larger than the frame so the
 * scene's roll never shows an edge.
 */
export function Backdrop({
  cam,
  frame,
  city,
  frameIndex,
}: {
  cam: RideCamera;
  frame: Frame;
  city: City;
  frameIndex: number;
}): ReactNode {
  const { focal } = projector(cam, frame);
  const hy = horizonY(cam, frame);
  const big = Math.max(frame.width, frame.height) * 2;
  // Twinkles repeat within 60 frames, so a station's rest loop ends where it began.
  const loop = ((frameIndex % 60) + 60) % 60;
  const moonX = bearingX(MOON_BEARING, cam, frame);
  const moonY = hy - Math.tan(0.34) * focal;
  const moonR = focal * 0.045;
  return (
    <>
      <rect x={-big} y={-big * 4} width={big * 3} height={big * 4 + hy} fill={SKY} />
      {Array.from({ length: STARS }, (_, k) => {
        const x = bearingX(random(`star-bearing-${k}`) * Math.PI * 2, cam, frame);
        if (x === null) return null;
        const y = hy - Math.tan(0.05 + random(`star-height-${k}`) * 0.6) * focal;
        const size = k % 5 === 0 ? 5 : 3;
        const period = [10, 12, 15, 20, 30][k % 5] ?? 30;
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: the stars are a fixed list
            key={k}
            x={x}
            y={y}
            width={size}
            height={size}
            fill={k % 7 === 0 ? "#7ee08f" : "#c9d1d9"}
            opacity={0.5 + 0.5 * Math.abs(Math.sin((loop / period) * Math.PI + k))}
          />
        );
      })}
      {moonX !== null && (
        <>
          <circle cx={moonX} cy={moonY} r={moonR} fill="#d2f5da" />
          <circle cx={moonX + moonR * 0.42} cy={moonY - moonR * 0.2} r={moonR * 0.82} fill={SKY} />
        </>
      )}
      {skyline(city).map((tower, k) => {
        const x = bearingX(tower.bearing, cam, frame);
        if (x === null) return null;
        const wide = focal * 0.042;
        const tall = focal * tower.height;
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: the towers are a fixed list
            key={k}
            x={x - wide / 2}
            y={hy - tall}
            width={wide}
            height={tall + 2}
            fill={k % 3 === 0 ? "#1b2f25" : "#16261e"}
          />
        );
      })}
      <rect x={-big} y={hy} width={big * 3} height={big * 4} fill={GROUND} />
      <rect x={-big} y={hy} width={big * 3} height={Math.max(2, focal * 0.012)} fill={HAZE} />
    </>
  );
}
