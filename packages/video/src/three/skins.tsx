import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import { Sidekick } from "./animals";
import { CellCharacter, type Pose } from "./CellCharacter";
import { C } from "./palette";
import { ContributionCity, cityLevels, DriftingCells } from "./World";

/*
 * Character-first illustrations: Cell in the archetype's costume with its animal sidekick and one
 * or two props from the archetype's world, framed close so they read big on a page or a slide.
 * The characters are cartoons (toon.tsx); the props stay glossy 3D. Transparent background, no
 * stage, so 2D layouts can place them freely. Also the hero, without the stage the dioramas use.
 */

const glossy = (color: string, emissive?: string) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.3}
    clearcoat={0.7}
    clearcoatRoughness={0.25}
    emissive={emissive ?? "#000000"}
    emissiveIntensity={emissive ? 1.2 : 0}
  />
);

function Block({
  position,
  size = 0.42,
  color = C.green,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  size?: number;
  color?: string;
  rotation?: [number, number, number];
}) {
  return (
    <RoundedBox
      args={[size, size, size]}
      radius={size * 0.15}
      position={position}
      rotation={rotation}
    >
      {glossy(color)}
    </RoundedBox>
  );
}

const POSE: Record<ArchetypeId, Pose> = {
  builder: "cheer",
  consistent: "proud",
  explorer: "think",
  collaborator: "cheer",
  "night-owl": "think",
  "open-sourcer": "wave",
};

function WorldProps({ archetype, t }: { archetype: ArchetypeId; t: number }) {
  switch (archetype) {
    case "builder":
      return (
        <>
          <ContributionCity
            levels={cityLevels(4, "skin-builder")}
            t={t}
            position={[-0.4, 0, -2.2]}
            plinth={false}
          />
          <Block
            position={[0.9, 2.6 + Math.sin(t * 1.4) * 0.15, -1.2]}
            rotation={[0.3, t * 0.6, 0.2]}
          />
        </>
      );
    case "consistent":
      return (
        <>
          {Array.from({ length: 7 }, (_, i) => {
            const h = 0.2 + i * 0.26;
            return (
              <RoundedBox
                // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed steps, index is the weekday
                key={i}
                args={[0.55, h, 0.8]}
                radius={0.05}
                position={[-2 + i * 0.6, h / 2, -1.8]}
              >
                {glossy(C.heat[Math.min(3, Math.floor(i / 2))] ?? C.green)}
              </RoundedBox>
            );
          })}
        </>
      );
    case "explorer":
      return (
        <group position={[-0.9, 1.2 + Math.sin(t * 1.1) * 0.12, -3.2]} scale={0.8}>
          <mesh>
            <cylinderGeometry args={[1, 0.55, 0.45, 40]} />
            {glossy(C.cobalt)}
          </mesh>
          <ContributionCity levels={cityLevels(2, "skin-island")} t={t} position={[0, 0.3, 0]} />
          <mesh position={[0.6, 0.9, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color={C.paper} />
          </mesh>
          <mesh position={[0.85, 1.3, 0]}>
            <boxGeometry args={[0.5, 0.3, 0.02]} />
            {glossy(C.persimmon)}
          </mesh>
        </group>
      );
    case "collaborator": {
      const p = (Math.sin(t * 1.6) + 1) / 2;
      return (
        <>
          <ContributionCity
            levels={cityLevels(5, "skin-collab")}
            t={t}
            position={[0, 0, -2.4]}
            plinth={false}
          />
          <Block
            position={[-0.7 + p * 1.6, 1.9 + Math.sin(p * Math.PI) * 0.6, 0.2]}
            color={C.persimmon}
            rotation={[t, t * 0.7, 0]}
          />
        </>
      );
    }
    case "night-owl":
      return (
        <>
          <mesh position={[-2.4, 2.6, -3.4]}>
            <sphereGeometry args={[0.7, 40, 40]} />
            <meshStandardMaterial color={C.paper} emissive={C.paper} emissiveIntensity={1.1} />
          </mesh>
          <RoundedBox args={[1.6, 0.1, 0.9]} radius={0.03} position={[0.2, 0.7, -0.9]}>
            {glossy("#3a3d4c")}
          </RoundedBox>
          {[-0.65, 0.65].map((x) => (
            <mesh key={x} position={[0.2 + x, 0.35, -0.9]}>
              <boxGeometry args={[0.08, 0.7, 0.8]} />
              <meshStandardMaterial color="#3a3d4c" />
            </mesh>
          ))}
          <mesh position={[0.2, 0.77, -0.85]}>
            <boxGeometry args={[0.8, 0.03, 0.5]} />
            {glossy("#c9cbd4")}
          </mesh>
          <mesh position={[0.2, 1.02, -1.08]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.8, 0.5, 0.03]} />
            <meshStandardMaterial color={C.cobalt} emissive={C.cobalt} emissiveIntensity={1.3} />
          </mesh>
        </>
      );
    case "open-sourcer":
      return (
        <>
          {[0, 1, 2, 3].map((i) => {
            const a = t * 0.9 + (i / 4) * Math.PI * 2;
            return (
              <Block
                key={i}
                size={0.3}
                color={i % 2 ? C.persimmon : C.green}
                position={[
                  0.3 + Math.cos(a) * 1.6,
                  1.6 + Math.sin(a * 2) * 0.3,
                  -0.4 + Math.sin(a) * 0.9,
                ]}
                rotation={[a, a * 0.5, 0]}
              />
            );
          })}
        </>
      );
  }
}

/** Cell in costume, the sidekick and the archetype's props. */
export function ArchetypeSkin({ archetype, t = 0 }: { archetype: ArchetypeId; t?: number }) {
  return (
    <>
      <DriftingCells t={t} count={14} />
      <WorldProps archetype={archetype} t={t} />
      <CellCharacter
        pose={POSE[archetype]}
        t={t}
        outfit={archetype}
        position={[-0.75, 0, 0.3]}
        scale={1.35}
        rotationY={0.35}
      />
      <Sidekick
        archetype={archetype}
        t={t}
        position={[1.25, 0, 0.6]}
        scale={1.15}
        rotationY={-0.25}
      />
    </>
  );
}

/** The landing hero: Cell the builder with friends in front of a contribution city, no stage. */
export function HeroCast({ t = 0 }: { t?: number }) {
  return (
    <>
      <DriftingCells t={t} count={30} />
      <ContributionCity levels={cityLevels(9)} t={t} position={[-0.6, 0, -1.6]} plinth={false} />
      <CellCharacter
        pose="wave"
        t={t}
        outfit="builder"
        position={[1.6, 0, 2.2]}
        scale={1.6}
        rotationY={-0.2}
      />
      <Sidekick archetype="builder" t={t} position={[-1.6, 0, 2.6]} scale={1.2} rotationY={0.4} />
      <Sidekick archetype="night-owl" t={t} position={[3.6, 0, 0.4]} scale={1} rotationY={-0.5} />
      <Sidekick
        archetype="collaborator"
        t={t}
        position={[-0.2, 1.4, 3.2]}
        scale={0.9}
        rotationY={0.2}
      />
    </>
  );
}
