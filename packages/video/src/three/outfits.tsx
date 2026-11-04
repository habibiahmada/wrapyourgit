import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import { C } from "./palette";
import { Gloss, Ink, Toon } from "./toon";

/*
 * Cell's costume for each archetype, so the archetype reads at a glance even as a small sticker.
 * Coordinates are relative to Cell's body: a 1.1 cube centred on the origin, face towards +z.
 */

/** A hard hat: dome, brim and a stripe. Builder outfit, and the beaver's hat. */
export function HardHat() {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh>
        <sphereGeometry args={[0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Toon color="#F5B92E" />
        <Ink width={0.03} />
      </mesh>
      <mesh position={[0, 0.005, 0.12]} scale={[1, 1, 1.25]}>
        <cylinderGeometry args={[0.44, 0.44, 0.05, 40]} />
        <Toon color="#F5B92E" />
        <Ink width={0.025} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.035, 8, 40]} />
        <Toon color={C.paper} />
      </mesh>
    </group>
  );
}

function Builder() {
  return (
    <>
      <group position={[0, 0.56, 0]}>
        <HardHat />
      </group>
      {/* tool belt with a buckle and a hammer tucked in */}
      <RoundedBox args={[1.18, 0.16, 1.18]} radius={0.05} position={[0, -0.36, 0]}>
        <Toon color="#7A4A2A" />
        <Ink width={0.025} />
      </RoundedBox>
      <mesh position={[0, -0.36, 0.6]}>
        <boxGeometry args={[0.2, 0.14, 0.04]} />
        <Toon color="#F5B92E" />
      </mesh>
      <group position={[0.5, -0.45, 0.45]} rotation={[0, 0, 0.3]}>
        <mesh>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 10]} />
          <Toon color="#B8794A" />
          <Ink width={0.02} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.22, 0.09, 0.09]} />
          <Toon color="#9AA0AE" />
          <Ink width={0.02} />
        </mesh>
      </group>
    </>
  );
}

function Consistent() {
  return (
    <>
      {/* sweatband and a gold medal: the one who shows up every day */}
      <RoundedBox args={[1.16, 0.16, 1.16]} radius={0.05} position={[0, 0.34, 0]}>
        <Toon color={C.persimmon} />
        <Ink width={0.025} />
      </RoundedBox>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x * 0.6, -0.08, 0.565]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]}>
          <boxGeometry args={[0.1, 0.36, 0.02]} />
          <Toon color={C.cobalt} />
        </mesh>
      ))}
      <mesh position={[0, -0.3, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        <Toon color="#F2C14E" emissive="#F2C14E" />
        <Ink width={0.02} />
      </mesh>
    </>
  );
}

function Explorer() {
  return (
    <>
      {/* safari hat */}
      <group position={[0, 0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.62, 0.62, 0.05, 40]} />
          <Toon color="#C9A66B" />
          <Ink width={0.025} />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.3, 0.36, 0.32, 32]} />
          <Toon color="#C9A66B" />
          <Ink width={0.025} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.365, 0.365, 0.08, 32]} />
          <Toon color="#6B4A2B" />
        </mesh>
      </group>
      {/* backpack with a rolled map */}
      <RoundedBox args={[0.82, 0.86, 0.4]} radius={0.1} position={[0, -0.02, -0.72]}>
        <Toon color={C.persimmon} />
        <Ink width={0.03} />
      </RoundedBox>
      <mesh position={[0, 0.5, -0.72]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.9, 16]} />
        <Toon color={C.paper} />
        <Ink width={0.02} />
      </mesh>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.05, 0.56]}>
          <boxGeometry args={[0.09, 1, 0.03]} />
          <Toon color="#7A3A1F" />
        </mesh>
      ))}
    </>
  );
}

function Collaborator() {
  return (
    <>
      {/* headset: band, ear cups and a mic, for pairing and reviews */}
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.66, 0.05, 10, 40, Math.PI]} />
        <Toon color={C.ink} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.62, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 24]} />
          <Toon color={C.cobalt} />
          <Ink width={0.025} />
        </mesh>
      ))}
      <mesh position={[-0.55, -0.02, 0.32]} rotation={[0.9, 0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.6, 8]} />
        <Toon color={C.ink} />
      </mesh>
      <mesh position={[-0.36, -0.16, 0.6]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <Toon color={C.persimmon} />
        <Ink width={0.02} />
      </mesh>
    </>
  );
}

function NightOwl() {
  return (
    <>
      {/* hood with owl tufts, and round glasses */}
      <RoundedBox args={[1.26, 0.5, 1.26]} radius={0.18} position={[0, 0.4, -0.04]}>
        <Toon color="#3B3F8F" />
        <Ink width={0.035} />
      </RoundedBox>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.42, 0.82, 0]} rotation={[0, 0, -side * 0.35]}>
          <coneGeometry args={[0.14, 0.38, 4]} />
          <Toon color="#3B3F8F" />
          <Ink width={0.025} />
        </mesh>
      ))}
      {[-0.21, 0.21].map((x) => (
        <mesh key={x} position={[x, 0.12, 0.6]}>
          <torusGeometry args={[0.16, 0.025, 16, 48]} />
          <Gloss color="#1b1b1f" />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0.6]}>
        <boxGeometry args={[0.1, 0.025, 0.02]} />
        <Gloss color="#1b1b1f" />
      </mesh>
    </>
  );
}

function OpenSourcer({ t }: { t: number }) {
  return (
    <group position={[0, 0.55, 0]}>
      {/* propeller beanie: the classic hacker hat */}
      <mesh>
        <sphereGeometry args={[0.44, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Toon color={C.persimmon} />
        <Ink width={0.03} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.33, 0.04, 8, 32]} />
        <Toon color="#F5B92E" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 8]} />
        <Toon color={C.ink} />
      </mesh>
      <group position={[0, 0.58, 0]} rotation={[0, t * 9, 0]}>
        {[0, Math.PI].map((r) => (
          <mesh key={r} rotation={[0.25, r, 0]} position={[Math.cos(r) * 0.22, 0, 0]}>
            <boxGeometry args={[0.42, 0.02, 0.12]} />
            <Toon color={r === 0 ? C.cobalt : "#F5B92E"} />
            <Ink width={0.015} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Outfit({ id, t }: { id: ArchetypeId; t: number }) {
  switch (id) {
    case "builder":
      return <Builder />;
    case "consistent":
      return <Consistent />;
    case "explorer":
      return <Explorer />;
    case "collaborator":
      return <Collaborator />;
    case "night-owl":
      return <NightOwl />;
    case "open-sourcer":
      return <OpenSourcer t={t} />;
  }
}
