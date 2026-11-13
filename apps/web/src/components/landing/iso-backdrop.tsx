import { type Box, type Pane, TONES, type Tone, viewBoxOf } from "./iso";
import { IsoArt } from "./iso-art";

const LANG_TS: Tone = { top: "#58a6ff", left: "#3178c6", right: "#1f538f" };
const LANG_JS: Tone = { top: "#f8e3a1", left: "#d29922", right: "#9e6a03" };
const LANG_PY: Tone = { top: "#79c0ff", left: "#3572a5", right: "#244f75" };
const LANG_RS: Tone = { top: "#ffa657", left: "#bd561d", right: "#87380d" };
const RAIL_STEEL: Tone = { top: "#8b949e", left: "#484f58", right: "#30363d" };
const GOLD_WINDOW = "#f2cc60";
const GREEN_WINDOW = "#56d364";

function towerWindows(tall: number, cols = 2): Pane[] {
  const panes: Pane[] = [];
  for (let z = 0.25; z + 0.18 < tall - 0.1; z += 0.34) {
    for (const face of ["left", "right"] as const) {
      for (let c = 0; c < cols; c++) {
        const u0 = cols === 1 ? 0.25 : 0.14 + c * 0.44;
        const u1 = cols === 1 ? 0.75 : u0 + 0.26;
        panes.push({
          face,
          u: [u0, u1],
          z: [z, z + 0.16],
          fill: (Math.round(z * 10) + c) % 3 === 0 ? GREEN_WINDOW : GOLD_WINDOW,
        });
      }
    }
  }
  return panes;
}

export type IsoClusterKind =
  | "calendar"
  | "languages"
  | "compare"
  | "video"
  | "act-city"
  | "act-craft"
  | "act-finale";

/**
 * Detailed isometric dioramas rendered as server-side SVG in the 2:1 projection (`iso.ts`).
 * Each `kind` has its own distinct architecture, silhouette, and panes so no two illustrations
 * on the landing page look alike (R-22).
 */
