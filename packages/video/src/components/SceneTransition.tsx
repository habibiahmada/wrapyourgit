import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import type { SfxName } from "../audio/sfx";
import { beats } from "../audio/track";
import { useLayout } from "../layout";
import { type FieldColor, palette } from "../theme";
import type { TransitionVariant } from "../timeline";
import { Sfx } from "./Sfx";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeIn = (t: number) => t ** 3;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** Sounds per transition: what moves, heard. */
const SOUNDS: Record<TransitionVariant, { at: number; sound: SfxName; volume?: number }[]> = {
  dive: [
    { at: 0, sound: "whoosh" },
    { at: 0.55, sound: "land", volume: 0.4 },
  ],
  tilt: [{ at: 0, sound: "whoosh" }],
  pan: [{ at: 0, sound: "whoosh" }],
  iris: [
    { at: 0, sound: "pop" },
    { at: 0.15, sound: "shimmer", volume: 0.25 },
  ],
  blinds: [{ at: 0, sound: "cells" }],
  flip: [
    { at: 0, sound: "whoosh", volume: 0.35 },
    { at: 0.5, sound: "land", volume: 0.35 },
  ],
  flash: [{ at: 0, sound: "impact", volume: 0.5 }],
  pullback: [
    { at: 0, sound: "whoosh" },
    { at: 0.6, sound: "cells", volume: 0.3 },
  ],
};

/**
 * How a scene takes over from the one before, in one beat. Every cut has its own move (like a
 * camera, not a slideshow): `previous` is the old scene frozen on its last frame, `children` is
 * the new scene, both transformed here. It lives at the start of the new scene, so a web chapter
 * that stops on its last frame never stops mid-transition, and no scene length changes.
 */
