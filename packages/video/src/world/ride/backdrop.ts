/*
 * The sky, the far skyline and the ground, as primitives painted before the scene. Flat colours
 * only: a star's twinkle is its colour mixed toward the sky, not a see-through square.
 */
import { random } from "remotion";
import type { City } from "../city";
import { bearingX, horizonY, skyline } from "./horizon";
import { GROUND, HAZE, mixHex, SKY } from "./palette";
import type { Prim } from "./prims";
import { type Frame, projector, type RideCamera } from "./project";

const STARS = 60;
const MOON_BEARING = 0.5;

const rect = (x: number, y: number, wide: number, tall: number, fill: string): Prim => ({
  kind: "poly",
  pts: [
    [x, y],
    [x + wide, y],
    [x + wide, y + tall],
    [x, y + tall],
  ],
  fill,
  stroke: null,
  depth: 0,
});

export function backdrop(cam: RideCamera, frame: Frame, city: City, frameIndex: number): Prim[] {
  const { focal } = projector(cam, frame);
  const hy = horizonY(cam, frame);
  // Far larger than the frame, so the scene's roll never shows an edge.
  const big = Math.max(frame.width, frame.height) * 2;
  // Twinkles repeat within 60 frames, so a station's rest loop ends where it began.
  const loop = ((frameIndex % 60) + 60) % 60;
  const out: Prim[] = [rect(-big, -big * 4, big * 3, big * 4 + hy, SKY)];
  for (let k = 0; k < STARS; k++) {
    const x = bearingX(random(`star-bearing-${k}`) * Math.PI * 2, cam, frame);
    if (x === null) continue;
    const y = hy - Math.tan(0.05 + random(`star-height-${k}`) * 0.6) * focal;
    const size = k % 5 === 0 ? 5 : 3;
    const period = [10, 12, 15, 20, 30][k % 5] ?? 30;
    const bright = 0.5 + 0.5 * Math.abs(Math.sin((loop / period) * Math.PI + k));
    out.push(rect(x, y, size, size, mixHex(SKY, k % 7 === 0 ? "#7ee08f" : "#c9d1d9", bright)));
  }
  const moonX = bearingX(MOON_BEARING, cam, frame);
  if (moonX !== null) {
    const moonY = hy - Math.tan(0.34) * focal;
    const moonR = focal * 0.045;
    out.push({
      kind: "circle",
      x: moonX,
      y: moonY,
      r: moonR,
      fill: "#d2f5da",
      opacity: 1,
      depth: 0,
    });
    // The sky's colour over most of the disc leaves a crescent.
    out.push({
      kind: "circle",
      x: moonX + moonR * 0.42,
      y: moonY - moonR * 0.2,
      r: moonR * 0.82,
      fill: SKY,
      opacity: 1,
      depth: 0,
    });
  }
  skyline(city).forEach((tower, k) => {
    const x = bearingX(tower.bearing, cam, frame);
    if (x === null) return;
    const wide = focal * 0.042;
    const tall = focal * tower.height;
    out.push(rect(x - wide / 2, hy - tall, wide, tall + 2, k % 3 === 0 ? "#1b2f25" : "#16261e"));
  });
  out.push(rect(-big, hy, big * 3, big * 4, GROUND));
  out.push(rect(-big, hy, big * 3, Math.max(2, focal * 0.012), HAZE));
  return out;
}
