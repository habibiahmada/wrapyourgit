import { RoundedBox } from "@react-three/drei";
import { Color } from "three";
import { C } from "./palette";
import {
  CELL,
  type ChibiMotion,
  type ChibiPose,
  chibiPose,
  type EyeStyle,
  type Gear,
  type HeadShape,
  type Look,
  type Top,
} from "./pose";

export { CELL, type ChibiMotion, chibiPose, type Look } from "./pose";

import { Gloss, Toon } from "./toon";

/*
 * The story's cast (2026-11-05): soft chibi toys with a screen face, built from one rig so every
 * character has real joints (neck, shoulders, hips) and moves frame by frame. A `Look` sets who
 * it is (colour, head shape, eyes, what sits on top, what it wears or holds); a `ChibiMotion`
 * sets what it does. Every angle comes from `t` (seconds) through `chibiPose`, a pure function,
 * so a frame always renders the same pose (AGENTS.md rule 3), on the beat (120 BPM: 2 per s).
 */

/** Mix a colour toward another, for limbs (darker) and bellies (lighter). */
function mix(color: string, toward: string, amount: number): string {
  return `#${new Color(color).lerp(new Color(toward), amount).getHexString()}`;
}

const HEADS: Record<HeadShape, { size: [number, number, number]; radius: number }> = {
  squircle: { size: [1.15, 1.0, 0.9], radius: 0.3 },
  wide: { size: [1.38, 0.9, 0.9], radius: 0.3 },
  tall: { size: [1.0, 1.18, 0.9], radius: 0.3 },
  round: { size: [1.12, 1.06, 0.98], radius: 0.44 },
  cube: { size: [1.05, 1.0, 0.95], radius: 0.16 },
};

const GOLD = "#F2C14E";
const DEFAULT_GLOW = "#9BE9A8";

/** Unlit, untoned light for the face, so it glows the same at any exposure. */
function Glow({ color }: { color: string }) {
  return <meshBasicMaterial color={color} toneMapped={false} />;
}

function Arm({
  side,
  pose,
  limb,
  hand,
  hammer,
}: {
  side: 1 | -1;
  pose: { raise: number; swing: number };
  limb: string;
  hand: string;
  hammer?: boolean;
}) {
  return (
    <group position={[side * 0.33, 0.72, 0.02]} rotation={[pose.swing, 0, side * pose.raise]}>
      <mesh position={[0, -0.17, 0]}>
        <capsuleGeometry args={[0.085, 0.18, 8, 20]} />
        <Toon color={limb} />
      </mesh>
      <mesh position={[0, -0.36, 0]} scale={[1, 0.95, 0.9]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <Toon color={hand} />
      </mesh>
      {hammer && (
        // Held in the fist pointing forward, so a downward swing reads as a blow.
        <group position={[0, -0.38, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.42, 12]} />
            <Toon color="#8a5a35" />
          </mesh>
          <RoundedBox args={[0.3, 0.13, 0.13]} radius={0.03} smoothness={4} position={[0, 0.34, 0]}>
            <Toon color="#5b6170" />
          </RoundedBox>
        </group>
      )}
    </group>
  );
}

function Leg({
  side,
  swing,
  limb,
  foot,
  slim,
}: {
  side: 1 | -1;
  swing: number;
  limb: string;
  foot: string;
  slim?: boolean;
}) {
  return (
    <group position={[side * (slim ? 0.13 : 0.16), 0.34, 0]} rotation={[swing, 0, 0]}>
      <mesh position={[0, -0.13, 0]}>
        <capsuleGeometry args={[slim ? 0.075 : 0.095, 0.1, 8, 20]} />
        <Toon color={limb} />
      </mesh>
      <mesh position={[0, -0.27, 0.05]} scale={[1, 0.62, 1.3]}>
        <sphereGeometry args={[0.13, 32, 32]} />
        <Toon color={foot} />
      </mesh>
    </group>
  );
}

function Eyes({
  style,
  pose,
  glow,
  w,
}: {
  style: EyeStyle;
  pose: ChibiPose;
  glow: string;
  w: number;
}) {
  const gap = w * 0.17;
  const gx = pose.glance;
  const open = Math.max(0.12, pose.eyes);
  switch (style) {
    case "cells":
      return (
        <>
          {[-gap, gap].map((x) => (
            <group key={x} position={[x + gx, 0.03, 0]} scale={[1, open, 1]}>
              <RoundedBox args={[0.16, 0.2, 0.03]} radius={0.012} smoothness={4}>
                <Glow color={glow} />
              </RoundedBox>
            </group>
          ))}
        </>
      );
    case "dots":
      return (
        <>
          {[-gap, gap].map((x) => (
            <mesh
              key={x}
              position={[x + gx, 0.03, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[1, 1, open]}
            >
              <cylinderGeometry args={[0.085, 0.085, 0.03, 32]} />
              <Glow color={glow} />
            </mesh>
          ))}
        </>
      );
    case "happy":
      // ^ ^ : arcs that read as a grin with the eyes.
      return (
        <>
          {[-gap, gap].map((x) => (
            <mesh key={x} position={[x + gx, 0, 0]}>
              <torusGeometry args={[0.08, 0.022, 8, 24, Math.PI]} />
              <Glow color={glow} />
            </mesh>
          ))}
        </>
      );
    case "visor": {
      // One bar across the face with a bright scanner block sweeping along it.
      const scan = Math.sin(pose.top * 3) * w * 0.22;
      return (
        <>
          <RoundedBox
            args={[w * 0.6, 0.1, 0.02]}
            radius={0.008}
            smoothness={4}
            position={[0, 0.04, 0]}
          >
            <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.4} />
          </RoundedBox>
          <RoundedBox
            args={[0.16, 0.12, 0.03]}
            radius={0.01}
            smoothness={4}
            position={[scan, 0.04, 0.005]}
          >
            <Glow color={glow} />
          </RoundedBox>
        </>
      );
    }
    case "sleepy":
      return (
        <>
          {[-gap, gap].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.16, 0.035, 0.02]} />
              <Glow color={glow} />
            </mesh>
          ))}
        </>
      );
  }
}