export function SceneTransition({
  variant,
  from,
  to,
  seed,
  previous,
  children,
}: {
  variant: TransitionVariant;
  from: FieldColor;
  to: FieldColor;
  seed: string;
  previous: ReactNode;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const layout = useLayout();
  const duration = beats(1, fps);
  const sounds = SOUNDS[variant].map(({ at, sound, volume }) => (
    <Sfx key={`${sound}-${at}`} at={Math.round(at * duration)} sound={sound} volume={volume} />
  ));
  if (frame >= duration) {
    return (
      <>
        {children}
        {sounds}
      </>
    );
  }

  const t = frame / duration;
  const unit = Math.min(width, height) / 100;
  const layers = TRANSITIONS[variant]({ t, width, height, unit, layout, from, to, seed });

  return (
    <AbsoluteFill style={{ background: palette[layers.backdrop ?? to], overflow: "hidden" }}>
      {layers.newOnTop ? (
        <>
          {layers.previous && <AbsoluteFill style={layers.previous}>{previous}</AbsoluteFill>}
          <AbsoluteFill style={layers.next}>{children}</AbsoluteFill>
        </>
      ) : (
        <>
          <AbsoluteFill style={layers.next}>{children}</AbsoluteFill>
          {layers.previous && <AbsoluteFill style={layers.previous}>{previous}</AbsoluteFill>}
        </>
      )}
      {layers.overlay}
      {sounds}
    </AbsoluteFill>
  );
}

type Layers = {
  /** Style of the old scene; null once it is gone. */
  previous: CSSProperties | null;
  next: CSSProperties;
  /** Draw the new scene above the old one (for reveals that clip it). */
  newOnTop?: boolean;
  overlay?: ReactNode;
  /** Colour seen behind both while they move (default: the new field). */
  backdrop?: FieldColor;
};

type Frame = {
  t: number;
  width: number;
  height: number;
  unit: number;
  layout: ReturnType<typeof useLayout>;
  from: FieldColor;
  to: FieldColor;
  seed: string;
};

const TRANSITIONS: Record<TransitionVariant, (f: Frame) => Layers> = {
  /**
   * intro → contributions. The camera dives into the first week's cells: the old scene grows
   * around them while a cell of the new field swells from the same spot and becomes the field.
   */
  dive: ({ t, width, height, layout, to }) => {
    const ox = layout === "landscape" ? 0.1 : 0.14;
    const oy = layout === "landscape" ? 0.5 : 0.13;
    const zoom = easeIn(Math.min(1, t / 0.6));
    const cover = Math.hypot(width, height) * 2.2;
    const size = interpolate(t, [0.1, 0.6], [0, cover], { ...clamp, easing: easeIn });
    const fade = interpolate(t, [0.6, 1], [1, 0], clamp);
    return {
      previous:
        t < 0.6
          ? { transform: `scale(${1 + 7 * zoom})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }
          : null,
      next: { transform: `scale(${1.12 - 0.12 * easeOut(Math.max(0, (t - 0.6) / 0.4))})` },
      overlay: (
        <div
          style={{
            position: "absolute",
            left: ox * width - size / 2,
            top: oy * height - size / 2,
            width: size,
            height: size,
            borderRadius: size * 0.12,
            background: palette[to],
            opacity: fade,
          }}
        />
      ),
    };
  },

  /** contributions → rhythm. The camera tilts down: the old scene leaves up, the new rises in. */
  tilt: ({ t, unit }) => {
    const p = easeInOut(t);
    const blur = Math.sin(Math.PI * t) * unit * 1.2;
    return {
      previous: { transform: `translateY(${-100 * p}%)`, filter: `blur(${blur}px)` },
      next: { transform: `translateY(${100 * (1 - p)}%)`, filter: `blur(${blur}px)` },
    };
  },

  /** rhythm → tech-dna. A whip pan: both scenes streak sideways with a slight lean. */
  pan: ({ t, unit }) => {
    const p = easeInOut(t);
    const blur = Math.sin(Math.PI * t) * unit * 1.6;
    const skew = Math.sin(Math.PI * t) * -8;
    return {
      previous: {
        transform: `translateX(${-100 * p}%) skewX(${skew}deg)`,
        filter: `blur(${blur}px)`,
      },
      next: {
        transform: `translateX(${100 * (1 - p)}%) skewX(${skew}deg)`,
        filter: `blur(${blur}px)`,
      },
    };
  },

  /** tech-dna → projects. An iris opens on the new scene, rimmed with a lit green ring. */
  iris: ({ t, width, height, unit }) => {
    const p = easeOut(t);
    const cx = width * 0.5;
    const cy = height * 0.42;
    const radius = p * Math.hypot(width, height) * 0.62;
    const ring = unit * 2.2 * (1 - t);
    return {
      previous: { transform: `scale(${1 - 0.06 * p})` },
      next: { clipPath: `circle(${radius}px at ${cx}px ${cy}px)` },
      newOnTop: true,
      backdrop: "ink",
      overlay: (
        <div
          style={{
            position: "absolute",
            left: cx - radius,
            top: cy - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: "50%",
            boxShadow: `0 0 0 ${ring}px ${palette.cell}`,
          }}
        />
      ),
    };
  },

  /**
   * projects → community. Blinds: ink and green bars sweep across one after another, then
   * fold away from the other side to show the new scene.
   */
  blinds: ({ t, height }) => {
    const bars = 7;
    const barHeight = height / bars;
    return {
      previous: t < 0.5 ? {} : null,
      next: {},
      overlay: (
        <>
          {Array.from({ length: bars }, (_, i) => {
            const delay = (i / bars) * 0.25;
            const grow = interpolate(t, [delay, delay + 0.25], [0, 1], {
              ...clamp,
              easing: easeOut,
            });
            const shrink = interpolate(t, [0.5 + delay, 0.75 + delay], [1, 0], {
              ...clamp,
              easing: easeIn,
            });
            const covering = t < 0.5 + delay;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of bars, index is the position
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * barHeight,
                  height: barHeight + 1,
                  // Ink and lit-green rows, so the sweep reads as contribution rows on any two fields.
                  background: i % 2 === 0 ? palette.ink : palette.cell,
                  transform: `scaleX(${covering ? grow : shrink})`,
                  transformOrigin: covering
                    ? i % 2 === 0
                      ? "left"
                      : "right"
                    : i % 2 === 0
                      ? "right"
                      : "left",
                }}
              />
            );
          })}
        </>
      ),
    };
  },

  /** community → engineering. The frame flips like a card; the new scene is its back. */
  flip: ({ t, unit }) => {
    const first = t < 0.5;
    const half = first ? t / 0.5 : (t - 0.5) / 0.5;
    const dip = 1 - 0.14 * Math.sin(Math.PI * t);
    const angle = first ? 90 * easeIn(half) : -90 * (1 - easeOut(half));
    const card: CSSProperties = {
      transform: `perspective(1600px) scale(${dip}) rotateY(${angle}deg)`,
      borderRadius: unit * 3 * Math.sin(Math.PI * t),
      overflow: "hidden",
      backfaceVisibility: "hidden",
    };
    return {
      previous: first ? card : null,
      next: first ? { opacity: 0 } : card,
      backdrop: "paper",
    };
  },

  /**
   * engineering → identity, the climax. The old scene lunges forward into a flash of light; the
   * new one lands with a camera shake that settles within the beat.
   */
  flash: ({ t, unit, seed }) => {
    const lunge = easeIn(Math.min(1, t / 0.3));
    const light =
      t < 0.3
        ? interpolate(t, [0.15, 0.3], [0, 1], clamp)
        : interpolate(t, [0.3, 1], [1, 0], { ...clamp, easing: easeOut });
    const decay = Math.max(0, 1 - (t - 0.3) / 0.7);
    const shakeX = (random(`${seed}-x-${Math.round(t * 30)}`) - 0.5) * unit * 4 * decay;
    const shakeY = (random(`${seed}-y-${Math.round(t * 30)}`) - 0.5) * unit * 4 * decay;
    return {
      previous: t < 0.3 ? { transform: `scale(${1 + 0.25 * lunge})` } : null,
      next:
        t < 0.3
          ? { opacity: 0 }
          : {
              transform: `translate(${shakeX}px, ${shakeY}px) scale(${1.04 - 0.04 * (1 - decay)})`,
            },
      overlay: <AbsoluteFill style={{ background: palette.paper, opacity: light }} />,
    };
  },

  /**
   * identity → closing. The camera pulls back: the old scene shrinks into a small tilted card
   * that drops toward the year graph, while the new scene settles from slightly close.
   */
  pullback: ({ t, unit }) => {
    const p = easeInOut(t);
    return {
      previous:
        t < 0.85
          ? {
              transform: `translate(${-28 * p}%, ${30 * p}%) scale(${1 - 0.92 * p}) rotate(${-8 * p}deg)`,
              borderRadius: unit * 3 * p,
              overflow: "hidden",
              boxShadow: `0 ${unit * 2}px ${unit * 6}px rgba(0,0,0,${0.45 * p})`,
            }
          : null,
      next: { transform: `scale(${1.15 - 0.15 * easeOut(t)})` },
    };
  },
};
