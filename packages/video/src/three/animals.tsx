import { RoundedBox } from "@react-three/drei";
import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { HardHat } from "./outfits";
import { C } from "./palette";
import { Ink, Toon } from "./toon";

/*
 * One cartoon animal per archetype, Cell's sidekick in that archetype's illustration:
 * beaver (builder), ant (consistent), fox (explorer), bee (collaborator), owl (night owl) and
 * octopus (open sourcer). Same cel shading and ink outline as Cell. About one unit tall, standing
 * on y = 0 and facing +z. `t` drives the small idle motions.
 */

type Placement = {
  t?: number;
  position?: [number, number, number];
  scale?: number;
  rotationY?: number;
};

function Body({ position, scale, rotationY, children }: Placement & { children: ReactNode }) {
  return (
    <group position={position} scale={scale} rotation={[0, rotationY ?? 0, 0]}>
      {children}
    </group>
  );
}

function Blob({
  color,
  position,
  scale = [1, 1, 1],
  r = 0.5,
  ink = 0.03,
}: {
  color: string;
  position: [number, number, number];
  scale?: [number, number, number];
  r?: number;
  ink?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[r, 28, 28]} />
      <Toon color={color} />
      {ink > 0 && <Ink width={ink} />}
    </mesh>
  );
}