export function MiniIsoCluster({
  kind,
  className = "",
}: {
  kind: IsoClusterKind;
  className?: string;
}) {
  const boxes: Box[] = [];

  if (kind === "calendar") {
    // A 5x4 city block on a plaza slab, with a front street, lit windows, and a beacon on the tallest tower.
    boxes.push({ at: [-0.4, -0.4, -0.35], size: [6.4, 5.4, 0.35], tone: TONES.deep });
    boxes.push({ at: [-0.4, 4.3, 0], size: [6.4, 0.7, 0.04], tone: TONES.dark });
    const grid = [
      [0.35, 0.9, 1.5, 0.55],
      [0.7, 2.2, 1.2, 0.85],
      [1.1, 1.7, 3.3, 1.0],
      [0.5, 1.9, 1.3, 2.4],
      [0.8, 0.6, 1.6, 0.95],
    ];
    grid.forEach((col, cx) => {
      col.forEach((h, cy) => {
        const busiest = cx === 2 && cy === 2;
        const tone = busiest ? TONES.lit : h > 2.0 ? TONES.mid : h > 1.1 ? TONES.low : TONES.faint;
        boxes.push({
          at: [cx * 1.12, cy * 1.02, 0],
          size: [0.86, 0.86, h],
          tone,
          panes: busiest ? undefined : towerWindows(h, 2),
        });
        if (busiest) {
          boxes.push({
            at: [cx * 1.12 + 0.23, cy * 1.02 + 0.23, h],
            size: [0.4, 0.4, 0.45],
            tone: TONES.lit,
          });
        }
      });
    });
  } else if (kind === "languages") {
    // Stepped language monuments in their language colours (TypeScript blue, JS gold, Python cyan, Rust orange, Shell green).
    boxes.push({ at: [-0.3, -0.3, -0.3], size: [5.8, 4.4, 0.3], tone: TONES.deep });
    const langs: { x: number; y: number; w: number; h: number; tone: Tone }[] = [
      { x: 0.3, y: 0.5, w: 1.15, h: 3.1, tone: LANG_TS },
      { x: 1.75, y: 0.7, w: 1.05, h: 2.35, tone: LANG_JS },
      { x: 3.1, y: 0.9, w: 1.0, h: 1.75, tone: LANG_PY },
      { x: 1.1, y: 2.2, w: 0.95, h: 1.3, tone: LANG_RS },
      { x: 2.4, y: 2.35, w: 0.95, h: 0.95, tone: TONES.mid },
      { x: 3.7, y: 2.45, w: 0.9, h: 0.65, tone: TONES.low },
    ];
    for (const l of langs) {
      boxes.push({
        at: [l.x, l.y, 0],
        size: [l.w, l.w, 0.18],
        tone: TONES.dark,
      });
      boxes.push({
        at: [l.x + 0.08, l.y + 0.08, 0.18],
        size: [l.w - 0.16, l.w - 0.16, l.h],
        tone: l.tone,
        panes: [
          { face: "left", u: [0.2, 0.8], z: [0.2, Math.max(0.35, l.h - 0.25)], fill: "#0d1117" },
        ],
      });
    }
  } else if (kind === "compare") {
    // Year-over-year twin towers joined by a skybridge and stepped delta terraces.
    boxes.push({ at: [-0.3, -0.3, -0.3], size: [5.6, 4.2, 0.3], tone: TONES.deep });
    // Previous year tower (left)
    boxes.push({
      at: [0.5, 1.0, 0],
      size: [1.45, 1.45, 1.85],
      tone: TONES.low,
      panes: towerWindows(1.85, 2),
    });
    // Skybridge connecting 2025 to 2026
    boxes.push({
      at: [1.95, 1.4, 1.2],
      size: [1.05, 0.65, 0.28],
      tone: RAIL_STEEL,
    });
    // Current year tower (right, taller and bright green)
    boxes.push({
      at: [3.0, 1.0, 0],
      size: [1.45, 1.45, 3.2],
      tone: TONES.lit,
      panes: towerWindows(3.2, 2),
    });
    // Crown on the current year tower
    boxes.push({
      at: [3.35, 1.35, 3.2],
      size: [0.75, 0.75, 0.45],
      tone: TONES.mid,
    });
    // Foreground comparison baseline bar
    boxes.push({ at: [0.5, 2.85, 0], size: [3.95, 0.55, 0.22], tone: TONES.dark });
  } else if (kind === "video") {
    // Four aspect-ratio display frames (9:16 vertical, 4:5 portrait, 1:1 square, 16:9 widescreen)
    // standing on a broadcast stage without enclosing room walls.
    boxes.push({ at: [-0.2, 0.4, -0.25], size: [6.2, 2.2, 0.25], tone: TONES.deep });
    boxes.push({ at: [0.0, 0.7, 0], size: [5.8, 1.6, 0.12], tone: TONES.dark });
    const screens: { w: number; h: number; tone: Tone; screenFill: string }[] = [
      { w: 0.95, h: 1.95, tone: TONES.lit, screenFill: "#39d353" },
      { w: 1.08, h: 1.42, tone: TONES.mid, screenFill: "#26a641" },
      { w: 1.15, h: 1.15, tone: TONES.low, screenFill: "#006d32" },
      { w: 1.85, h: 1.05, tone: LANG_TS, screenFill: "#4493f8" },
    ];
    let x = 0.22;
    for (const s of screens) {
      boxes.push({
        at: [x, 1.15, 0.12],
        size: [s.w, 0.22, s.h],
        tone: s.tone,
        panes: [
          { face: "left", u: [0.08, 0.92], z: [0.1, s.h - 0.1], fill: "#0d1117" },
          { face: "left", u: [0.18, 0.82], z: [0.22, s.h * 0.55], fill: s.screenFill },
        ],
      });
      x += s.w + 0.22;
    }
  } else if (kind === "act-city") {
    // Act 1: Station arrival gate and rising city blocks
    boxes.push({ at: [0, 0, -0.25], size: [4.6, 4.0, 0.25], tone: TONES.deep });
    boxes.push({ at: [0.3, 2.8, 0], size: [4.0, 0.6, 0.1], tone: RAIL_STEEL });
    boxes.push({ at: [0.6, 0.6, 0], size: [0.9, 0.9, 1.1], tone: TONES.faint });
    boxes.push({ at: [1.8, 0.6, 0], size: [0.9, 0.9, 1.9], tone: TONES.mid });
    boxes.push({ at: [3.0, 0.6, 0], size: [1.0, 1.0, 2.8], tone: TONES.lit });
    boxes.push({ at: [1.2, 1.7, 0], size: [0.85, 0.85, 1.4], tone: TONES.low });
  } else if (kind === "act-craft") {
    // Act 2: Train wagons carrying weekday & language cargo along a track
    boxes.push({ at: [0, 0, -0.25], size: [4.8, 3.6, 0.25], tone: TONES.deep });
    boxes.push({ at: [0.2, 1.4, 0], size: [4.4, 0.8, 0.08], tone: RAIL_STEEL });
    boxes.push({ at: [0.4, 1.5, 0.08], size: [1.1, 0.6, 0.75], tone: TONES.lit });
    boxes.push({ at: [1.75, 1.5, 0.08], size: [1.1, 0.6, 1.15], tone: LANG_TS });
    boxes.push({ at: [3.1, 1.5, 0.08], size: [1.1, 0.6, 0.9], tone: LANG_JS });
  } else {
    // Act 3: Podium stage with spotlight tower & letter monument
    boxes.push({ at: [0, 0, -0.25], size: [4.6, 4.0, 0.25], tone: TONES.deep });
    boxes.push({ at: [1.1, 1.1, 0], size: [2.4, 2.0, 0.45], tone: TONES.dark });
    boxes.push({ at: [1.75, 1.5, 0.45], size: [1.1, 1.1, 2.3], tone: TONES.lit });
    boxes.push({ at: [0.4, 0.5, 0], size: [0.8, 0.8, 1.4], tone: LANG_TS });
    boxes.push({ at: [3.4, 0.5, 0], size: [0.8, 0.8, 1.4], tone: TONES.mid });
  }

  return (
    <IsoArt
      boxes={boxes}
      viewBox={viewBoxOf(boxes, [], 0.45)}
      className={`block h-auto w-full ${className}`}
    />
  );
}

/**
 * Ambient light orb behind key isometric dioramas so frosted glass cards have subtle light to refract.
 */
export function GlowOrb({
  color = "green",
  position = "center",
}: {
  color?: "green" | "blue";
  position?: "left" | "right" | "center" | "top";
}) {
  const bg =
    color === "blue"
      ? "radial-gradient(circle, rgba(68,147,248,0.16) 0%, rgba(68,147,248,0.04) 45%, transparent 72%)"
      : "radial-gradient(circle, rgba(57,211,83,0.18) 0%, rgba(38,166,65,0.05) 45%, transparent 72%)";

  const pos =
    position === "left"
      ? "-left-32 top-1/4"
      : position === "right"
        ? "-right-32 top-1/3"
        : position === "top"
          ? "left-1/2 -top-40 -translate-x-1/2"
          : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute h-[34rem] w-[34rem] rounded-full blur-3xl ${pos}`}
      style={{ background: bg }}
    />
  );
}
