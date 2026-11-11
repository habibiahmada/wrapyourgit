import { Color } from "three";
import { type ChibiMotion, chibiPose, type Look } from "../pose";
import { Flat, IsoBox, T, type Tone, type V3 } from "./isokit";

/*
 * Cell drawn in the landing's crisp isometric style (ADR-0021): the body is one contribution cell
 * (a block with flat-coloured faces and hairline edges), with pixel eyes and bar brows on its
 * front, prism limbs on real joints, and a crest of three small cells. Archetypes dress it with
 * blocky gear in the same style. Poses come from the rig's motions (pose.ts), so every motion
 * still loops in two seconds.
 */

const INK = "#0d1117";
const GOLD: Tone = { top: "#f5d36b", left: "#e3b341", right: "#bb8f2a", edge: "#f8e29a" };
const ORANGE: Tone = { top: "#ff9a5c", left: "#e8743b", right: "#c25b26", edge: "#ffb98c" };

function mix(hex: string, toward: string, amount: number): string {
  return `#${new Color(hex).lerp(new Color(toward), amount).getHexString()}`;
}

/** The three face colours of a body colour: lit top, mid left face, shaded right face. */
export function toneOf(hex: string): Tone {
  return {
    top: mix(hex, "#ffffff", 0.18),
    left: hex,
    right: mix(hex, "#000000", 0.24),
    edge: mix(hex, "#ffffff", 0.35),
  };
}

const CELL_LOOK: Look = { body: "#39d353", head: "squircle", eyes: "cells", top: "sprout" };