/** Big cartoon eyes on a face whose front is at `z`. */
function Eyes({
  y,
  z,
  gap = 0.14,
  size = 0.09,
}: {
  y: number;
  z: number;
  gap?: number;
  size?: number;
}) {
  return (
    <>
      {[-gap, gap].map((x) => (
        <group key={x} position={[x, y, z]}>
          <mesh scale={[1, 1.15, 0.5]}>
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, -size * 0.1, size * 0.4]} scale={[1, 1.15, 0.5]}>
            <sphereGeometry args={[size * 0.58, 14, 14]} />
            <meshBasicMaterial color={C.ink} />
          </mesh>
          <mesh position={[size * 0.25, size * 0.3, size * 0.7]}>
            <sphereGeometry args={[size * 0.2, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Feet({ color, x = 0.18, z = 0.08 }: { color: string; x?: number; z?: number }) {
  return (
    <>
      {[-x, x].map((fx) => (
        <Blob
          key={fx}
          color={color}
          position={[fx, 0.06, z]}
          scale={[1, 0.5, 1.3]}
          r={0.12}
          ink={0.02}
        />
      ))}
    </>
  );
}

export function Beaver({ t = 0, ...place }: Placement) {
  const wag = Math.sin(t * 3) * 0.15;
  return (
    <Body {...place}>
      <group rotation={[-0.35 + wag * 0.3, 0, 0]} position={[0, 0.2, -0.45]}>
        <RoundedBox args={[0.5, 0.08, 0.7]} radius={0.035} position={[0, 0, -0.3]}>
          <Toon color="#4B3424" />
          <Ink width={0.02} />
        </RoundedBox>
      </group>
      <Blob color="#8A5A3B" position={[0, 0.55, 0]} scale={[1, 1.15, 0.95]} r={0.42} />
      <Blob color="#C58F63" position={[0, 0.48, 0.2]} scale={[0.8, 0.9, 0.5]} r={0.32} ink={0} />
      <Blob color="#8A5A3B" position={[0, 1.18, 0.02]} r={0.32} />
      {[-0.24, 0.24].map((x) => (
        <Blob key={x} color="#6B4530" position={[x, 1.42, -0.02]} r={0.09} ink={0.02} />
      ))}
      <Blob
        color="#C58F63"
        position={[0, 1.09, 0.26]}
        scale={[1.2, 0.8, 0.7]}
        r={0.14}
        ink={0.02}
      />
      <mesh position={[0, 1.15, 0.36]}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshBasicMaterial color={C.ink} />
      </mesh>
      {[-0.035, 0.035].map((x) => (
        <mesh key={x} position={[x, 0.98, 0.33]}>
          <boxGeometry args={[0.06, 0.1, 0.03]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <Eyes y={1.27} z={0.27} gap={0.12} size={0.075} />
      <group position={[0, 1.42, 0]} scale={0.75}>
        <HardHat />
      </group>
      <Feet color="#4B3424" />
    </Body>
  );
}

export function Ant({ t = 0, ...place }: Placement) {
  const step = Math.sin(t * 6) * 0.25;
  const red = "#B23A2A";
  return (
    <Body {...place}>
      <Blob color={red} position={[0, 0.42, -0.38]} scale={[1, 0.9, 1.25]} r={0.3} />
      <Blob color={red} position={[0, 0.5, 0]} r={0.17} />
      <Blob color={red} position={[0, 0.82, 0.18]} r={0.27} />
      <Eyes y={0.88} z={0.4} gap={0.11} size={0.075} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.1, 1.12, 0.22]} rotation={[0.3, 0, side * -0.35]}>
            <cylinderGeometry args={[0.018, 0.018, 0.32, 6]} />
            <Toon color={C.ink} />
          </mesh>
          <Blob color={C.ink} position={[side * 0.17, 1.27, 0.28]} r={0.045} ink={0} />
          {[-0.15, 0, 0.15].map((z, i) => (
            <mesh
              key={z}
              position={[side * 0.22, 0.25, z]}
              rotation={[i === 1 ? step : -step, 0, side * 0.6]}
            >
              <cylinderGeometry args={[0.022, 0.022, 0.5, 6]} />
              <Toon color={C.ink} />
            </mesh>
          ))}
        </group>
      ))}
    </Body>
  );
}

export function Fox({ t = 0, ...place }: Placement) {
  const wag = Math.sin(t * 2.5) * 0.25;
  const orange = "#E8772E";
  return (
    <Body {...place}>
      <group position={[0, 0.45, -0.35]} rotation={[-0.9, wag, 0]}>
        <Blob color={orange} position={[0, 0.3, 0]} scale={[0.7, 1.4, 0.7]} r={0.25} />
        <Blob color="#FFFFFF" position={[0, 0.62, 0]} scale={[0.6, 0.7, 0.6]} r={0.16} ink={0.02} />
      </group>
      <Blob color={orange} position={[0, 0.5, 0]} scale={[0.95, 1.1, 0.95]} r={0.36} />
      <Blob color="#FFFFFF" position={[0, 0.48, 0.2]} scale={[0.75, 0.9, 0.5]} r={0.26} ink={0} />
      <Blob color={orange} position={[0, 1.08, 0.05]} r={0.33} />
      <mesh position={[0, 1.0, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.15, 0.3, 20]} />
        <Toon color="#FFFFFF" />
        <Ink width={0.02} />
      </mesh>
      <Blob color={C.ink} position={[0, 1.0, 0.52]} r={0.045} ink={0} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.2, 1.42, 0]} rotation={[0, 0, -side * 0.25]}>
          <coneGeometry args={[0.13, 0.32, 4]} />
          <Toon color={orange} />
          <Ink width={0.025} />
        </mesh>
      ))}
      <Eyes y={1.15} z={0.3} gap={0.13} size={0.075} />
      <Feet color={C.ink} />
    </Body>
  );
}

export function Bee({ t = 0, ...place }: Placement) {
  const flap = Math.sin(t * 30) * 0.5;
  const hover = Math.sin(t * 2) * 0.08;
  const yellow = "#F6C744";
  return (
    <Body {...place}>
      <group position={[0, 0.9 + hover, 0]}>
        <Blob color={yellow} position={[0, 0, -0.1]} scale={[0.95, 0.9, 1.25]} r={0.36} />
        {[-0.18, 0.06].map((z) => (
          <mesh
            key={z}
            position={[0, 0, z - 0.1]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[0.95, 1, 0.9]}
          >
            <cylinderGeometry args={[0.345, 0.345, 0.09, 28]} />
            <Toon color={C.ink} />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.07, 0.18, 10]} />
          <Toon color={C.ink} />
        </mesh>
        <Blob color={yellow} position={[0, 0.12, 0.32]} r={0.26} />
        <Eyes y={0.18} z={0.52} gap={0.1} size={0.07} />
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.3, 0.38, -0.1]}
              rotation={[0.2, 0, side * (0.5 + flap)]}
              scale={[1, 0.15, 0.7]}
            >
              <sphereGeometry args={[0.32, 18, 18]} />
              <meshToonMaterial color="#DDF3FF" transparent opacity={0.85} />
              <Ink width={0.02} />
            </mesh>
            <mesh position={[side * 0.1, 0.45, 0.4]} rotation={[0.5, 0, side * -0.3]}>
              <cylinderGeometry args={[0.015, 0.015, 0.25, 6]} />
              <Toon color={C.ink} />
            </mesh>
          </group>
        ))}
      </group>
    </Body>
  );
}