function Mouth({ open, glow }: { open: number; glow: string }) {
  if (open > 0.15) {
    return (
      <mesh position={[0, -0.15, 0]} scale={[1, 0.5 + open * 0.7, 1]} rotation={[0, 0, Math.PI]}>
        <circleGeometry args={[0.08, 24, 0, Math.PI]} />
        <Glow color={glow} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, -0.17, 0]} rotation={[0, 0, Math.PI]} scale={[1, 0.55, 1]}>
      <torusGeometry args={[0.07, 0.016, 8, 24, Math.PI]} />
      <Glow color={glow} />
    </mesh>
  );
}

function TopPiece({ top, sway, h, body }: { top: Top; sway: number; h: number; body: string }) {
  const y = h / 2 - 0.02;
  const stalk = mix(body, "#0b120d", 0.3);
  switch (top) {
    case "sprout":
      return (
        <group position={[0, y, 0]} rotation={[0, 0, sway]}>
          <mesh position={[0, 0.1, 0]}>
            <capsuleGeometry args={[0.025, 0.14, 6, 12]} />
            <Toon color={stalk} />
          </mesh>
          <RoundedBox
            args={[0.2, 0.2, 0.2]}
            radius={0.06}
            smoothness={8}
            position={[0, 0.27, 0]}
            rotation={[0, 0, 0.3]}
          >
            <Toon color={C.heat[1]} />
          </RoundedBox>
        </group>
      );
    case "antennas":
      return (
        <>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.24, y, 0]}
              rotation={[0, 0, side * -0.35 + sway * 0.6]}
            >
              <mesh position={[0, 0.12, 0]}>
                <capsuleGeometry args={[0.02, 0.18, 6, 12]} />
                <Toon color={stalk} />
              </mesh>
              <mesh position={[0, 0.27, 0]}>
                <sphereGeometry args={[0.06, 20, 20]} />
                <Glow color={DEFAULT_GLOW} />
              </mesh>
            </group>
          ))}
        </>
      );
    case "ball":
      return (
        <group position={[0, y, 0]} rotation={[0, 0, sway]}>
          <mesh position={[0, 0.14, 0]}>
            <capsuleGeometry args={[0.02, 0.22, 6, 12]} />
            <Toon color={stalk} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <Toon color={C.persimmon} />
          </mesh>
        </group>
      );
    case "tufts":
      // Owl ear tufts.
      return (
        <>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * 0.4, y + 0.05, 0]}
              rotation={[0, 0, side * -0.4 + sway * 0.3]}
            >
              <coneGeometry args={[0.13, 0.3, 4]} />
              <Toon color={mix(body, "#0b120d", 0.2)} />
            </mesh>
          ))}
        </>
      );
    case "none":
      return null;
  }
}

