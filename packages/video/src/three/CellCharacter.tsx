import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { Outfit } from "./outfits";

export { HardHat } from "./outfits";

import { C } from "./palette";
import { Ink, Toon } from "./toon";

/*
 * Cell in 3D: a rounded contribution cell with a sculpted face, drawn as a cartoon (cel shading
 * and an ink outline, see toon.tsx). No textures, so it stays crisp at any size and renders the
 * same in the browser and in Remotion. All motion comes from `t` (seconds), which the caller
 * drives: the render clock on the web, the frame in video.
 */

export { C };

export type Pose = "idle" | "wave" | "cheer" | "proud" | "think" | "sleep";

function Arm({ side, raise }: { side: 1 | -1; raise: number }) {
  // raise: 0 hanging, 1 straight up.
  const angle = side * (0.35 + raise * 2.4);
  return (
    <group position={[side * 0.62, 0.05, 0]} rotation={[0, 0, angle]}>
      <mesh position={[0, -0.28, 0]}>
        <capsuleGeometry args={[0.08, 0.36, 6, 12]} />
        <Toon color={C.ink} />
      </mesh>
      <mesh position={[0, -0.53, 0]}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <Toon color={C.paper} />
        <Ink width={0.03} />
      </mesh>
    </group>
  );
}

function Eye({ x, closed, squint }: { x: number; closed: boolean; squint: boolean }) {
  if (closed) {
    return (
      <mesh position={[x, 0.1, 0.56]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.09, 0.03, 8, 24, Math.PI]} />
        <meshBasicMaterial color={C.ink} />
      </mesh>
    );
  }
  return (
    <group position={[x, 0.12, 0.555]}>
      {/* Big cartoon eyes: a white, an ink pupil and a highlight. */}
      {!squint && (
        <mesh scale={[1, 1.2, 0.35]}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      <mesh position={[0.01, -0.01, 0.04]} scale={[1, squint ? 0.4 : 1.15, 0.5]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={C.ink} />
      </mesh>
      {!squint && (
        <mesh position={[0.035, 0.04, 0.09]}>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
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

  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <group position={[0, 0.62 + bob, 0]} rotation={[0, Math.sin(t * 0.7) * 0.15, tilt]}>
        <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.2} smoothness={6}>
          <Toon color={color} />
          <Ink width={0.045} />
        </RoundedBox>
        <Eye x={-0.21} closed={pose === "sleep"} squint={pose === "proud"} />
        <Eye x={0.21} closed={pose === "sleep"} squint={pose === "proud"} />
        {/* cheeks */}
        {[-0.38, 0.38].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.555]} scale={[1, 0.55, 0.3]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#ff8a7a" />
          </mesh>
        ))}
        {/* mouth */}
        {pose === "cheer" || pose === "proud" ? (
          <group position={[0, -0.15, 0.55]}>
            <mesh rotation={[0, 0, Math.PI]} scale={[1, 1.15, 0.4]}>
              <sphereGeometry args={[0.12, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshBasicMaterial color={C.ink} />
            </mesh>
            <mesh position={[0, -0.07, 0.02]} scale={[1, 0.5, 0.3]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshBasicMaterial color="#ff8a7a" />
            </mesh>
          </group>
        ) : pose === "think" || pose === "sleep" ? (
          <mesh position={[0, -0.16, 0.56]} scale={[1, 0.8, 0.4]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={C.ink} />
          </mesh>
        ) : (
          <mesh position={[0, -0.1, 0.555]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.12, 0.028, 8, 24, Math.PI]} />
            <meshBasicMaterial color={C.ink} />
          </mesh>
        )}
        <Arm side={-1} raise={raise} />
        <Arm side={1} raise={Math.max(raise, wave)} />
        {outfit && <Outfit id={outfit} t={t} />}
        <group position={[0, 0.56, 0]}>{hat}</group>
      </group>
      {/* feet */}
      {[-0.25, 0.25].map((x) => (
        <RoundedBox key={x} args={[0.3, 0.16, 0.38]} radius={0.06} position={[x, 0.08, 0.05]}>
          <Toon color={outfit === "consistent" ? C.persimmon : C.ink} />
          <Ink width={0.025} />
        </RoundedBox>
      ))}
    </group>
  );
}
