import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { beats } from "../audio/track";
import { Sfx } from "./Sfx";

/*
 * A baked 3D cutout (public/art/cutout-*.png) placed in a scene: peeking in from an edge, sitting
 * in a corner, or as a faint silhouette behind the text. Each scene uses it differently, so the
 * illustrations vary instead of repeating one diorama. Always drawn behind the scene's text.
 */

type Enter = "right" | "left" | "bottom" | "fade";

/**
 * How the character keeps moving once it has entered, in time with the soundtrack, so it reads
 * as alive rather than a sticker. Each is a pure function of the frame (scenes stay
 * deterministic), pivoting at the feet so a squash looks like weight.
 */
export type Idle =
  | "wave" // rocks side to side, like a whole-body wave
  | "hop" // jumps on every beat and squashes on landing
  | "run" // quick double bounce per beat with a forward lean
  | "think" // slow tilt and float
  | "hammer" // dips forward on each beat, like a hammer blow
  | "float" // drifts up and down with a gentle roll
  | "groove" // nods to the beat with a sway every two beats
  | "celebrate" // big hop every two beats with a twist
  | "breathe"; // chest-out swell and a small bob

/** Transform for an idle motion. `beat` counts beats since the character settled. */
export function idleTransform(idle: Idle, beat: number, amount: number): string {
  const tau = 2 * Math.PI;
  const bounce = (rate: number) => Math.abs(Math.sin(Math.PI * beat * rate));
  // Squash right at the bottom of a bounce: 1 when landing, 0 mid-air.
  const land = (rate: number) => (1 - bounce(rate)) ** 6;
  let x = 0;
  let y = 0;
  let rotate = 0;
  let sx = 1;
  let sy = 1;
  switch (idle) {
    case "wave":
      rotate = 9 * Math.sin(tau * beat * 0.5);
      y = -2 * bounce(1);
      break;
    case "hop":
      y = -9 * bounce(1);
      sy = 1 - 0.09 * land(1);
      sx = 1 + 0.07 * land(1);
      rotate = 3 * Math.sin(tau * beat * 0.5);
      break;
    case "run":
      y = -4 * bounce(2);
      rotate = -4 + 3 * Math.sin(tau * beat);
      sy = 1 - 0.05 * land(2);
      break;
    case "think":
      rotate = 5 * Math.sin((tau * beat) / 8);
      y = -3 * Math.sin((tau * beat) / 4);
      break;
    case "hammer": {
      const strike = Math.max(0, Math.sin(tau * beat)) ** 3;
      rotate = 11 * strike;
      y = 2 * strike;
      sy = 1 - 0.08 * strike;
      sx = 1 + 0.05 * strike;
      break;
    }
    case "float":
      y = -4 * Math.sin((tau * beat) / 4);
      rotate = 3 * Math.sin((tau * beat) / 6);
      break;
    case "groove":
      sy = 1 - 0.06 * land(1);
      sx = 1 + 0.04 * land(1);
      y = -3 * bounce(1);
      x = 3 * Math.sin((tau * beat) / 4);
      rotate = 4 * Math.sin((tau * beat) / 4);
      break;
    case "celebrate":
      y = -12 * bounce(0.5);
      sy = 1 - 0.1 * land(0.5);
      sx = 1 + 0.08 * land(0.5);
      rotate = 6 * Math.sin((tau * beat) / 4);
      break;
    case "breathe": {
      const swell = (1 + Math.sin((tau * beat) / 2)) / 2;
      sx = 1 + 0.03 * swell;
      sy = 1 + 0.05 * swell;
      y = -2 * swell;
      break;
    }
  }
  // Distances are % of the character's own size, so every format moves alike. Rounded so the
  // CSS stays short and float noise never shows up as "-0.000000001%".
  const r = (n: number) => Math.round(n * 1000) / 1000 + 0;
  const k = amount;
  return `translate(${r(x * k)}%, ${r(y * k)}%) rotate(${r(rotate * k)}deg) scale(${r(1 + (sx - 1) * k)}, ${r(1 + (sy - 1) * k)})`;
}

export function Accent({
  art,
  at = 0,
  x,
  y,
  size,
  rotate = 0,
  enter = "fade",
  silhouette,
  opacity = 1,
  flip = false,
  idle,
}: {
  /** Cutout id, e.g. "cutout-cell-cheer". */
  art: string;
  /** Frame at which it starts entering. */
  at?: number;
  /** Centre position as fractions of the frame (can be past 0..1 to peek in from an edge). */
  x: number;
  y: number;
  /** Width as a fraction of the shorter side. */
  size: number;
  rotate?: number;
  enter?: Enter;
  /**
   * Flatten to a silhouette: "dark" (ink) on light fields, "light" (paper) on dark ones. Done
   * with a filter on <Img>, which Remotion waits for; a CSS mask image would not be awaited.
   */
  silhouette?: "dark" | "light";
  opacity?: number;
  flip?: boolean;
  /** Motion after the entrance; none keeps it still. */
  idle?: Idle;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const w = unit * size;
  const h = w * 0.75; // cutouts are 4:3
  const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 120, mass: 0.7 } });
  const offset = (1 - p) * w * 0.9;
  const dx = enter === "right" ? offset : enter === "left" ? -offset : 0;
  const dy = enter === "bottom" ? offset : 0;
  const shown = enter === "fade" ? interpolate(p, [0, 1], [0, 1]) : Math.min(1, p * 3);
  // The idle motion fades in over a beat once the entrance has mostly settled, so it never jumps.
  const beat = beats(1, fps);
  const settle = at + beat * 0.75;
  const amount = interpolate(frame, [settle, settle + beat], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idling =
    idle && amount > 0 ? idleTransform(idle, (frame - settle) / beat, amount) : undefined;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x * width - w / 2,
          top: y * height - h / 2,
          width: w,
          height: h,
          opacity: shown * opacity,
          transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg) scaleX(${flip ? -1 : 1})`,
        }}
      >
        <Img
          src={staticFile(`art/${art}.png`)}
          style={{
            width: "100%",
            height: "100%",
            transform: idling,
            transformOrigin: "50% 92%",
            objectFit: "contain",
            // A silhouette keeps the shape and drops the detail, so it reads as background.
            filter:
              silhouette === "dark"
                ? "brightness(0)"
                : silhouette === "light"
                  ? "brightness(0) invert(1)"
                  : undefined,
          }}
        />
      </div>
      {/* Entrances under the transition's own sound stay quiet. */}
      {at >= beats(1, fps) && (
        <Sfx at={at} sound={enter === "fade" ? "pop" : "whoosh"} volume={0.25} />
      )}
    </AbsoluteFill>
  );
}