/** Things worn on the head, sized from the head so they fit every shape. */
function HeadGear({ gear, w, h, d }: { gear: Gear[]; w: number; h: number; d: number }) {
  const hat = gear.includes("hardhat") ? GOLD : gear.includes("cap") ? C.cobalt : null;
  return (
    <>
      {gear.includes("headset") && (
        <group>
          <mesh position={[0, h * 0.08, 0]}>
            <torusGeometry args={[w * 0.56, 0.035, 10, 40, Math.PI]} />
            <Toon color={C.ink} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.17, 0.17, 0.12, 28]} />
              <Toon color={C.persimmon} />
            </mesh>
          ))}
          <mesh position={[w * 0.42, -h * 0.28, d * 0.38]} rotation={[0, -0.5, 1.2]}>
            <capsuleGeometry args={[0.02, 0.32, 6, 12]} />
            <Toon color={C.ink} />
          </mesh>
        </group>
      )}
      {hat && (
        <group position={[0, h / 2 - 0.08, 0]}>
          <mesh scale={[w * 0.95, 0.75, d * 1.05]}>
            <sphereGeometry args={[0.5, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Toon color={hat} />
          </mesh>
          {gear.includes("cap") ? (
            <mesh position={[0, 0.01, d * 0.5]} scale={[1, 1, 0.8]}>
              <cylinderGeometry
                args={[w * 0.32, w * 0.32, 0.04, 32, 1, false, -Math.PI / 2, Math.PI]}
              />
              <Toon color={hat} />
            </mesh>
          ) : (
            <mesh position={[0, 0.01, 0.04]}>
              <cylinderGeometry args={[w * 0.6, w * 0.6, 0.04, 40]} />
              <Toon color={hat} />
            </mesh>
          )}
        </group>
      )}
      {gear.includes("sweatband") && (
        <mesh
          position={[0, h * 0.3, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[w * 0.93, d * 0.98, 1]}
        >
          <torusGeometry args={[0.55, 0.06, 12, 48]} />
          <Toon color={C.persimmon} />
        </mesh>
      )}
      {gear.includes("glasses") && (
        <group position={[0, 0.03, d / 2 + 0.04]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * w * 0.17, 0, 0]}>
              <torusGeometry args={[0.13, 0.022, 10, 32]} />
              <Toon color={C.paper} />
            </mesh>
          ))}
          <mesh>
            <boxGeometry args={[0.1, 0.025, 0.02]} />
            <Toon color={C.paper} />
          </mesh>
        </group>
      )}
      {gear.includes("crown") && (
        <group position={[0, h / 2 - 0.02, 0]} rotation={[0, 0, -0.12]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.26, 0.28, 0.12, 5]} />
            <Toon color={GOLD} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                Math.sin((i / 5) * Math.PI * 2) * 0.24,
                0.18,
                Math.cos((i / 5) * Math.PI * 2) * 0.24,
              ]}
            >
              <coneGeometry args={[0.05, 0.14, 8]} />
              <Toon color={GOLD} />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
}

