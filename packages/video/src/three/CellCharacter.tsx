import { RoundedBox } from "@react-three/drei";
import type { ReactNode } from "react";

/*
 * Cell in 3D: a rounded contribution cell with a sculpted face (no textures, so it stays crisp at
 * any resolution and renders identically in the browser and in Remotion). All motion comes from
 * `t` (seconds), which the caller drives: the render clock on the web, the frame in video.
 */

export const C = {
  ink: "#14130F",
  paper: "#F4EFE3",
  persimmon: "#E4572E",
  cobalt: "#2B39C8",
  green: "#39D353",
  heat: ["#9BE9A8", "#40C463", "#30A14E", "#216E39"],
} as const;

export type Pose = "idle" | "wave" | "cheer" | "proud" | "think" | "sleep";

function Arm({ side, raise }: { side: 1 | -1; raise: number }) {
  // raise: 0 hanging, 1 straight up.
  const angle = side * (0.35 + raise * 2.4);
  return (
    <group position={[side * 0.62, 0.05, 0]} rotation={[0, 0, angle]}>
      <mesh position={[0, -0.28, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.36, 6, 12]} />
        <meshStandardMaterial color={C.ink} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.52, 0]} castShadow>
        <sphereGeometry args={[0.11, 20, 20]} />
        <meshStandardMaterial color={C.ink} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Eye({ x, closed, squint }: { x: number; closed: boolean; squint: boolean }) {
  if (closed) {
    return (
      <mesh position={[x, 0.1, 0.56]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.09, 0.025, 8, 24, Math.PI]} />
        <meshStandardMaterial color={C.ink} />
      </mesh>
    );
  }
  return (
    <group position={[x, 0.12, 0.54]}>
      <mesh scale={[1, squint ? 0.45 : 1, 0.6]}>
        <capsuleGeometry args={[0.07, 0.1, 8, 16]} />
        <meshStandardMaterial color={C.ink} roughness={0.25} />
      </mesh>
      {!squint && (
        <mesh position={[0.025, 0.05, 0.05]}>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshBasicMaterial color={C.paper} />
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
  color = C.green,
  rotationY = 0,
}: {
  pose?: Pose;
  t?: number;
  position?: [number, number, number];
  scale?: number;
  /** Optional prop on the head, e.g. a hard hat for the builder. */
  hat?: ReactNode;
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
        {/* body: a lacquered contribution cell */}
        <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.18} smoothness={6} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={color}
            roughness={0.32}
            clearcoat={0.8}
            clearcoatRoughness={0.25}
          />
        </RoundedBox>
        <Eye x={-0.2} closed={pose === "sleep"} squint={pose === "proud"} />
        <Eye x={0.2} closed={pose === "sleep"} squint={pose === "proud"} />
        {/* cheeks */}
        {[-0.36, 0.36].map((x) => (
          <mesh key={x} position={[x, -0.08, 0.555]} scale={[1, 0.55, 0.3]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshStandardMaterial color={C.persimmon} roughness={0.6} />
          </mesh>
        ))}
        {/* mouth */}
        {pose === "cheer" || pose === "proud" ? (
          <mesh position={[0, -0.13, 0.55]} rotation={[0, 0, Math.PI]} scale={[1, 1.1, 0.4]}>
            <sphereGeometry args={[0.1, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
        ) : pose === "think" || pose === "sleep" ? (
          <mesh position={[0, -0.14, 0.56]} scale={[1, 0.8, 0.4]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
        ) : (
          <mesh position={[0, -0.08, 0.555]} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.11, 0.024, 8, 24, Math.PI]} />
            <meshStandardMaterial color={C.ink} />
          </mesh>
        )}
        <Arm side={-1} raise={raise} />
        <group rotation={[0, 0, 0]}>
          <Arm side={1} raise={Math.max(raise, wave)} />
        </group>
        <group position={[0, 0.56, 0]}>{hat}</group>
      </group>
      {/* feet */}
      {[-0.24, 0.24].map((x) => (
        <RoundedBox
          key={x}
          args={[0.26, 0.14, 0.34]}
          radius={0.06}
          position={[x, 0.07, 0.05]}
          castShadow
        >
          <meshStandardMaterial color={C.ink} roughness={0.5} />
        </RoundedBox>
      ))}
    </group>
  );
}

/** A hard hat for the builder: dome, brim and a stripe. */
export function HardHat() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color={C.persimmon} roughness={0.35} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 0.005, 0.12]} scale={[1, 1, 1.25]} castShadow>
        <cylinderGeometry args={[0.44, 0.44, 0.04, 40]} />
        <meshPhysicalMaterial color={C.persimmon} roughness={0.35} clearcoat={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.03, 8, 40]} />
        <meshStandardMaterial color={C.paper} />
      </mesh>
    </group>
  );
}