export function IsoCell({
  look = CELL_LOOK,
  motion = "wave",
  t = 0,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  seed = 0,
}: {
  look?: Look;
  motion?: ChibiMotion;
  t?: number;
  position?: V3;
  rotationY?: number;
  scale?: number;
  seed?: number;
}) {
  const pose = chibiPose(motion, t, seed);
  const gear = look.gear ?? [];
  const body = toneOf(look.body);
  const limbs = toneOf(mix(look.body, "#000000", 0.28));
  const sleepy = look.eyes === "sleepy";
  const happy = look.eyes === "happy";
  const open = sleepy ? 0.18 : Math.max(0.15, pose.eyes);
  const hip = 0.34;
  const bodyH = 0.95;
  const hatted = gear.includes("hardhat") || gear.includes("cap") || gear.includes("crown");
  return (
    <group position={position} rotation={[0, rotationY + pose.rootTurn, 0]} scale={scale}>
      <group position={[0, pose.rootY, 0]} rotation={[pose.rootLean, 0, pose.rootTilt]}>
        {/* Legs swing from the hips. */}
        {([-1, 1] as const).map((side) => (
          <group
            key={side}
            position={[side * 0.18, hip, 0]}
            rotation={[side === -1 ? pose.legL : pose.legR, 0, 0]}
          >
            <IsoBox
              size={[0.16, hip - 0.06, 0.16]}
              position={[0, -(hip - 0.06) / 2, 0]}
              tone={limbs}
            />
            <IsoBox size={[0.2, 0.08, 0.28]} position={[0, -hip + 0.04, 0.04]} tone={limbs} />
          </group>
        ))}

        {/* The cell: body and head in one, nodding and tilting about its base. */}
        <group
          position={[0, hip, 0]}
          rotation={[pose.head.nod * 0.5, pose.head.turn * 0.5, pose.head.tilt * 0.6]}
          scale={[2 - pose.squash, pose.squash, 2 - pose.squash]}
        >
          <IsoBox size={[0.92, bodyH, 0.82]} position={[0, bodyH / 2, 0]} tone={body} />

          {/* Face on the front (+z): pixel eyes with a glint, bar brows, a mouth. */}
          <group position={[pose.glance, bodyH * 0.58, 0.412]}>
            {([-1, 1] as const).map((side) =>
              happy ? (
                // Happy eyes: an upturned pixel arc, three blocks.
                <group key={side} position={[side * 0.19, 0, 0]}>
                  {[-1, 0, 1].map((k) => (
                    <mesh key={k} position={[k * 0.055, k === 0 ? 0.04 : 0, 0]}>
                      <planeGeometry args={[0.055, 0.05]} />
                      <Flat color={INK} />
                    </mesh>
                  ))}
                </group>
              ) : (
                <group key={side} position={[side * 0.19, 0, 0]} scale={[1, open, 1]}>
                  <mesh>
                    <planeGeometry args={[0.15, 0.19]} />
                    <Flat color={INK} />
                  </mesh>
                  {!sleepy && (
                    <mesh position={[0.035, 0.05, 0.001]}>
                      <planeGeometry args={[0.05, 0.05]} />
                      <Flat color="#ffffff" />
                    </mesh>
                  )}
                </group>
              ),
            )}
            {!sleepy &&
              ([-1, 1] as const).map((side) => (
                <mesh key={`b${side}`} position={[side * 0.19, 0.17 + pose.brows, 0.001]}>
                  <planeGeometry args={[0.2, 0.045]} />
                  <Flat color={INK} />
                </mesh>
              ))}
            <mesh position={[0, -0.2, 0.001]}>
              <planeGeometry args={[0.16, 0.04 + pose.mouth * 0.09]} />
              <Flat color={INK} />
            </mesh>
            {gear.includes("glasses") && (
              <group position={[0, 0, 0.004]}>
                {([-1, 1] as const).map((side) => (
                  <group key={`g${side}`} position={[side * 0.19, 0, 0]}>
                    {[
                      [0, 0.13, 0.27, 0.035],
                      [0, -0.13, 0.27, 0.035],
                      [-0.12, 0, 0.035, 0.27],
                      [0.12, 0, 0.035, 0.27],
                    ].map(([x, y, w, h]) => (
                      <mesh key={`${x}${y}`} position={[x ?? 0, y ?? 0, 0]}>
                        <planeGeometry args={[w ?? 0, h ?? 0]} />
                        <Flat color="#e6edf3" />
                      </mesh>
                    ))}
                  </group>
                ))}
              </group>
            )}
          </group>

          {/* Crest of three small cells, the signature; hats replace it. */}
          {!hatted &&
            look.top !== "tufts" &&
            [0, 1, 2].map((i) => (
              <IsoBox
                key={i}
                size={[0.17, 0.17 + i * 0.06, 0.17]}
                position={[-0.2 + i * 0.2, bodyH + (0.17 + i * 0.06) / 2, -0.1]}
                tone={
                  [
                    { top: "#26a641", left: "#006d32", right: "#0e4429", edge: "#2ea043" },
                    { top: "#39d353", left: "#26a641", right: "#006d32", edge: "#56e070" },
                    { top: "#7ee787", left: "#39d353", right: "#26a641", edge: "#a6f0b0" },
                  ][i]
                }
              />
            ))}
          {look.top === "tufts" &&
            ([-1, 1] as const).map((side) => (
              <IsoBox
                key={`t${side}`}
                size={[0.14, 0.24, 0.14]}
                position={[side * 0.36, bodyH + 0.09, 0]}
                rotation={[0, 0, side * -0.35]}
                tone={limbs}
              />
            ))}

          {/* Gear, in the same blocky style. */}
          {gear.includes("hardhat") && (
            <>
              <IsoBox size={[0.86, 0.22, 0.78]} position={[0, bodyH + 0.11, 0]} tone={GOLD} />
              <IsoBox size={[1.06, 0.05, 0.98]} position={[0, bodyH + 0.02, 0.04]} tone={GOLD} />
            </>
          )}
          {gear.includes("cap") && (
            <>
              <IsoBox size={[0.86, 0.18, 0.78]} position={[0, bodyH + 0.09, 0]} tone={T.navy} />
              <IsoBox size={[0.6, 0.04, 0.32]} position={[0, bodyH + 0.03, 0.52]} tone={T.navy} />
            </>
          )}
          {gear.includes("crown") && (
            <>
              <IsoBox size={[0.6, 0.14, 0.5]} position={[0, bodyH + 0.07, 0]} tone={GOLD} />
              {[-0.22, 0, 0.22].map((x) => (
                <IsoBox
                  key={x}
                  size={[0.12, 0.14, 0.12]}
                  position={[x, bodyH + 0.21, 0.12]}
                  tone={GOLD}
                />
              ))}
            </>
          )}
          {gear.includes("sweatband") && (
            <IsoBox size={[0.96, 0.1, 0.86]} position={[0, bodyH - 0.14, 0]} tone={ORANGE} />
          )}
          {gear.includes("scarf") && (
            <>
              <IsoBox size={[0.96, 0.12, 0.86]} position={[0, 0.1, 0]} tone={ORANGE} />
              <IsoBox size={[0.14, 0.32, 0.06]} position={[0.22, -0.04, 0.45]} tone={ORANGE} />
            </>
          )}
          {gear.includes("headset") && (
            <>
              <IsoBox size={[1.02, 0.07, 0.12]} position={[0, bodyH + 0.03, 0]} tone={T.dark} />
              {([-1, 1] as const).map((side) => (
                <IsoBox
                  key={`h${side}`}
                  size={[0.1, 0.28, 0.28]}
                  position={[side * 0.51, bodyH * 0.62, 0]}
                  tone={T.dark}
                />
              ))}
              <IsoBox
                size={[0.32, 0.04, 0.04]}
                position={[0.38, bodyH * 0.38, 0.38]}
                rotation={[0, 0.6, 0]}
                tone={T.dark}
              />
            </>
          )}
          {gear.includes("backpack") && (
            <IsoBox size={[0.6, 0.58, 0.22]} position={[0, bodyH * 0.45, -0.52]} tone={ORANGE} />
          )}

          {/* Arms from the shoulders: `raise` lifts outward, `swing` forward. */}
          {([-1, 1] as const).map((side) => {
            const arm = side === -1 ? pose.armL : pose.armR;
            return (
              <group
                key={`a${side}`}
                position={[side * 0.53, bodyH * 0.7, 0]}
                rotation={[arm.swing, 0, side * arm.raise]}
              >
                <IsoBox size={[0.13, 0.4, 0.13]} position={[0, -0.2, 0]} tone={limbs} />
                <IsoBox size={[0.18, 0.16, 0.18]} position={[0, -0.46, 0]} tone={body} />
                {side === 1 && gear.includes("hammer") && (
                  <group position={[0, -0.5, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                    <IsoBox size={[0.05, 0.42, 0.05]} position={[0, 0.16, 0]} tone={T.wood} />
                    <IsoBox size={[0.26, 0.12, 0.12]} position={[0, 0.38, 0]} tone={T.mid} />
                  </group>
                )}
              </group>
            );
          })}
        </group>
      </group>
    </group>
  );
}

/** An owl in the same style, for the night owl's room: it blinks and bobs on the beat. */
export function IsoOwl({ t = 0, position = [0, 0, 0] as V3, rotationY = 0 }) {
  const bob = 0.02 * Math.abs(Math.sin(Math.PI * t));
  const blink = (t + 0.4) % 2 < 0.12 ? 0.15 : 1;
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, rotationY, 0]}>
      <IsoBox size={[0.36, 0.4, 0.3]} position={[0, 0.2, 0]} tone={T.owl} />
      <IsoBox size={[0.24, 0.24, 0.02]} position={[0, 0.16, 0.16]} tone={T.cream} edges={false} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <group position={[side * 0.085, 0.3, 0.152]} scale={[1, blink, 1]}>
            <mesh>
              <planeGeometry args={[0.12, 0.12]} />
              <Flat color="#f7ecd8" />
            </mesh>
            <mesh position={[0, 0, 0.001]}>
              <planeGeometry args={[0.06, 0.06]} />
              <Flat color={INK} />
            </mesh>
          </group>
          <IsoBox
            size={[0.07, 0.12, 0.07]}
            position={[side * 0.13, 0.44, -0.02]}
            rotation={[0, 0, side * -0.4]}
            tone={T.owl}
          />
        </group>
      ))}
      <mesh position={[0, 0.22, 0.153]}>
        <planeGeometry args={[0.045, 0.06]} />
        <Flat color="#e3b341" />
      </mesh>
    </group>
  );
}

