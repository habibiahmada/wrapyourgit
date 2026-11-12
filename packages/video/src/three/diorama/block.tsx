import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { archetypeRole } from "../../cast";
import type { ChibiMotion, Look } from "../pose";
import { Bus, Car, C as CITY, Crossing, Lamp, PaneX, PaneZ, Road, Tree } from "./city";
import { IsoCell, toneOf } from "./IsoCell";
import { Flat, IsoBox, LIT, Mover, Place, T, type Tone, type V3 } from "./isokit";

/*
 * What every city block of the isometric art shares (ADR-0022): the island with its roads,
 * traffic and trees and Cell, large, on the plaza in its middle (Block); the small Cells of a
 * district (Folk); and the things that float round Cell, placed by where they are seen so none
 * can end up in front of it (Around, Sparkles). The archetypes' districts are in scenes.tsx, the
 * landing's own in landing.tsx.
 */

export const CELL: Look = { body: "#39d353", head: "squircle", eyes: "cells", top: "sprout" };
export const ORANGE: Tone = { top: "#ff9a5c", left: "#e8743b", right: "#c25b26", edge: "#ffb98c" };
export const GOLD: Tone = { top: "#f5d36b", left: "#e3b341", right: "#bb8f2a", edge: "#f8e29a" };
export const RED: Tone = { top: "#ff7b72", left: "#da3633", right: "#b62324", edge: "#ffa198" };
export const BLUE: Tone = { top: "#79c0ff", left: "#388bfd", right: "#1f6feb", edge: "#a5d6ff" };

/** A flat lit square lying on a top face at height `y`. */
export function Spot({
  x,
  y,
  z,
  s,
  color = LIT,
}: {
  x: number;
  y: number;
  z: number;
  s: number;
  color?: string;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[s, s]} />
      <Flat color={color} />
    </mesh>
  );
}

/** How far a floating thing bobs up and down, and the tilt it rocks through. */
export const BOB = 0.11;
export const ROCK = 0.14;

/**
 * Something floating beside Cell: it bobs once a loop and rocks a little, `phase` (0 to 1) later
 * than the others, so the things round Cell never move in step. Children are drawn round the
 * group's own origin.
 */
export function Float({
  at,
  t,
  phase = 0,
  children,
}: {
  at: V3;
  t: number;
  phase?: number;
  children: ReactNode;
}) {
  const a = (t / 2 + phase) * Math.PI * 2;
  return (
    <group
      position={[at[0], at[1] + Math.sin(a) * BOB, at[2]]}
      rotation={[0, Math.cos(a) * ROCK, 0]}
    >
      {children}
    </group>
  );
}

/** A box round a point of its group. */
export function Bit({ at = [0, 0, 0], size, tone }: { at?: V3; size: V3; tone: Tone }) {
  return <IsoBox size={size} position={at} tone={tone} />;
}

/** A pixel star: a cube with four arms. */
export function Star({ s = 0.2, tone = GOLD }: { s?: number; tone?: Tone }) {
  return (
    <>
      <Bit size={[s, s, s]} tone={tone} />
      <Bit at={[0, s * 0.8, 0]} size={[s * 0.5, s * 0.6, s * 0.5]} tone={tone} />
      <Bit at={[0, -s * 0.8, 0]} size={[s * 0.5, s * 0.6, s * 0.5]} tone={tone} />
      <Bit at={[s * 0.8, 0, 0]} size={[s * 0.6, s * 0.5, s * 0.5]} tone={tone} />
      <Bit at={[-s * 0.8, 0, 0]} size={[s * 0.6, s * 0.5, s * 0.5]} tone={tone} />
    </>
  );
}

/** A pixel heart, seven boxes wide at most. */
export function Heart({ u = 0.11, tone = RED }: { u?: number; tone?: Tone }) {
  const rows: [number, number, number][] = [
    // y, half-width in units, how many units the notch in the middle takes
    [2, 3, 1],
    [1, 3.5, 0],
    [0, 2.5, 0],
    [-1, 1.5, 0],
    [-2, 0.5, 0],
  ];
  return (
    <>
      {rows.flatMap(([y, half, notch]) =>
        notch > 0
          ? [-1, 1].map((side) => (
              <Bit
                key={`${y}${side}`}
                at={[side * (half - 0.75) * u, y * u, 0]}
                size={[u * 2, u, u * 1.2]}
                tone={tone}
              />
            ))
          : [<Bit key={y} at={[0, y * u, 0]} size={[half * 2 * u, u, u * 1.2]} tone={tone} />],
      )}
    </>
  );
}

