import { RoundedBox } from "@react-three/drei";
import { C } from "./palette";
import { Gloss, Toon } from "./toon";

/*
 * Cell as a soft chibi toy (2026-11-05): a big pillowy head on a small egg body, stubby limbs on
 * real joints (neck, shoulders, hips), eyes that blink and a contribution-cell sprout that lags
 * behind the head. Rendered live, frame by frame, so the limbs move instead of the picture.
 * Every angle comes from `t` (seconds) through `chibiPose`, a pure function, so a frame always
 * renders the same pose (AGENTS.md rule 3) and the motion stays on the beat (120 BPM: 2 per s).
 */

export type ChibiMotion = "wave";

export type ChibiPose = {
  /** Whole-body offset and lean. */
  rootY: number;
  rootTilt: number;
  /** Body squash on the beat: 1 = rest. */
  squash: number;
  head: { tilt: number; turn: number; nod: number };
  /** Shoulder angles in radians: 0 hangs down, PI points up, positive raises outward. */
  armL: number;
  armR: number;
  /** Hip swing forward/back. */
  legL: number;
  legR: number;
  /** 1 open, 0 shut. */
  eyes: number;
  /** Brow lift, raised a little on the wave. */
  brows: number;
  sprout: number;
};

const TAU = Math.PI * 2;

/** Eyes shut for ~0.12 s every 2.6 s, at seeded offsets so it never looks mechanical. */
function blink(t: number): number {
  const period = 2.6;
  const local = (t + 0.9) % period;
  const closing = local / 0.12;
  return local < 0.12 ? Math.abs(1 - 2 * closing) : 1;
}

export function chibiPose(motion: ChibiMotion, t: number): ChibiPose {
  const beat = t * 2; // 120 BPM
  const hop = Math.abs(Math.sin(Math.PI * beat));
  switch (motion) {
    case "wave":
      return {
        rootY: 0.035 * hop,
        rootTilt: 0.05 * Math.sin(Math.PI * beat),
        squash: 1 - 0.035 * (1 - hop) ** 4,
        head: {
          tilt: 0.1 * Math.sin(Math.PI * beat + 0.6),
          turn: 0.12 * Math.sin((TAU * beat) / 8),
          nod: 0.05 * Math.sin(TAU * beat),
        },
        // The waving arm swings back and forth once per beat, high and outward.
        armR: 2.45 + 0.42 * Math.sin(TAU * beat),
        armL: 0.28 + 0.08 * Math.sin(Math.PI * beat),
        legL: 0.14 * Math.sin(Math.PI * beat),
        legR: -0.14 * Math.sin(Math.PI * beat),
        eyes: blink(t),
        brows: 0.02 + 0.015 * Math.sin(TAU * beat),
        sprout: -0.35 * Math.sin(Math.PI * beat - 0.7),
      };
  }
}

const BELLY = C.heat[0];
const GLOW = "#9BE9A8";
const LIMB = "#2fb84a";