/** A small companion critter in the same style (beaver, fox, bird), coloured by `tone`. */
export function IsoCritter({
  t = 0,
  position = [0, 0, 0] as V3,
  rotationY = 0,
  tone = T.owl,
  belly = T.cream,
  ears = "round" as "round" | "pointed",
  hop = false,
}: {
  t?: number;
  position?: V3;
  rotationY?: number;
  tone?: Tone;
  belly?: Tone;
  ears?: "round" | "pointed";
  hop?: boolean;
}) {
  const lift = hop ? 0.08 * Math.abs(Math.sin(Math.PI * t)) : 0.015 * Math.sin(2 * Math.PI * t);
  return (
    <group position={[position[0], position[1] + lift, position[2]]} rotation={[0, rotationY, 0]}>
      <IsoBox size={[0.34, 0.3, 0.42]} position={[0, 0.2, 0]} tone={tone} />
      <IsoBox size={[0.3, 0.28, 0.28]} position={[0, 0.44, 0.12]} tone={tone} />
      <IsoBox size={[0.2, 0.16, 0.02]} position={[0, 0.17, 0.215]} tone={belly} edges={false} />
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * 0.07, 0.48, 0.262]}>
            <planeGeometry args={[0.05, 0.06]} />
            <Flat color={INK} />
          </mesh>
          <IsoBox
            size={ears === "pointed" ? [0.08, 0.14, 0.06] : [0.09, 0.08, 0.06]}
            position={[side * 0.1, ears === "pointed" ? 0.64 : 0.61, 0.08]}
            rotation={[0, 0, ears === "pointed" ? side * -0.25 : 0]}
            tone={tone}
          />
          <IsoBox size={[0.08, 0.12, 0.1]} position={[side * 0.1, 0.06, 0.12]} tone={tone} />
        </group>
      ))}
      <IsoBox size={[0.08, 0.05, 0.03]} position={[0, 0.4, 0.27]} tone={belly} edges={false} />
    </group>
  );
}
