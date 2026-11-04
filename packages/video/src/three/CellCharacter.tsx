import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { Color } from "three";
import { Outfit } from "./outfits";

export { HardHat } from "./outfits";

import { C } from "./palette";
import { Blush, Gloss, Ink, MouthPaint, Sparkle, Toon } from "./toon";

/*
 * Cell in 3D: a rounded contribution cell with a sculpted face, drawn as a cartoon (cel shading
 * and an ink outline, see toon.tsx). No textures, so it stays crisp at any size and renders the
 * same in the browser and in Remotion. All motion comes from `t` (seconds), which the caller
 * drives: the render clock on the web, the frame in video.
 */

export { C };

export type Pose = "idle" | "wave" | "cheer" | "proud" | "think" | "sleep";

/** A darker shade of the body colour for limbs and brows, so they read as part of one toy. */
function shade(color: string, amount: number): string {
  return `#${new Color(color).lerp(new Color("#0b120d"), amount).getHexString()}`;
}

function Arm({ side, raise, color }: { side: 1 | -1; raise: number; color: string }) {
  // raise: 0 hanging, 1 straight up. The shoulder sits just inside the body, so the arm grows
  // out of the side instead of floating next to it.
  const angle = side * (0.3 + raise * 2.4);
  return (
    <group position={[side * 0.5, 0.02, 0.02]} rotation={[0, 0, angle]}>
      <mesh position={[0, -0.26, 0]}>
        <capsuleGeometry args={[0.085, 0.34, 8, 20]} />
        <Toon color={color} />
      </mesh>
      {/* A cartoon glove: a soft mitten with a thumb. */}
      <group position={[0, -0.52, 0]}>
        <mesh scale={[1, 0.92, 0.85]}>
          <sphereGeometry args={[0.135, 32, 32]} />
          <Toon color={C.paper} />
        </mesh>
        <mesh position={[side * -0.1, 0.05, 0.05]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <Toon color={C.paper} />
        </mesh>
      </group>
    </group>
  );
}

function Eye({ x, closed, squint }: { x: number; closed: boolean; squint: boolean }) {
  if (closed) {
    return (
      <mesh position={[x, 0.1, 0.56]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.09, 0.026, 12, 32, Math.PI]} />
        <MouthPaint />
      </mesh>
    );
  }
  if (squint) {
    // Happy closed eyes: an upturned arc.
    return (
      <mesh position={[x, 0.08, 0.565]}>
        <torusGeometry args={[0.085, 0.026, 12, 32, Math.PI]} />
        <MouthPaint />
      </mesh>
    );
  }
  return (
    <group position={[x, 0.12, 0.54]}>
      {/* A glossy eyeball that bulges out of the face, a large pupil, and two sparkles. */}
      <mesh scale={[1, 1.18, 0.55]}>
        <sphereGeometry args={[0.14, 40, 40]} />
        <Gloss color="#fbfaf5" />
      </mesh>
      <mesh position={[0.012, -0.015, 0.06]} scale={[1, 1.15, 0.45]}>
        <sphereGeometry args={[0.085, 32, 32]} />
        <Gloss color="#0d0d10" />
      </mesh>
      <mesh position={[0.038, 0.035, 0.1]}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <Sparkle />
      </mesh>
      <mesh position={[-0.022, -0.05, 0.098]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <Sparkle />
      </mesh>
    </group>
  );
}

function Brow({ x, lift, tilt, color }: { x: number; lift: number; tilt: number; color: string }) {
  return (
    <mesh position={[x, 0.27 + lift, 0.56]} rotation={[0, 0, Math.PI / 2 + tilt]}>
      <capsuleGeometry args={[0.026, 0.1, 8, 16]} />
      <Toon color={color} />
    </mesh>
  );
}

export function CellCharacter({
  pose = "idle",
  t = 0,
  position = [0, 0, 0],
  scale = 1,
  hat,
  outfit,
  color = C.green,
  rotationY = 0,
}: {
  pose?: Pose;
  t?: number;
  position?: [number, number, number];
  scale?: number;
  /** Optional extra prop on the head. */
  hat?: ReactNode;
  /** The archetype costume Cell wears (outfits.tsx). */
  outfit?: ArchetypeId;
  /** Body colour: green for Cell, heat shades for its friends in group scenes. */
  color?: string;
  /** Which way the character faces, in radians (0 = towards +z). */
  rotationY?: number;
}) {
  const bob = pose === "sleep" ? Math.sin(t * 1.5) * 0.02 : Math.abs(Math.sin(t * 2.2)) * 0.08;
  const wave = pose === "wave" ? 0.75 + Math.sin(t * 8) * 0.15 : 0;
  const raise = pose === "cheer" || pose === "proud" ? 0.95 : pose === "think" ? 0.45 : 0;
  const tilt = pose === "think" ? 0.12 : Math.sin(t * 1.3) * 0.04;

  const limb = shade(color, 0.6);
  const browLift = pose === "cheer" || pose === "wave" ? 0.03 : pose === "sleep" ? -0.03 : 0;
  const browTilt = pose === "think" ? 0.25 : pose === "proud" ? -0.12 : 0;

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <group position={[0, 0.66 + bob, 0]} rotation={[0, Math.sin(t * 0.7) * 0.15, tilt]}>
        {/* A softer cube than before: a bigger corner radius reads as a squeezable toy. */}
        <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.27} smoothness={12} bevelSegments={12}>
          <Toon color={color} />
          <Ink width={0.045} />
        </RoundedBox>
        <Eye x={-0.21} closed={pose === "sleep"} squint={pose === "proud"} />
        <Eye x={0.21} closed={pose === "sleep"} squint={pose === "proud"} />
        <Brow x={-0.22} lift={browLift} tilt={browTilt} color={limb} />
        <Brow x={0.22} lift={browLift} tilt={-browTilt} color={limb} />
        {/* cheeks */}
        {[-0.37, 0.37].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.548]} scale={[1, 0.6, 0.25]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <Blush />
          </mesh>
        ))}
        {/* mouth */}
        {pose === "cheer" || pose === "proud" ? (
          <group position={[0, -0.14, 0.535]}>
            <mesh rotation={[0, 0, Math.PI]} scale={[1, 1.1, 0.45]}>
              <sphereGeometry args={[0.13, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <MouthPaint />
            </mesh>
            <mesh position={[0, -0.075, 0.035]} scale={[1, 0.5, 0.3]}>
              <sphereGeometry args={[0.065, 20, 20]} />
              <Toon color="#ff7d6e" />
            </mesh>
          </group>
        ) : pose === "think" || pose === "sleep" ? (
          <mesh position={[0, -0.16, 0.55]} scale={[1, 0.8, 0.4]}>
            <sphereGeometry args={[0.05, 20, 20]} />
            <MouthPaint />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0.56]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.11, 0.026, 12, 32, Math.PI]} />
            <MouthPaint />
          </mesh>
        )}
        <Arm side={-1} raise={raise} color={limb} />
        <Arm side={1} raise={Math.max(raise, wave)} color={limb} />
        {outfit && <Outfit id={outfit} t={t} />}
        <group position={[0, 0.56, 0]}>{hat}</group>
      </group>
      {/* Stubby legs into rounded shoes, so the body stands instead of hovering. */}
      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.085, 0.12, 8, 20]} />
            <Toon color={limb} />
          </mesh>
          <RoundedBox
            args={[0.3, 0.17, 0.4]}
            radius={0.08}
            smoothness={8}
            position={[0, 0.085, 0.06]}
          >
            <Toon color={outfit === "consistent" ? C.persimmon : C.ink} />
            <Ink width={0.025} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}