export function Owl({ t = 0, ...place }: Placement) {
  const blink = Math.sin(t * 1.3) > 0.97 ? 0.15 : 1;
  const plum = "#6E5A8C";
  return (
    <Body {...place}>
      <Blob color={plum} position={[0, 0.62, 0]} scale={[1, 1.2, 0.9]} r={0.48} />
      <Blob color="#D9C9E8" position={[0, 0.52, 0.22]} scale={[0.8, 0.9, 0.5]} r={0.34} ink={0} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Blob
            color="#4F3F6A"
            position={[side * 0.47, 0.6, -0.02]}
            scale={[0.35, 0.9, 0.7]}
            r={0.38}
            ink={0.025}
          />
          <mesh position={[side * 0.28, 1.18, 0]} rotation={[0, 0, -side * 0.4]}>
            <coneGeometry args={[0.1, 0.3, 4]} />
            <Toon color={plum} />
            <Ink width={0.02} />
          </mesh>
          {/* big round eyes with a yellow ring */}
          <group position={[side * 0.17, 0.88, 0.36]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.17, 0.17, 0.04, 28]} />
              <Toon color="#F2C14E" />
              <Ink width={0.02} />
            </mesh>
            <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, blink]}>
              <cylinderGeometry args={[0.13, 0.13, 0.02, 28]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 0, 0.05]} scale={[1, blink, 0.4]}>
              <sphereGeometry args={[0.075, 14, 14]} />
              <meshBasicMaterial color={C.ink} />
            </mesh>
          </group>
        </group>
      ))}
      <mesh position={[0, 0.74, 0.44]} rotation={[Math.PI / 2 + 0.4, 0, 0]}>
        <coneGeometry args={[0.06, 0.16, 4]} />
        <Toon color="#F2A23A" />
        <Ink width={0.015} />
      </mesh>
      <Feet color="#F2A23A" x={0.14} z={0.18} />
    </Body>
  );
}

export function Octopus({ t = 0, ...place }: Placement) {
  const pink = "#F07A9A";
  return (
    <Body {...place}>
      <Blob color={pink} position={[0, 0.95, -0.05]} scale={[1, 1.05, 1]} r={0.45} />
      <Eyes y={0.88} z={0.36} gap={0.15} size={0.09} />
      {[-0.32, 0.32].map((x) => (
        <Blob
          key={x}
          color="#ff8a7a"
          position={[x, 0.76, 0.33]}
          scale={[1, 0.5, 0.3]}
          r={0.07}
          ink={0}
        />
      ))}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        const curl = Math.sin(t * 2.4 + i) * 0.3;
        return (
          <group
            key={a}
            position={[Math.cos(a) * 0.32, 0.55, Math.sin(a) * 0.32]}
            rotation={[0, -a, 0]}
          >
            {[0, 1, 2].map((k) => (
              <Blob
                key={k}
                color={pink}
                position={[0.12 + k * 0.16, -0.18 - k * 0.12 + (k === 2 ? curl * 0.4 : 0), 0]}
                r={0.13 - k * 0.025}
                ink={0.02}
              />
            ))}
          </group>
        );
      })}
    </Body>
  );
}

const ANIMALS: Record<ArchetypeId, (props: Placement) => React.ReactNode> = {
  builder: Beaver,
  consistent: Ant,
  explorer: Fox,
  collaborator: Bee,
  "night-owl": Owl,
  "open-sourcer": Octopus,
};

/** The archetype's sidekick. */
export function Sidekick({ archetype, ...place }: Placement & { archetype: ArchetypeId }) {
  const Animal = ANIMALS[archetype];
  return <Animal {...place} />;
}
