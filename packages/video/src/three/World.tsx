export { Effects } from "./Effects";

import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { random } from "remotion";
import { C } from "./CellCharacter";

/*
 * The world around Cell: a contribution graph built as a small city of lit columns, a studio
 * light rig, and drifting cells for depth, on a solid ink background (no gradient backdrop). Everything is seeded and driven by
 * `t`, so the same scene renders the same way on the web and in video.
 */

/** Column heights for a weeks × 7 patch. Pass real levels (0-4) or get a seeded default. */
export function cityLevels(weeks: number, seed = "city"): number[][] {
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const r = random(`${seed}-${w}-${d}`);
      return r < 0.18 ? 0 : 1 + Math.floor(r * 4) - (r > 0.95 ? 0 : 0);
    }),
  );
}

export function ContributionCity({
  levels,
  t = 0,
  grow = 1,
  position = [0, 0, 0],
}: {
  levels: number[][];
  t?: number;
  /** 0..1: columns rise in order from the back, for build-in moments. */
  grow?: number;
  position?: [number, number, number];
}) {
  const pitch = 0.62;
  const weeks = levels.length;
  return (
    <group position={position}>
      {/* plinth */}
      <RoundedBox
        args={[weeks * pitch + 0.5, 0.24, 7 * pitch + 0.5]}
        radius={0.08}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={C.cobalt} roughness={0.55} metalness={0.1} />
      </RoundedBox>
      {levels.flatMap((week, w) =>
        week.map((level, d) => {
          const order = (w + d) / (weeks + 7);
          const rise = Math.min(1, Math.max(0, (grow - order * 0.6) / 0.4));
          const h = (level === 0 ? 0.05 : 0.12 + level * 0.26) * rise + 0.02;
          const shimmer = level === 4 ? Math.sin(t * 2 + w + d) * 0.03 : 0;
          return (
            <RoundedBox
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid, week and day are the cell's position
              key={`${w}-${d}`}
              args={[pitch * 0.82, h + shimmer, pitch * 0.82]}
              radius={0.05}
              smoothness={3}
              position={[(w - (weeks - 1) / 2) * pitch, (h + shimmer) / 2, (d - 3) * pitch]}
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color={level === 0 ? "#2a2c36" : (C.heat[level - 1] ?? C.green)}
                roughness={0.35}
                clearcoat={level === 0 ? 0 : 0.5}
                emissive={level === 4 ? C.heat[1] : "#000000"}
                emissiveIntensity={level === 4 ? 0.18 : 0}
              />
            </RoundedBox>
          );
        }),
      )}
    </group>
  );
}

/** Seeded cells drifting in the dark far behind the stage, for depth. */
export function DriftingCells({ t = 0, count = 40 }: { t?: number; count?: number }) {
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const x = (random(`dx-${i}`) - 0.5) * 22;
        const y = random(`dy-${i}`) * 7 + 1.2;
        const z = -3.5 - random(`dz-${i}`) * 7;
        const size = 0.12 + random(`ds-${i}`) * 0.35;
        const drift = Math.sin(t * 0.3 + i) * 0.4;
        const color = [C.heat[1], C.heat[2], C.cobalt, C.paper][i % 4] ?? C.green;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: seeded particles, index is the seed
          <mesh key={i} position={[x, y + drift, z]} rotation={[t * 0.2 + i, t * 0.15 + i * 2, 0]}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial color={color} roughness={0.4} transparent opacity={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Studio rig: warm key from the front left (casts shadows), cobalt rim from behind, persimmon
 * kicker from the right, and a procedural environment for reflections (no HDR download).
 */
export function StudioLights() {
  return (
    <>
      <color attach="background" args={[C.ink]} />
      <fog attach="fog" args={[C.ink, 18, 40]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[-6, 9, 7]}
        intensity={2.4}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[0, 5, -7]} intensity={60} color={C.cobalt} distance={20} />
      <pointLight position={[7, 2, 3]} intensity={18} color={C.persimmon} distance={14} />
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 6, 6]}
          scale={[10, 4, 1]}
          color="#fff3e2"
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          position={[-8, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[6, 4, 1]}
          color={C.cobalt}
        />
        <Lightformer
          form="ring"
          intensity={1}
          position={[6, 3, -4]}
          scale={3}
          color={C.persimmon}
        />
      </Environment>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={14} blur={2.2} far={6} />
    </>
  );
}

/**
 * A round stage under the diorama. Flat and solid (DESIGN.md: fields are flat); contact shadows
 * still ground the objects on it, and the spotlight lights the objects, not the floor.
 */
export function Stage({ radius = 6.2 }: { radius?: number }) {
  return (
    <group>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.25, 0.3, 96]} />
        {/* Unlit on purpose: one flat colour, so coloured lights never smear gradients over it. */}
        <meshBasicMaterial color="#262935" />
      </mesh>
      {/* a thin lit rim around the stage edge */}
      <mesh position={[0, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius - 0.02, 0.025, 8, 160]} />
        <meshStandardMaterial color={C.heat[1]} emissive={C.heat[1]} emissiveIntensity={1.4} />
      </mesh>
      <spotLight
        position={[0, 12, 3]}
        angle={0.42}
        penumbra={0.85}
        intensity={140}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </group>
  );
}

/**
 * Lights only, no background, fog or stage: for transparent cutouts that sit on top of 2D
 * layouts (peeking from an edge, silhouettes behind text).
 */
export function CutoutLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-6, 9, 7]} intensity={2.6} color="#fff3e2" />
      <pointLight position={[0, 5, -7]} intensity={60} color={C.cobalt} distance={20} />
      <pointLight position={[7, 2, 3]} intensity={18} color={C.persimmon} distance={14} />
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 6, 6]}
          scale={[10, 4, 1]}
          color="#fff3e2"
        />
        <Lightformer
          form="rect"
          intensity={1.5}
          position={[-8, 2, 0]}
          rotation-y={Math.PI / 2}
          scale={[6, 4, 1]}
          color={C.cobalt}
        />
      </Environment>
    </>
  );
}
