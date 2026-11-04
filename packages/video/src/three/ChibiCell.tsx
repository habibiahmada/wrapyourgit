import { RoundedBox } from "@react-three/drei";
import { C } from "./palette";
import { Blush, Gloss, MouthPaint, Sparkle, Toon } from "./toon";

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
        sprout: -0.35 * Math.sin(Math.PI * beat - 0.7),
      };
  }
}

const BELLY = C.heat[0];
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

function Eye({ x, open }: { x: number; open: number }) {
  return (
    <group position={[x, 0.06, 0.47]} scale={[1, Math.max(0.08, open), 1]}>
      <mesh scale={[1, 1.15, 0.5]}>
        <sphereGeometry args={[0.165, 40, 40]} />
        <Gloss color="#fbfaf5" />
      </mesh>
      <mesh position={[0.01, -0.02, 0.06]} scale={[1, 1.12, 0.45]}>
        <sphereGeometry args={[0.112, 32, 32]} />
        <Gloss color="#0d0d10" />
      </mesh>
      <mesh position={[0.045, 0.045, 0.11]}>
        <sphereGeometry args={[0.034, 16, 16]} />
        <Sparkle />
      </mesh>
      <mesh position={[-0.03, -0.06, 0.105]}>
        <sphereGeometry args={[0.016, 12, 12]} />
        <Sparkle />
      </mesh>
    </group>
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
        {/* Egg body with a lighter belly, squashing a touch on the beat. */}
        <group position={[0, 0.56, 0]} scale={[2 - pose.squash, pose.squash, 2 - pose.squash]}>
          <mesh scale={[1, 1.08, 0.9]}>
            <sphereGeometry args={[0.33, 48, 48]} />
            <Toon color={C.green} />
          </mesh>
          <mesh position={[0, -0.04, 0.25]} scale={[1, 1.15, 0.4]}>
            <sphereGeometry args={[0.2, 40, 40]} />
            <Toon color={BELLY} />
          </mesh>
        </group>
        <Arm side={-1} angle={pose.armL} />
        <Arm side={1} angle={pose.armR} />
        {/* Neck joint: the head tilts, turns and nods around it. */}
        <group position={[0, 0.84, 0]} rotation={[pose.head.nod, pose.head.turn, pose.head.tilt]}>
          <group position={[0, 0.5, 0]}>
            {/* Pillowy, not boxy: the corner radius is almost half the size. */}
            <RoundedBox args={[1.2, 1.0, 0.95]} radius={0.42} smoothness={14} bevelSegments={14}>
              <Toon color={C.green} />
            </RoundedBox>
            <Eye x={-0.24} open={pose.eyes} />
            <Eye x={0.24} open={pose.eyes} />
            {[-0.42, 0.42].map((x) => (
              <mesh key={x} position={[x, -0.15, 0.44]} scale={[1, 0.6, 0.25]}>
                <sphereGeometry args={[0.08, 24, 24]} />
                <Blush />
              </mesh>
            ))}
            <mesh position={[0, -0.16, 0.475]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.075, 0.022, 12, 32, Math.PI]} />
              <MouthPaint />
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
