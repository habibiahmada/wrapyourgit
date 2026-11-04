import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import { C, CellCharacter, HardHat } from "./CellCharacter";
import { ContributionCity, cityLevels, DriftingCells, Effects, Stage, StudioLights } from "./World";

/*
 * One diorama per archetype, built from the same pieces as the hero: Cell, contribution columns,
 * the flat stage and the studio rig. Each shows what the archetype does, not just a label.
 * `t` (seconds) drives all motion.
 */

/** Rotation that turns a character to face the default camera at (10, 7.5, 13). */
const FACE_CAMERA = Math.atan2(10, 13);

const glossy = (color: string) => (
  <meshPhysicalMaterial color={color} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.25} />
);

function Builder({ t }: { t: number }) {
  const lift = 2.6 + Math.sin(t * 1.2) * 0.25;
  return (
    <>
      <ContributionCity levels={cityLevels(6, "builder")} t={t} position={[-1.2, 0, -0.8]} />
      {/* crane: mast, boom, cable and the cell being placed */}
      <RoundedBox args={[0.22, 4.4, 0.22]} radius={0.04} position={[1.6, 2.2, -2.4]} castShadow>
        {glossy(C.persimmon)}
      </RoundedBox>
      <RoundedBox args={[3.6, 0.18, 0.18]} radius={0.04} position={[0, 4.3, -2.4]} castShadow>
        {glossy(C.persimmon)}
      </RoundedBox>
      <mesh position={[-1.2, (4.3 + lift) / 2, -2.4]}>
        <cylinderGeometry args={[0.02, 0.02, 4.3 - lift, 8]} />
        <meshStandardMaterial color={C.paper} />
      </mesh>
      <RoundedBox
        args={[0.5, 0.5, 0.5]}
        radius={0.07}
        position={[-1.2, lift - 0.25, -2.4]}
        castShadow
      >
        {glossy(C.green)}
      </RoundedBox>
      <CellCharacter pose="cheer" t={t} position={[2.2, 0, 1.8]} scale={1.1} hat={<HardHat />} />
    </>
  );
}

function Consistent({ t }: { t: number }) {
  // Seven steps, one per day of the week, climbing steadily.
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => {
        const h = 0.25 + i * 0.32;
        return (
          <RoundedBox
            // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed steps, index is the weekday
            key={i}
            args={[0.9, h, 1.4]}
            radius={0.06}
            position={[-3 + i * 0.95, h / 2, -0.6]}
            castShadow
            receiveShadow
          >
            {glossy(C.heat[Math.min(3, Math.floor(i / 2))] ?? C.green)}
          </RoundedBox>
        );
      })}
      <CellCharacter
        pose="proud"
        t={t}
        position={[1.75, 1.85, -0.6]}
        scale={0.8}
        rotationY={FACE_CAMERA}
      />
      <CellCharacter
        pose="cheer"
        t={t + 1}
        position={[-2.2, 0, 2]}
        scale={0.7}
        color={C.heat[0]}
        rotationY={FACE_CAMERA}
      />
    </>
  );
}

