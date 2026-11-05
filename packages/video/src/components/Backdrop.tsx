import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SpriteId } from "../art";
import { beats } from "../audio/track";
import { type FieldColor, palette, textOn } from "../theme";
import { Sprite } from "./Sprite";

/*
 * What sits on a scene's field behind the text, so no field is flat: GitHub's own shapes,
 * contribution cells and a branch graph, in the field's text colour at low opacity, plus (in some
 * scenes) a giant silhouette of Cell. Opacity stays low enough that every text pairing in
 * DESIGN.md keeps its measured contrast. Everything is seeded and driven by the frame.
 */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hex colour with an alpha, e.g. tint("#F4EFE3", 0.08). */
function tint(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Scattered contribution cells along the edges: some outlined, a few lit green, drifting. */
export function CellScatter({
  field,
  seed,
  count = 16,
}: {
  field: FieldColor;
  seed: string;
  count?: number;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const unit = Math.min(width, height) / 100;
  const ink = textOn[field];
  // Green cells read on ink, paper and cobalt; on persimmon they would muddy, so they stay ink.
  const lit = field !== "persimmon";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => `${seed}-cell-${i}`).map((id) => {
        const r = (k: string) => random(`${id}-${k}`);
        // Keep cells to the margin outside the content box (Field pads 6-10%), clear of the text.
        const edge = r("edge");
        const along = r("along");
        const inset = 0.012 + r("inset") * 0.04;
        const [fx, fy] =
          edge < 0.25
            ? [along, inset]
            : edge < 0.5
              ? [along, 1 - inset]
              : edge < 0.75
                ? [inset, along]
                : [1 - inset, along];
        const size = unit * (2.2 + r("size") * 4.5);
        const kind = r("kind");
        const appear = spring({
          frame: frame - Math.round(r("delay") * beats(3, fps)),
          fps,
          config: { damping: 14, stiffness: 140 },
        });
        const drift = Math.sin(frame / fps / (1.6 + r("period") * 2) + r("phase") * 6.28);
        const fill =
          kind < 0.18 && lit
            ? tint(palette.heat[Math.floor(r("heat") * 4)] ?? palette.cell, 0.55)
            : kind < 0.55
              ? tint(ink, 0.08)
              : "transparent";
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: fx * width - size / 2,
              top: fy * height - size / 2 + drift * unit * 0.8,
              width: size,
              height: size,
              borderRadius: size * 0.22,
              background: fill,
              border:
                fill === "transparent"
                  ? `${Math.max(1.5, unit * 0.3)}px solid ${tint(ink, 0.14)}`
                  : undefined,
              transform: `scale(${appear}) rotate(${(r("rot") - 0.5) * 16 + drift * 4}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/**
 * A git branch graph drawn across one edge: a trunk with a branch that splits off and merges
 * back, commits as rings. It draws itself over the first two beats.
 */
export function BranchLine({
  field,
  edge,
}: {
  field: FieldColor;
  /** Where the graph runs. */
  edge: "top" | "bottom";
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const unit = Math.min(width, height) / 100;
  const draw = interpolate(frame, [0, beats(2, fps)], [0, 1], clamp);
  const stroke = tint(textOn[field], 0.16);
  const y = edge === "top" ? height * 0.045 : height * 0.955;
  const lane = unit * 5 * (edge === "top" ? 1 : -1);
  const w = width;
  // Trunk across the frame; a branch leaves at 25% and merges back at 62%.
  const trunk = `M ${-w * 0.05} ${y} L ${w * 1.05} ${y}`;
  const branch = `M ${w * 0.22} ${y} C ${w * 0.27} ${y}, ${w * 0.27} ${y + lane}, ${w * 0.32} ${y + lane} L ${w * 0.55} ${y + lane} C ${w * 0.6} ${y + lane}, ${w * 0.6} ${y}, ${w * 0.65} ${y}`;
  const commits = [0.08, 0.17, 0.4, 0.48, 0.74, 0.86, 0.95];
  const branchCommits = [0.36, 0.45];
  const r = unit * 1.1;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} aria-hidden="true">
        <title>branch graph</title>
        <path
          d={trunk}
          stroke={stroke}
          strokeWidth={unit * 0.5}
          fill="none"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - draw}
        />
        <path
          d={branch}
          stroke={stroke}
          strokeWidth={unit * 0.5}
          fill="none"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - interpolate(draw, [0.2, 0.9], [0, 1], clamp)}
        />
        {commits.map((at) => (
          <circle
            key={at}
            cx={w * at}
            cy={y}
            r={r * (draw > at ? 1 : 0)}
            fill={palette[field]}
            stroke={stroke}
            strokeWidth={unit * 0.5}
          />
        ))}
        {branchCommits.map((at) => (
          <circle
            key={at}
            cx={w * at}
            cy={y + lane}
            r={r * (draw > at + 0.15 ? 1 : 0)}
            fill={field === "persimmon" ? tint(palette.ink, 0.3) : tint(palette.cell, 0.7)}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
}

export type SilhouetteSpot = {
  /** Centre of the character, as a fraction of the width. */
  x: number;
  /** Where its feet stand, as a fraction of the height (above 1 crops it at the bottom). */
  feet: number;
  /** Character height as a fraction of the frame height. */
  size: number;
  /** Mirror it, so it faces into the frame. */
  flip?: boolean;
};

/**
 * Cell as a giant flat silhouette in the field's text colour, bleeding off an edge: the mascot
 * is present without standing in front of the numbers. Drawn from the baked sprite, so it keeps
 * moving; it rises in slowly and leans with the beat.
 */
export function Silhouette({
  field,
  sprite,
  spot,
}: {
  field: FieldColor;
  sprite: SpriteId;
  spot: SilhouetteSpot;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  // In the sprite frames the character is about 76% of the frame tall, feet at about 85%.
  const box = (spot.size * height) / 0.76;
  const rise = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const sway = Math.sin((frame / fps) * Math.PI) * 1.2;
  // A light silhouette on dark fields, a dark one on light fields: both are the text colour.
  const light = textOn[field] === palette.paper;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: spot.x * width - box / 2,
          top: spot.feet * height - box * 0.85 + (1 - rise) * height * 0.25,
          filter: light ? "brightness(0) invert(1)" : "brightness(0)",
          opacity: (light ? 0.09 : 0.08) * Math.min(1, rise * 1.5),
          transform: `rotate(${sway}deg)`,
          transformOrigin: "50% 85%",
        }}
      >
        <Sprite id={sprite} size={box} flip={spot.flip} />
      </div>
    </AbsoluteFill>
  );
}