/** A speech bubble with three dots and a tail. */
export function Bubble({ tone = T.paper, dots = T.dark }: { tone?: Tone; dots?: Tone }) {
  return (
    <>
      <Bit size={[0.78, 0.46, 0.12]} tone={tone} />
      <Bit at={[-0.2, -0.3, 0]} size={[0.16, 0.14, 0.12]} tone={tone} />
      {[-0.2, 0, 0.2].map((x) => (
        <Bit key={x} at={[x, 0, 0.07]} size={[0.1, 0.1, 0.03]} tone={dots} />
      ))}
    </>
  );
}

/**
 * Where a point shows on screen, in world units right and up of the origin's place. The camera
 * is 45 degrees round and 30 degrees up, so going along +x or +z both move a thing down the
 * picture, and x against z moves it across.
 */
export const onScreen = (p: V3): [number, number] => [
  (p[0] - p[2]) * Math.SQRT1_2,
  p[1] * 0.866 - (p[0] + p[2]) * 0.3536,
];

/**
 * The place in the world that shows `right` and `up` of the origin on screen, `near` the camera
 * (the sum of its x and z: larger is nearer). Floating things are placed this way, by where they
 * are seen, so none of them can end up in front of Cell.
 */
export const seenAt = (right: number, up: number, near = 6): V3 => [
  (near + right / Math.SQRT1_2) / 2,
  (up + near * 0.3536) / 0.866,
  (near - right / Math.SQRT1_2) / 2,
];

/**
 * Small cubes in the air round Cell, each bobbing in its own time: confetti that never lands.
 * `clear` is the part of the picture Cell fills, as half its width and its height on screen from
 * this group's origin: no cube is put there, so nothing floats in front of Cell.
 */
export function Sparkles({
  t,
  accent,
  clear,
  spread = 1,
}: {
  t: number;
  accent: Tone;
  clear: { half: number; top: number };
  spread?: number;
}) {
  const tones = [accent, GOLD, T.paper, toneOf("#7ee787")];
  return (
    <>
      {Array.from({ length: 44 }, (_, i) => {
        // Spread by index, never by chance: the same picture on every bake.
        const a = i * 2.399963;
        const r = (1.5 + (((i * 37) % 11) / 11) * 1.6) * spread;
        const y = (0.6 + (((i * 53) % 23) / 23) * 3.6) * spread;
        const at: V3 = [Math.cos(a) * r, y, Math.sin(a) * r];
        const [right, up] = onScreen(at);
        if (Math.abs(right) < clear.half && up < clear.top) return null;
        const bob = Math.sin((t / 2 + ((i * 0.137) % 1)) * Math.PI * 2) * 0.09;
        const s = (0.07 + ((i * 29) % 5) * 0.012) * spread;
        return (
          <IsoBox
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed scatter
            key={i}
            size={[s, s, s]}
            position={[at[0], at[1] + bob, at[2]]}
            tone={tones[i % tones.length] ?? accent}
            edges={false}
          />
        );
      })}
    </>
  );
}

/** How much Cell is turned toward the camera, and its size on the plaza. */
export const FACING = 0.5;
export const GIANT = 1.9;
/** The plaza's middle: where Cell stands, and what the floating things are placed round. */
export const PLAZA: V3 = [0.75, 0.13, 0.75];
/** Along both kerbs: where the street trees stand. */
export const KERB = [-3.7, -2.6, -1.5, -0.4, 0.7, 1.8];

/** Something floating beside Cell, by where it is seen from the plaza's middle, at half again its size. */
export function Around({
  right,
  up,
  t,
  phase,
  children,
}: {
  right: number;
  up: number;
  t: number;
  phase: number;
  children: ReactNode;
}) {
  return (
    <Float at={seenAt(right, up)} t={t} phase={phase}>
      <group scale={1.5}>{children}</group>
    </Float>
  );
}

/**
 * What every archetype's picture shares: a city block on an island with a lit rim, two roads
 * that meet at the near corner with their crossings, street trees, lamps and traffic, and Cell,
 * large, in the archetype's look on the plaza in the middle, turned to the camera. `children`
 * are the district behind and beside the plaza; `floats` are what hangs in the air round Cell.
 * Cell fills about 1.9 each side of the plaza's middle and 3.4 up on screen: floats are placed
 * by where they are seen (Around), outside that, and the confetti keeps out of it too, so
 * nothing ever floats in front of Cell.
 */
