import { useId } from "react";
import { type Box, iso, TONES, type Vec, viewBoxOf } from "./iso";
import { IsoArt } from "./iso-art";

/**
 * Isometric room backdrop: draws a 2:1 isometric floor grid that meets back-left and back-right
 * vertical walls with climbing z-lines, a few points where lines meet, and dashed traces.
 * Purpose (R-07, R-31): extends the story city's 2:1 isometric projection from the floor up into
 * the section walls so every band reads as a room inside the same isometric world.
 */
export function IsoBackdrop({
  variant = "green",
  density = "normal",
  corner = 0.5,
  className = "",
}: {
  variant?: "green" | "blue";
  density?: "sparse" | "normal" | "dense";
  /** Where across the band the room's corner stands, 0 (left) to 1 (right): keep its upright
   * line off the section's heading. */
  corner?: number;
  className?: string;
}) {
  // Two rooms on one page must not share gradient and mask ids.
  const id = useId();
  const accent = variant === "blue" ? "#4493f8" : "#39d353";
  const span = density === "dense" ? 18 : density === "sparse" ? 12 : 15;
  const left = -32 * corner;
  const wallHeight = 10;

  const floorX: string[] = [];
  const floorY: string[] = [];
  const wallLeftVert: string[] = [];
  const wallLeftHoriz: string[] = [];
  const wallRightVert: string[] = [];
  const wallRightHoriz: string[] = [];

  const seg = (a: Vec, b: Vec) => {
    const [ax, ay] = iso(a);
    const [bx, by] = iso(b);
    return `M${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}`;
  };

  for (let i = 0; i <= span; i++) {
    floorX.push(seg([i, 0, 0], [i, span, 0]));
    floorY.push(seg([0, i, 0], [span, i, 0]));
    wallLeftVert.push(seg([i, 0, 0], [i, 0, wallHeight]));
    wallRightVert.push(seg([0, i, 0], [0, i, wallHeight]));
  }

  for (let z = 0; z <= wallHeight; z += 1.5) {
    wallLeftHoriz.push(seg([0, 0, z], [span, 0, z]));
    wallRightHoriz.push(seg([0, 0, z], [0, span, z]));
  }

  const spine = seg([0, 0, 0], [0, 0, wallHeight]);
  const seamLeft = seg([0, 0, 0], [span, 0, 0]);
  const seamRight = seg([0, 0, 0], [0, span, 0]);

  const nodes: { pt: [number, number]; lit: boolean }[] = [
    { pt: iso([3, 0, 4.5]), lit: true },
    { pt: iso([7, 0, 3]), lit: false },
    { pt: iso([11, 0, 6]), lit: true },
    { pt: iso([0, 4, 3]), lit: true },
    { pt: iso([0, 9, 6]), lit: false },
    { pt: iso([0, 12, 4.5]), lit: true },
    { pt: iso([4, 4, 0]), lit: true },
    { pt: iso([9, 3, 0]), lit: false },
    { pt: iso([3, 10, 0]), lit: true },
    { pt: iso([11, 9, 0]), lit: true },
  ];

  const traces = [
    `M${iso([10, 6, 0]).join(" ")}L${iso([4, 6, 0]).join(" ")}L${iso([4, 0, 0]).join(" ")}L${iso([4, 0, 6]).join(" ")}`,
    `M${iso([7, 11, 0]).join(" ")}L${iso([0, 11, 0]).join(" ")}L${iso([0, 11, 4.5]).join(" ")}`,
    `M${iso([12, 3, 0]).join(" ")}L${iso([12, 0, 0]).join(" ")}L${iso([12, 0, 4.5]).join(" ")}`,
  ];

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      <svg
        aria-hidden
        viewBox={`${left} -11 32 24`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full opacity-45"
      >
        <defs>
          <radialGradient id={`room-fade-${id}`} cx="50%" cy="48%" r="54%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <mask id={`room-mask-${id}`}>
            <rect x={left - 4} y="-16" width="40" height="32" fill={`url(#room-fade-${id})`} />
          </mask>
        </defs>

        <g mask={`url(#room-mask-${id})`}>
          {/* Back-left wall grid */}
          <g stroke="#30363d" strokeWidth="0.04" opacity="0.65">
            {wallLeftVert.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
            {wallLeftHoriz.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
          </g>

          {/* Back-right wall grid */}
          <g stroke="#30363d" strokeWidth="0.04" opacity="0.55">
            {wallRightVert.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
            {wallRightHoriz.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
          </g>

          {/* Floor isometric grid */}
          <g stroke="#30363d" strokeWidth="0.045" opacity="0.75">
            {floorX.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
            {floorY.map((d) => (
              <path key={d} d={d} fill="none" />
            ))}
          </g>

          {/* Structural wall seams and vertical corner spine */}
          <path d={spine} stroke={accent} strokeWidth="0.08" opacity="0.5" fill="none" />
          <path d={seamLeft} stroke={accent} strokeWidth="0.07" opacity="0.4" fill="none" />
          <path d={seamRight} stroke="#4493f8" strokeWidth="0.07" opacity="0.35" fill="none" />

          {/* Glowing energy circuit traces */}
          {traces.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={accent}
              strokeWidth="0.06"
              strokeDasharray="0.4 0.3"
              opacity="0.4"
            />
          ))}

          {/* Intersection nodes */}
          {nodes.map(({ pt: [cx, cy], lit }, i) => (
            <g
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative points
              key={i}
            >
              <circle
                cx={cx}
                cy={cy}
                r={lit ? "0.1" : "0.08"}
                fill={lit ? accent : "#8b949e"}
                opacity={lit ? "0.7" : "0.45"}
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Mini isometric diorama clusters rendered as server-side SVG in the 2:1 projection (`iso.ts`).
 * Each cluster stands on a floor slab with two wall ledges behind it, a corner of the same room
 * the bands stand in: the calendar as a city, languages as bars, the year comparison as two
 * towers, and the video's four shapes as screens (R-22).
 */
export function MiniIsoCluster({
  kind,
  className = "",
}: {
  kind: "calendar" | "languages" | "compare" | "video";
  className?: string;
}) {
  const boxes: Box[] = [];
  // Base slab with isometric back-left (y = -0.25) and back-right (x = -0.25) walls
  // The screens stand in a row, so their room is shallow: a deep one would be mostly floor.
  const deep = kind === "video" ? 2.2 : 5.4;
  const tall = kind === "video" ? 2.7 : 3.2;
  boxes.push({ at: [0, 0, -0.4], size: [5.4, deep, 0.4], tone: TONES.deep });
  boxes.push({ at: [0, -0.25, -0.4], size: [5.4, 0.25, tall], tone: TONES.dark });
  boxes.push({ at: [-0.25, 0, -0.4], size: [0.25, deep, tall], tone: TONES.dark });

  if (kind === "calendar") {
    const heights = [
      [0.4, 0.9, 1.8, 0.6],
      [0.7, 2.5, 1.3, 1.0],
      [1.2, 1.6, 3.1, 0.8],
      [0.5, 1.1, 0.9, 1.5],
    ];
    heights.forEach((row, x) => {
      row.forEach((h, y) => {
        const tone = h > 2.6 ? TONES.lit : h > 1.5 ? TONES.mid : h > 0.8 ? TONES.low : TONES.faint;
        boxes.push({
          at: [0.6 + x * 1.1, 0.6 + y * 1.1, 0],
          size: [0.82, 0.82, h],
          tone,
        });
      });
    });
  } else if (kind === "languages") {
    const bars: { x: number; y: number; h: number; tone: (typeof TONES)[keyof typeof TONES] }[] = [
      { x: 0.8, y: 1.0, h: 2.9, tone: TONES.lit },
      { x: 2.2, y: 1.0, h: 2.1, tone: TONES.mid },
      { x: 3.6, y: 1.0, h: 1.4, tone: TONES.low },
      { x: 1.4, y: 2.8, h: 1.1, tone: TONES.faint },
      { x: 2.9, y: 2.8, h: 0.75, tone: TONES.dark },
    ];
    for (const b of bars) {
      boxes.push({ at: [b.x, b.y, 0], size: [0.95, 0.95, b.h], tone: b.tone });
    }
  } else if (kind === "video") {
    // The video's four shapes as screens standing in a row, each to its own proportions:
    // 9:16, 4:5, 1:1 and 16:9.
    const screens: [wide: number, tall: number][] = [
      [1, 1.78],
      [1, 1.25],
      [1, 1],
      [1.7, 0.96],
    ];
    boxes.push({ at: [0, 0.95, 0], size: [5.4, 0.5, 0.1], tone: TONES.dark });
    let x = 0.08;
    for (const [wide, tall] of screens) {
      boxes.push({
        at: [x, 1.13, 0.1],
        size: [wide, 0.14, tall],
        tone: TONES.dark,
        panes: [{ face: "left", u: [0.08, 0.92], z: [0.08, tall - 0.08], fill: "#26a641" }],
      });
      x += wide + 0.18;
    }
  } else {
    // Compare: two twin towers side by side (last year vs this year)
    boxes.push({ at: [1.0, 1.5, 0], size: [1.3, 1.3, 1.6], tone: TONES.low });
    boxes.push({ at: [2.8, 1.5, 0], size: [1.3, 1.3, 2.8], tone: TONES.lit });
    boxes.push({ at: [1.0, 3.2, 0], size: [3.1, 0.9, 0.4], tone: TONES.mid });
  }

  return (
    <IsoArt
      boxes={boxes}
      viewBox={viewBoxOf(boxes, [], 0.5)}
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