export function Chibi({
  look = CELL,
  motion = "wave",
  t = 0,
  seed = 0,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}: {
  look?: Look;
  motion?: ChibiMotion;
  t?: number;
  seed?: number;
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
}) {
  const pose = chibiPose(motion, t, seed);
  const gear = look.gear ?? [];
  const limb = mix(look.body, "#0b120d", 0.2);
  const belly = mix(look.body, "#ffffff", 0.45);
  const glow = look.glow ?? DEFAULT_GLOW;
  const { size, radius } = HEADS[look.head];
  const [w, h, d] = size;
  const torso = look.slim ? 0.52 : 0.6;
  const covered = gear.includes("hardhat") || gear.includes("cap") || gear.includes("crown");

  return (
    <group position={position} scale={scale} rotation={[0, rotationY + pose.rootTurn, 0]}>
      <group position={[0, pose.rootY, 0]} rotation={[pose.rootLean, 0, pose.rootTilt]}>
        <Leg side={-1} swing={pose.legL} limb={limb} foot={look.body} slim={look.slim} />
        <Leg side={1} swing={pose.legR} limb={limb} foot={look.body} slim={look.slim} />
        <group position={[0, 0.58, 0]} scale={[2 - pose.squash, pose.squash, 2 - pose.squash]}>
          <RoundedBox args={[torso, 0.6, 0.5]} radius={0.2} smoothness={10}>
            <Toon color={look.body} />
          </RoundedBox>
          <RoundedBox
            args={[torso * 0.6, 0.36, 0.2]}
            radius={0.09}
            smoothness={8}
            position={[0, -0.03, 0.22]}
            scale={[1, 1, 0.4]}
          >
            <Toon color={belly} />
          </RoundedBox>
          {gear.includes("scarf") && (
            <group position={[0, 0.27, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]}>
                <torusGeometry args={[0.3, 0.07, 12, 40]} />
                <Toon color={C.persimmon} />
              </mesh>
              <RoundedBox
                args={[0.14, 0.32, 0.06]}
                radius={0.025}
                smoothness={4}
                position={[0.14, -0.16, 0.27]}
                rotation={[0.2, 0, 0.15]}
              >
                <Toon color={C.persimmon} />
              </RoundedBox>
            </group>
          )}
          {gear.includes("backpack") && (
            <RoundedBox
              args={[0.5, 0.5, 0.26]}
              radius={0.1}
              smoothness={6}
              position={[0, 0.02, -0.34]}
            >
              <Toon color={C.persimmon} />
            </RoundedBox>
          )}
        </group>
        <Arm side={-1} pose={pose.armL} limb={limb} hand={look.body} />
        <Arm
          side={1}
          pose={pose.armR}
          limb={limb}
          hand={look.body}
          hammer={gear.includes("hammer")}
        />
        {/* Neck joint: the head tilts, turns and nods around it. */}
        <group position={[0, 0.86, 0]} rotation={[pose.head.nod, pose.head.turn, pose.head.tilt]}>
          <group position={[0, h / 2, 0]}>
            <RoundedBox args={size} radius={radius} smoothness={12} bevelSegments={12}>
              <Toon color={look.body} />
            </RoundedBox>
            {/* Face panel: dark and smooth like a screen; the face is made of light. */}
            <RoundedBox
              args={[w * 0.75, h * 0.62, 0.3]}
              radius={0.14}
              smoothness={10}
              position={[0, -0.02, d / 2 - 0.02]}
              scale={[1, 1, 0.2]}
            >
              <Gloss color={C.ink} />
            </RoundedBox>
            <group position={[0, 0, d / 2 + 0.015]}>
              <Eyes style={look.eyes} pose={pose} glow={glow} w={w} />
              {look.eyes !== "sleepy" &&
                look.eyes !== "visor" &&
                [-1, 1].map((side) => (
                  <mesh
                    key={side}
                    position={[side * w * 0.17, 0.2 + pose.brows, 0]}
                    rotation={[0, 0, side * -0.18]}
                  >
                    <boxGeometry args={[0.15, 0.03, 0.02]} />
                    <Glow color={glow} />
                  </mesh>
                ))}
              {look.eyes !== "visor" && <Mouth open={pose.mouth} glow={glow} />}
            </group>
            <HeadGear gear={gear} w={w} h={h} d={d} />
            {!covered && <TopPiece top={look.top} sway={pose.top} h={h} body={look.body} />}
          </group>
        </group>
      </group>
    </group>
  );
}

/** A contribution cell tossed back and forth between two characters, one throw per beat. */
export function TossedBlock({
  from,
  to,
  t,
}: {
  from: [number, number, number];
  to: [number, number, number];
  t: number;
}) {
  const beat = t * 2;
  const forward = Math.floor(beat) % 2 === 0;
  const p = beat % 1;
  const a = forward ? from : to;
  const b = forward ? to : from;
  const x = a[0] + (b[0] - a[0]) * p;
  const z = a[2] + (b[2] - a[2]) * p;
  const y = a[1] + (b[1] - a[1]) * p + Math.sin(Math.PI * p) * 0.9;
  return (
    <RoundedBox
      args={[0.24, 0.24, 0.24]}
      radius={0.06}
      smoothness={6}
      position={[x, y, z]}
      rotation={[p * 4, p * 3, 0]}
    >
      <Toon color={C.heat[1]} />
    </RoundedBox>
  );
}

/** Cell itself. */
export function ChibiCell({ motion = "wave", t = 0 }: { motion?: ChibiMotion; t?: number }) {
  return <Chibi look={CELL} motion={motion} t={t} />;
}