export function Block({
  id,
  cast,
  t,
  cars,
  bus = false,
  children,
  floats,
}: {
  /** The archetype whose Cell stands on the plaza, or `cast` for a block that is not an archetype's. */
  id?: ArchetypeId;
  cast?: { look: Look; motion: ChibiMotion };
  t: number;
  /** The colours of the traffic, in turn. */
  cars: Tone[];
  /** A bus in place of the first car. */
  bus?: boolean;
  children: ReactNode;
  floats: ReactNode;
}) {
  const r = cast ?? archetypeRole(id ?? null);
  const accent = toneOf(r.look.body);
  const paint = (i: number) => cars[i % cars.length] ?? CITY.blue;
  return (
    <>
      {/* The island, with a lit rim, and its pavements. */}
      <Place at={[-4.3, -0.4, -4.3]} size={[8.6, 0.4, 8.6]} tone={T.floor} />
      <PaneX at={[4.304, -0.07, 0]} size={[8.5, 0.04]} color={LIT} />
      <PaneZ at={[0, -0.07, 4.304]} size={[8.5, 0.04]} color={LIT} />
      <Place at={[-4.2, 0, -4.2]} size={[6.5, 0.03, 6.5]} tone={CITY.pave} />
      <Place at={[3.5, 0, -4.2]} size={[0.7, 0.03, 6.5]} tone={CITY.pave} />
      <Place at={[-4.2, 0, 3.5]} size={[6.5, 0.03, 0.7]} tone={CITY.pave} />
      <Place at={[3.5, 0, 3.5]} size={[0.7, 0.03, 0.7]} tone={CITY.pave} />

      {/* Two roads that meet at the near corner, with crossings. */}
      <Road at={[-4.2, 0, 2.3]} long={8.4} along="x" />
      <Road at={[2.3, 0, -4.2]} long={6.5} along="z" />
      <Crossing at={[1.7, 0, 2.3]} along="x" />
      <Crossing at={[2.3, 0, 1.7]} along="z" />

      {children}

      {/* Street trees and lamps along both roads. */}
      {KERB.map((v) => (
        <group key={v}>
          <Tree at={[v, 0.03, 3.86]} s={0.8} />
          <Tree at={[3.86, 0.03, v]} s={0.8} />
        </group>
      ))}
      <Lamp at={[-3.3, 0.03, 2.2]} over="z" />
      <Lamp at={[-0.6, 0.03, 2.2]} over="z" />
      <Lamp at={[2.2, 0.03, -3.3]} over="x" />
      <Lamp at={[2.2, 0.03, -0.9]} over="x" />

      {/* Traffic. */}
      {bus ? (
        <Bus at={[-3.2, 0.02, 2.62]} tone={paint(0)} />
      ) : (
        <Car at={[-3.35, 0.02, 2.62]} tone={paint(0)} />
      )}
      <Car at={[-1.25, 0.02, 2.62]} tone={CITY.gold} kind="taxi" />
      <Car at={[-2.35, 0.02, 3.2]} tone={paint(1)} />
      <Car at={[0.45, 0.02, 3.2]} tone={CITY.white} kind="van" />
      <Car at={[2.62, 0.02, -3.3]} tone={paint(2)} turned />
      <Car at={[3.2, 0.02, -2.0]} tone={paint(3)} turned />
      <Car at={[2.62, 0.02, -0.5]} tone={CITY.gold} kind="taxi" turned />
      <Car at={[3.2, 0.02, 0.9]} tone={paint(4)} turned />

      {/* The plaza, and Cell on it. */}
      <Place at={[-0.55, 0.03, -0.55]} size={[2.6, 0.1, 2.6]} tone={T.dark} />
      <mesh position={[PLAZA[0], 0.132, PLAZA[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.16, 48]} />
        <Flat color="#3a4652" />
      </mesh>
      <mesh position={[PLAZA[0], 0.133, PLAZA[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.16, 1.22, 48]} />
        <Flat color={LIT} />
      </mesh>
      {/* Cell is the picture's one mover on a page: the block under it is drawn once. */}
      <Mover>
        <IsoCell
          look={r.look}
          motion={r.motion}
          t={t}
          position={PLAZA}
          rotationY={FACING}
          scale={GIANT}
        />
      </Mover>

      <group position={[PLAZA[0], 0, PLAZA[2]]}>
        {floats}
        <Sparkles t={t} accent={accent} clear={{ half: 2.1, top: 3.6 }} spread={1.5} />
      </group>
    </>
  );
}

/** A small Cell of the block: `look` in its own colour, a third of a unit tall. */
export function Folk({
  at,
  t,
  body,
  motion = "wave",
  turn = 0.5,
  seed = 1,
  gear,
  s = 0.34,
}: {
  at: V3;
  t: number;
  body: string;
  motion?: "wave" | "cheer" | "hammer" | "run" | "think" | "groove" | "proud";
  turn?: number;
  seed?: number;
  gear?: Look["gear"];
  s?: number;
}) {
  return (
    <IsoCell
      look={{ ...CELL, body, eyes: "happy", gear }}
      motion={motion}
      t={t}
      seed={seed}
      position={at}
      rotationY={turn}
      scale={s}
    />
  );
}

/** The height of a tower's roof with `floors` storeys, standing on the pavement. */
export const roof = (floors: number) => floors * 0.42 + 0.24;