function Explorer({ t }: { t: number }) {
  const islands: [number, number, number, number][] = [
    [-2.6, 0.9, -1.8, 0.9],
    [0.2, 1.6, -3, 1.1],
    [2.8, 0.6, -1.4, 0.8],
  ];
  return (
    <>
      {islands.map(([x, y, z, r], i) => (
        <group key={`${x}`} position={[x, y + Math.sin(t * 1.1 + i) * 0.12, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[r, r * 0.55, 0.45, 40]} />
            {glossy(C.cobalt)}
          </mesh>
          <ContributionCity levels={cityLevels(2, `island-${i}`)} t={t} position={[0, 0.35, 0]} />
        </group>
      ))}
      {/* a flag on the farthest island */}
      <mesh position={[0.2, 3.2, -3]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshStandardMaterial color={C.paper} />
      </mesh>
      <mesh position={[0.45, 3.6, -3]}>
        <boxGeometry args={[0.5, 0.3, 0.02]} />
        <meshStandardMaterial color={C.persimmon} />
      </mesh>
      <group>
        <CellCharacter pose="think" t={t} position={[1.4, 0, 2]} scale={1.1} rotationY={0.2} />
        {/* telescope */}
        <mesh position={[1.05, 1.25, 1.6]} rotation={[0.9, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.14, 1, 20]} />
          {glossy(C.persimmon)}
        </mesh>
      </group>
    </>
  );
}

function Collaborator({ t }: { t: number }) {
  // A block passed back and forth between two friends.
  const phase = (Math.sin(t * 1.6) + 1) / 2;
  const bx = -1 + phase * 2;
  const by = 1.9 + Math.sin(phase * Math.PI) * 0.7;
  return (
    <>
      <ContributionCity levels={cityLevels(8, "collab")} t={t} position={[0, 0, -2.2]} />
      <CellCharacter pose="cheer" t={t} position={[-1.6, 0, 1.4]} rotationY={0.7} />
      <CellCharacter
        pose="cheer"
        t={t + 0.6}
        position={[1.6, 0, 1.4]}
        rotationY={-0.7}
        color={C.heat[0]}
      />
      <RoundedBox
        args={[0.45, 0.45, 0.45]}
        radius={0.07}
        position={[bx, by, 1.4]}
        rotation={[t, t * 0.7, 0]}
        castShadow
      >
        {glossy(C.persimmon)}
      </RoundedBox>
    </>
  );
}

function NightOwl({ t }: { t: number }) {
  return (
    <>
      {/* moon and a few stars: emissive, so bloom makes them glow (they are the light source) */}
      <mesh position={[-3.6, 4.1, -5]}>
        <sphereGeometry args={[0.9, 40, 40]} />
        <meshStandardMaterial color={C.paper} emissive={C.paper} emissiveIntensity={1.1} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed star field, index is the star
        <mesh key={i} position={[-5 + i * 1.2, 4 + ((i * 37) % 10) / 6, -6]}>
          <boxGeometry args={[0.06, 0.06, 0.06]} />
          <meshStandardMaterial
            color={C.paper}
            emissive={C.paper}
            emissiveIntensity={2 + Math.sin(t * 3 + i)}
          />
        </mesh>
      ))}
      {/* desk with a laptop and lamp */}
      <RoundedBox
        args={[2.6, 0.12, 1.3]}
        radius={0.04}
        position={[0, 0.85, 0]}
        castShadow
        receiveShadow
      >
        {glossy("#3a3d4c")}
      </RoundedBox>
      {[-1.15, 1.15].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} castShadow>
          <boxGeometry args={[0.1, 0.84, 1.1]} />
          <meshStandardMaterial color="#3a3d4c" />
        </mesh>
      ))}
      {/* Thin parts are plain boxes: a RoundedBox whose radius reaches half its thickness
          degenerates (NaN normals) and silently stops the whole scene rendering. */}
      <mesh position={[0.2, 0.93, 0.1]} castShadow>
        <boxGeometry args={[0.9, 0.04, 0.6]} />
        {glossy("#c9cbd4")}
      </mesh>
      <mesh position={[0.2, 1.22, -0.18]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.9, 0.56, 0.03]} />
        <meshStandardMaterial color={C.cobalt} emissive={C.cobalt} emissiveIntensity={1.3} />
      </mesh>
      <mesh position={[-0.9, 1.35, -0.2]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.22, 0.3, 24, 1, true]} />
        <meshStandardMaterial color={C.persimmon} side={2} />
      </mesh>
      <pointLight position={[-0.8, 1.2, 0]} intensity={6} distance={4} color="#ffd9a8" />
      <CellCharacter
        pose="think"
        t={t}
        position={[0.2, 0, 1.3]}
        scale={0.95}
        rotationY={FACE_CAMERA}
      />
    </>
  );
}

function OpenSourcer({ t }: { t: number }) {
  const friends: [number, number, number][] = [
    [-2.4, 0, 0.6],
    [0, 0, -1.8],
    [2.4, 0, 0.6],
  ];
  return (
    <>
      <CellCharacter pose="cheer" t={t} position={[0, 0, 1.4]} scale={1.15} />
      {friends.map(([x, y, z], i) => {
        // Each friend receives a block flying out from Cell, staggered.
        const p = (t * 0.5 + i / 3) % 1;
        return (
          <group key={x}>
            <CellCharacter
              pose="wave"
              t={t + i}
              position={[x, y, z]}
              scale={0.65}
              color={C.heat[i % 2 === 0 ? 0 : 2]}
              rotationY={Math.atan2(-x, 1.4 - z)}
            />
            <RoundedBox
              args={[0.32, 0.32, 0.32]}
              radius={0.05}
              position={[x * p, 1.6 + Math.sin(p * Math.PI) * 1.2, 1.4 + (z - 1.4) * p]}
              rotation={[t * 2, t, 0]}
              castShadow
            >
              {glossy(C.persimmon)}
            </RoundedBox>
          </group>
        );
      })}
    </>
  );
}

const SCENES: Record<ArchetypeId, (props: { t: number }) => React.ReactNode> = {
  builder: Builder,
  consistent: Consistent,
  explorer: Explorer,
  collaborator: Collaborator,
  "night-owl": NightOwl,
  "open-sourcer": OpenSourcer,
};

/** Only the archetype's props and characters, without stage, lights or backdrop (for cutouts). */
export function ArchetypeProps({ archetype, t = 0 }: { archetype: ArchetypeId; t?: number }) {
  const Scene = SCENES[archetype];
  return <Scene t={t} />;
}

/** The archetype's diorama on the shared stage. */
export function ArchetypeDiorama({
  archetype,
  t = 0,
  effects = true,
}: {
  archetype: ArchetypeId;
  t?: number;
  effects?: boolean;
}) {
  const Scene = SCENES[archetype];
  return (
    <>
      <StudioLights />
      <DriftingCells t={t} count={24} />
      <Stage radius={5.2} />
      <Scene t={t} />
      {effects && <Effects />}
    </>
  );
}
