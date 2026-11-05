import { ThreeCanvas } from "@remotion/three";
import type { ReactNode } from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { beats } from "../audio/track";
import type { PhotoId } from "../photos";
import { BlobShadow } from "../three/BlobShadow";
import { CutoutLights } from "../three/World";
import { PhotoCard } from "./PhotoCard";
import { Sfx } from "./Sfx";

/**
 * A character rendered live in 3D, frame by frame, placed like an Accent: the picture is not a
 * baked PNG, so arms, legs, head and eyes really move. `children` gets the time in seconds and
 * returns the posed character. Costs a WebGL draw per frame (ADR-0010). With `photo`, the character
 * stands in front of a snapshot of a place (PhotoCard) that fills the upper part of the same box,
 * so the footprint, and every tuned position, stays the same.
 */
export function LiveAccent({
  at = 0,
  x,
  y,
  size,
  enter = "bottom",
  aspect = 1,
  camera = { z: 5.6, y: 1.5, look: 0.95 },
  photo,
  tilt = 0,
  children,
}: {
  at?: number;
  /** Centre as fractions of the frame. */
  x: number;
  y: number;
  /** Width as a fraction of the shorter side. */
  size: number;
  enter?: "right" | "bottom";
  /** Width over height of the canvas: wider for a group. */
  aspect?: number;
  /** Camera distance, height and the height it looks at, for bigger or taller casts. */
  camera?: { z: number; y: number; look: number };
  /** A backdrop photo behind the character. */
  photo?: PhotoId;
  /** Tilt of the photo, degrees. */
  tilt?: number;
  children: (t: number) => ReactNode;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const w = Math.round(Math.min(width, height) * size);
  const h = Math.round(w / aspect);
  const p = spring({ frame: frame - at, fps, config: { damping: 16, stiffness: 120, mass: 0.7 } });
  const offset = (1 - p) * w * 0.9;
  const t = frame / fps;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: x * width - w / 2,
          top: y * height - h / 2,
          width: w,
          height: h,
          opacity: Math.min(1, p * 3),
          transform: enter === "right" ? `translateX(${offset}px)` : `translateY(${offset}px)`,
        }}
      >
        {photo && (
          <div style={{ position: "absolute", left: w * 0.03, top: h * 0.02 }}>
            <PhotoCard photo={photo} width={w * 0.94} height={w * 0.94 * 0.72} tilt={tilt} t={t} />
          </div>
        )}
        {/* Positioned, so it paints over the absolutely placed photo. */}
        <div style={{ position: "relative" }}>
          <ThreeCanvas
            width={w}
            height={h}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            // Straight on, a little above: the character faces the viewer.
            camera={{ position: [0, camera.y, camera.z], fov: 30 }}
            onCreated={(state) => {
              state.camera.lookAt(0, camera.look, 0);
              state.gl.toneMapping = NeutralToneMapping;
              state.gl.toneMappingExposure = 1.05;
            }}
          >
            <CutoutLights />
            <BlobShadow size={[1.6 * aspect, 1.2]} opacity={0.4} />
            {children(t)}
          </ThreeCanvas>
        </div>
      </div>
      {at >= beats(1, fps) && <Sfx at={at} sound="whoosh" volume={0.25} />}
    </AbsoluteFill>
  );
}