function Arm({ side, angle }: { side: 1 | -1; angle: number }) {
  return (
    <group position={[side * 0.33, 0.7, 0.02]} rotation={[0, 0, side * angle]}>
      <mesh position={[0, -0.17, 0]}>
        <capsuleGeometry args={[0.085, 0.18, 8, 20]} />
        <Toon color={LIMB} />
      </mesh>
      <mesh position={[0, -0.36, 0]} scale={[1, 0.95, 0.9]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <Toon color={C.green} />
      </mesh>
    </group>
  );
}

function Leg({ side, swing }: { side: 1 | -1; swing: number }) {
  return (
    <group position={[side * 0.16, 0.34, 0]} rotation={[swing, 0, 0]}>
      <mesh position={[0, -0.13, 0]}>
        <capsuleGeometry args={[0.095, 0.1, 8, 20]} />
        <Toon color={LIMB} />
      </mesh>
      <mesh position={[0, -0.27, 0.05]} scale={[1, 0.62, 1.3]}>
        <sphereGeometry args={[0.13, 32, 32]} />
        <Toon color={C.green} />
      </mesh>
    </group>
  );
}

/** The face lights: unlit and untoned, so they glow the same green at any exposure. */
function Glow() {
  return <meshBasicMaterial color={GLOW} toneMapped={false} />;
}

/** An eye is a lit contribution cell on the face panel; it blinks by squashing shut. */
function Eye({ x, open }: { x: number; open: number }) {
  return (
    <group position={[x, 0.03, 0.485]} scale={[1, Math.max(0.12, open), 1]}>
      <RoundedBox args={[0.16, 0.2, 0.03]} radius={0.012} smoothness={4}>
        <Glow />
      </RoundedBox>
    </group>
  );
}

/** Brows: short lit bars, angled in a little, so the look is sure of itself rather than sweet. */
function Brow({ x, lift }: { x: number; lift: number }) {
  return (
    <mesh position={[x, 0.2 + lift, 0.485]} rotation={[0, 0, Math.sign(x) * -0.18]}>
      <boxGeometry args={[0.15, 0.03, 0.02]} />
      <Glow />
    </mesh>
  );
}

export function ChibiCell({
  motion = "wave",
  t = 0,
  rotationY = 0,
}: {
  motion?: ChibiMotion;
  t?: number;
  rotationY?: number;
}) {
  const pose = chibiPose(motion, t);
  return (
    <group rotation={[0, rotationY, 0]}>
      <group position={[0, pose.rootY, 0]} rotation={[0, 0, pose.rootTilt]}>
        <Leg side={-1} swing={pose.legL} />
        <Leg side={1} swing={pose.legR} />
        {/* A rounded-box torso with a lighter belly panel, squashing a touch on the beat. */}
        <group position={[0, 0.58, 0]} scale={[2 - pose.squash, pose.squash, 2 - pose.squash]}>
          <RoundedBox args={[0.6, 0.6, 0.5]} radius={0.2} smoothness={10}>
            <Toon color={C.green} />
          </RoundedBox>
          <RoundedBox
            args={[0.36, 0.36, 0.2]}
            radius={0.09}
            smoothness={8}
            position={[0, -0.03, 0.22]}
            scale={[1, 1, 0.4]}
          >
            <Toon color={BELLY} />
          </RoundedBox>
        </group>
        <Arm side={-1} angle={pose.armL} />
        <Arm side={1} angle={pose.armR} />
        {/* Neck joint: the head tilts, turns and nods around it. */}
        <group position={[0, 0.84, 0]} rotation={[pose.head.nod, pose.head.turn, pose.head.tilt]}>
          <group position={[0, 0.5, 0]}>
            {/* A soft squircle: rounder than the old cube, still clearly a cell, not a ball. */}
            <RoundedBox args={[1.15, 1.0, 0.9]} radius={0.3} smoothness={12} bevelSegments={12}>
              <Toon color={C.green} />
            </RoundedBox>
            {/* Face panel: dark and smooth like a screen, so the face is lights, not a baby face. */}
            <RoundedBox
              args={[0.86, 0.62, 0.3]}
              radius={0.14}
              smoothness={10}
              position={[0, -0.02, 0.43]}
              scale={[1, 1, 0.2]}
            >
              <Gloss color={C.ink} />
            </RoundedBox>
            <Eye x={-0.19} open={pose.eyes} />
            <Eye x={0.19} open={pose.eyes} />
            <Brow x={-0.2} lift={pose.brows} />
            <Brow x={0.2} lift={pose.brows} />
            {/* A small, flat smile: friendly, not cute. */}
            <mesh position={[0, -0.17, 0.485]} rotation={[0, 0, Math.PI]} scale={[1, 0.55, 1]}>
              <torusGeometry args={[0.07, 0.016, 8, 24, Math.PI]} />
              <Glow />
            </mesh>
            {/* The sprout: a tiny contribution cell on a stalk, trailing the head's motion. */}
            <group position={[0, 0.48, 0]} rotation={[0, 0, pose.sprout]}>
              <mesh position={[0, 0.1, 0]}>
                <capsuleGeometry args={[0.025, 0.14, 6, 12]} />
                <Toon color={LIMB} />
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
          </group>
        </group>
      </group>
    </group>
  );
}
