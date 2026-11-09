import { heatLevels } from "../heat";
import { palette } from "../theme";
import { type Camera, PLOT_SPAN, project } from "./camera";
import { type City, isoPoint, plotHeight, TILE_H, TILE_W } from "./city";

type Frame = { width: number; height: number };
type Point = { x: number; y: number };

/** Share of a tile a building covers, so neighbouring plots read as separate blocks. */
const FOOTPRINT = 0.84;

/** Linear mix of two #RRGGBB colours, `t` of the way from `a` to `b`. */
function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Top, left and right face colours, with the faces away from the light darker. */
function faces(top: string): [string, string, string] {
  return [top, mix(top, palette.ink, 0.18), mix(top, palette.ink, 0.32)];
}

const ZERO_FACES = faces(palette.paper);
const LEVEL_FACES = palette.heat.map(faces);

/** 1 at the city overview, 0 once the camera is down to a few plots. */
export function cityOpacity(camera: Camera, citySpan: number): number {
  const near = Math.log(3 * PLOT_SPAN);
  const far = Math.log(citySpan);
  if (far <= near) return camera.span >= citySpan ? 1 : 0;
  return Math.min(1, Math.max(0, (Math.log(camera.span) - near) / (far - near)));
}

const points = (corners: Point[]) =>
  corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

export function CityLayer({
  city,
  camera,
  citySpan,
  frame,
}: {
  city: City;
  camera: Camera;
  citySpan: number;
  frame: Frame;
}) {
  const opacity = cityOpacity(camera, citySpan);
  if (opacity <= 0) return null;
  const px = Math.min(frame.width, frame.height) / 1080;
  const levels = heatLevels(city.plots);
  const w = TILE_W * FOOTPRINT;
  const h = TILE_H * FOOTPRINT;
  // Back to front: rows of the iso grid with a larger col + row sit nearer the viewer.
  const order = [...city.plots].sort((a, b) => a.col + a.row - (b.col + b.row) || a.col - b.col);

  const shapes = order.map((plot) => {
    const base = isoPoint(plot.col, plot.row);
    const lift = plotHeight(plot, city.maxCount);
    const at = (dx: number, dy: number) =>
      project({ x: base.x + dx, y: base.y + dy }, camera, frame);
    const topN = at(0, -h - lift);
    const ground = at(0, h);
    if (topN.y > frame.height || ground.y < 0) return null;
    const left = at(-w, 0);
    const right = at(w, 0);
    if (left.x > frame.width || right.x < 0) return null;

    const n = topN;
    const e = at(w, -lift);
    const s = at(0, h - lift);
    const wTop = at(-w, -lift);
    const sGround = ground;
    const key = plot.index;

    if (plot.state === "not-yet") {
      // Outline only: a day that hasn't happened must never look like a day with zero.
      return (
        <polygon
          key={key}
          points={points([wTop, n, e, right, sGround, left])}
          fill="none"
          stroke={palette.ink}
          strokeOpacity={0.35}
          strokeWidth={px}
        />
      );
    }
    const [top, leftFace, rightFace] =
      plot.state === "active"
        ? (LEVEL_FACES[(levels[plot.index] ?? 1) - 1] ?? ZERO_FACES)
        : ZERO_FACES;
    return (
      <g key={key}>
        <polygon points={points([wTop, s, sGround, left])} fill={leftFace} />
        <polygon points={points([s, e, right, sGround])} fill={rightFace} />
        <polygon points={points([wTop, n, e, s])} fill={top} />
      </g>
    );
  });

  return (
    <svg
      width={frame.width}
      height={frame.height}
      viewBox={`0 0 ${frame.width} ${frame.height}`}
      style={{ position: "absolute", inset: 0, opacity }}
      aria-hidden
    >
      {shapes}
    </svg>
  );
}
