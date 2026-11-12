import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { archetypeRole } from "../../cast";
import { sampleRecap } from "../../fixtures/sample-recap";
import { heatLevels } from "../../heat";
import { buildCity, plotHeight } from "../../world/city";
import type { Look } from "../pose";
import {
  Awning,
  Barrier,
  Bench,
  Billboard,
  Bleachers,
  Bunting,
  Bus,
  Cabin,
  Table as CafeTable,
  Campfire,
  Car,
  C as CITY,
  ClockFace,
  Cone,
  Crane,
  Crossing,
  Fence,
  Floodlight,
  Fountain,
  Hedge,
  Lake,
  Lamp,
  Mountain,
  Pallet,
  PaneX,
  PaneY,
  PaneZ,
  Rising,
  Road,
  RoofKit,
  Scaffold,
  Solar,
  Stall,
  Tent,
  Tower,
  Tree,
} from "./city";
import { IsoCell, IsoCritter, IsoOwl, toneOf } from "./IsoCell";
import { Flat, GREENS, Graph, IsoBox, LIT, Place, T, type Tone, type V3 } from "./isokit";

/*
 * The isometric art (ADR-0021, ADR-0022). Each archetype's `skin-*` is a dense city block built
 * from the kit in city.tsx: Cell, large, in that archetype's look on the plaza in the middle,
 * turned to the camera and doing its motion; the district of its rule round it (a building site,
 * a running track, a mountain and a lake, ...) with roads, traffic, trees and small Cells; and
 * the things of its rule floating round Cell, never in front of it. The landing's letter,
 * privacy and closing are dioramas: rooms with scenes of their own. Busy but tidy: objects never cross, and green
 * light marks the one thing that matters. Rooms are 4.6 × 3.6, floor at y = 0, the camera at
 * +x, +y, +z, so the back walls stand at -x and -z.
 */

export type DioramaId = `skin-${ArchetypeId}` | "iso-letter" | "iso-privacy" | "iso-closing";

/** The landing-only dioramas; the archetypes' are baked as `skin-*` (ArtStill). */
export const DIORAMA_IDS = ["iso-letter", "iso-privacy", "iso-closing"] as const;
export type LandingDioramaId = (typeof DIORAMA_IDS)[number];

/** Units across the frame, per landing diorama. */
export const DIORAMA_SPAN: Record<LandingDioramaId, number> = {
  "iso-letter": 7.0,
  "iso-privacy": 7.0,
  "iso-closing": 13.5,
};

const W = 4.6;
const D = 3.6;
const X0 = -W / 2;
const Z0 = -D / 2;

const CELL: Look = { body: "#39d353", head: "squircle", eyes: "cells", top: "sprout" };
const ORANGE: Tone = { top: "#ff9a5c", left: "#e8743b", right: "#c25b26", edge: "#ffb98c" };
const GOLD: Tone = { top: "#f5d36b", left: "#e3b341", right: "#bb8f2a", edge: "#f8e29a" };
const RED: Tone = { top: "#ff7b72", left: "#da3633", right: "#b62324", edge: "#ffa198" };
const BLUE: Tone = { top: "#79c0ff", left: "#388bfd", right: "#1f6feb", edge: "#a5d6ff" };

/** Floor slab with a lit rim on its two front edges, and optional back walls. */
function Room({ walls = true, floor = T.floor }: { walls?: boolean; floor?: Tone }) {
  return (
    <>
      <Place at={[X0, -0.28, Z0]} size={[W, 0.28, D]} tone={floor} />
      <mesh position={[W / 2 + 0.003, -0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D - 0.06, 0.03]} />
        <Flat color={LIT} />
      </mesh>
      <mesh position={[0, -0.06, D / 2 + 0.003]}>
        <planeGeometry args={[W - 0.06, 0.03]} />
        <Flat color={LIT} />
      </mesh>
      {walls && (
        <>
          <Place at={[X0, 0, Z0]} size={[0.12, 1.9, D]} tone={T.wall} />
          <Place at={[X0 + 0.12, 0, Z0]} size={[W - 0.12, 1.9, 0.12]} tone={T.wall} />
        </>
      )}
    </>
  );
}

/** A potted bush, stepped. */
function Plant({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[0.38, 0.32, 0.38]} tone={T.mid} />
      <Place at={[x - 0.02, y + 0.32, z - 0.02]} size={[0.42, 0.3, 0.42]} tone={T.leaf} />
      <Place at={[x + 0.06, y + 0.62, z + 0.06]} size={[0.28, 0.22, 0.28]} tone={T.leaf} />
      <Place at={[x + 0.12, y + 0.84, z + 0.12]} size={[0.16, 0.14, 0.16]} tone={T.green} />
    </>
  );
}

/** A table: top and four legs; `at` is the footprint corner. */
function Table({ at, size, tone = T.wood }: { at: V3; size: V3; tone?: Tone }) {
  const [x, y, z] = at;
  const [w, h, d] = size;
  const legs: [number, number][] = [
    [x + 0.04, z + 0.04],
    [x + w - 0.1, z + 0.04],
    [x + 0.04, z + d - 0.1],
    [x + w - 0.1, z + d - 0.1],
  ];
  return (
    <>
      <Place at={[x, y + h - 0.06, z]} size={[w, 0.06, d]} tone={tone} />
      {legs.map(([lx, lz]) => (
        <Place key={`${lx}${lz}`} at={[lx, y, lz]} size={[0.06, h - 0.06, 0.06]} tone={T.dark} />
      ))}
    </>
  );
}

function Rug({ at, size, tone = T.navy }: { at: V3; size: [number, number]; tone?: Tone }) {
  return <Place at={at} size={[size[0], 0.02, size[1]]} tone={tone} />;
}

/** A flat lit square lying on a top face at height `y`. */
function Spot({
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
const BOB = 0.11;
const ROCK = 0.14;

/**
 * Something floating beside Cell: it bobs once a loop and rocks a little, `phase` (0 to 1) later
 * than the others, so the things round Cell never move in step. Children are drawn round the
 * group's own origin.
 */
function Float({
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
function Bit({ at = [0, 0, 0], size, tone }: { at?: V3; size: V3; tone: Tone }) {
  return <IsoBox size={size} position={at} tone={tone} />;
}

/** A pixel star: a cube with four arms. */
function Star({ s = 0.2, tone = GOLD }: { s?: number; tone?: Tone }) {
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
function Heart({ u = 0.11, tone = RED }: { u?: number; tone?: Tone }) {
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
function Bubble({ tone = T.paper, dots = T.dark }: { tone?: Tone; dots?: Tone }) {
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
const onScreen = (p: V3): [number, number] => [
  (p[0] - p[2]) * Math.SQRT1_2,
  p[1] * 0.866 - (p[0] + p[2]) * 0.3536,
];

/**
 * The place in the world that shows `right` and `up` of the origin on screen, `near` the camera
 * (the sum of its x and z: larger is nearer). Floating things are placed this way, by where they
 * are seen, so none of them can end up in front of Cell.
 */
const seenAt = (right: number, up: number, near = 6): V3 => [
  (near + right / Math.SQRT1_2) / 2,
  (up + near * 0.3536) / 0.866,
  (near - right / Math.SQRT1_2) / 2,
];

/**
 * Small cubes in the air round Cell, each bobbing in its own time: confetti that never lands.
 * `clear` is the part of the picture Cell fills, as half its width and its height on screen from
 * this group's origin: no cube is put there, so nothing floats in front of Cell.
 */
function Sparkles({
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
const FACING = 0.5;
const GIANT = 1.9;
/** The plaza's middle: where Cell stands, and what the floating things are placed round. */
const PLAZA: V3 = [0.75, 0.13, 0.75];
/** Along both kerbs: where the street trees stand. */
const KERB = [-3.7, -2.6, -1.5, -0.4, 0.7, 1.8];

/** Something floating beside Cell, by where it is seen from the plaza's middle, at half again its size. */
function Around({
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
function Block({
  id,
  t,
  cars,
  bus = false,
  children,
  floats,
}: {
  id: ArchetypeId;
  t: number;
  /** The colours of the traffic, in turn. */
  cars: Tone[];
  /** A bus in place of the first car. */
  bus?: boolean;
  children: ReactNode;
  floats: ReactNode;
}) {
  const r = archetypeRole(id);
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
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={PLAZA}
        rotationY={FACING}
        scale={GIANT}
      />

      <group position={[PLAZA[0], 0, PLAZA[2]]}>
        {floats}
        <Sparkles t={t} accent={accent} clear={{ half: 2.1, top: 3.6 }} spread={1.5} />
      </group>
    </>
  );
}

/** A small Cell of the block: `look` in its own colour, a third of a unit tall. */
function Folk({
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
const roof = (floors: number) => floors * 0.42 + 0.24;

/**
 * Builder: a site in the block. A building going up under a crane and scaffolding, a site
 * office, pallets of bricks, a skip and pipes, small Cells at work, towers behind, and a park.
 */
function Builder({ t }: { t: number }) {
  return (
    <Block
      id="builder"
      t={t}
      cars={[CITY.blue, CITY.red, CITY.teal, CITY.violet, CITY.red]}
      floats={
        <>
          <Around right={-3.7} up={2.5} t={t} phase={0}>
            <Bit at={[0, 0, 0]} size={[0.52, 0.2, 0.26]} tone={ORANGE} />
            <Bit at={[0.14, 0.22, 0]} size={[0.52, 0.2, 0.26]} tone={ORANGE} />
            <Bit at={[-0.1, 0.44, 0]} size={[0.52, 0.2, 0.26]} tone={ORANGE} />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.35}>
            <Bit at={[0, -0.1, 0]} size={[0.1, 0.62, 0.1]} tone={T.wood} />
            <Bit at={[0.02, 0.26, 0]} size={[0.44, 0.2, 0.2]} tone={T.mid} />
          </Around>
          <Around right={0.2} up={4.5} t={t} phase={0.2}>
            <Bit size={[0.56, 0.16, 0.14]} tone={T.mid} />
            <Bit size={[0.16, 0.56, 0.14]} tone={T.mid} />
            <Bit at={[0, 0, 0.02]} size={[0.3, 0.3, 0.16]} tone={GOLD} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.6}>
            <Bit size={[0.46, 0.4, 0.46]} tone={T.wood} />
            <Bit at={[0, 0.33, 0]} size={[0.36, 0.26, 0.36]} tone={T.green} />
            <Spot x={0} y={0.465} z={0} s={0.2} color="#7ee787" />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.5}>
            <Bit size={[0.9, 0.64, 0.06]} tone={BLUE} />
            <Bit at={[0, 0.12, 0.04]} size={[0.6, 0.04, 0.02]} tone={T.paper} />
            <Bit at={[-0.12, -0.04, 0.04]} size={[0.36, 0.04, 0.02]} tone={T.paper} />
            <Bit at={[0.2, -0.06, 0.04]} size={[0.04, 0.3, 0.02]} tone={T.paper} />
            <Bit at={[-0.3, -0.2, 0.04]} size={[0.16, 0.16, 0.02]} tone={T.paper} />
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.9}>
            <Bit size={[0.84, 0.16, 0.12]} tone={GOLD} />
            <Bit at={[0, 0, 0.07]} size={[0.2, 0.08, 0.02]} tone={toneOf("#7ee787")} />
          </Around>
        </>
      }
    >
      {/* The towers behind: windows lit here and there, and what stands on their roofs. */}
      <Tower at={[-4.0, 0.03, -4.0]} size={[1.7, 1.6]} floors={7} tone={T.mid} seed={2} t={t} />
      <RoofKit at={[-4.0, roof(7), -4.0]} size={[1.7, 1.6]} seed={2} />
      <Solar at={[-3.6, roof(7), -3.2]} n={3} />
      <Tower
        at={[-2.15, 0.03, -3.95]}
        size={[1.5, 1.2]}
        floors={4}
        tone={CITY.brick}
        seed={8}
        t={t}
      />
      <RoofKit at={[-2.15, roof(4), -3.95]} size={[1.5, 1.2]} seed={8} />
      <Tower
        at={[-0.4, 0.03, -4.0]}
        size={[1.6, 1.5]}
        floors={10}
        tone={toneOf("#30476b")}
        seed={5}
        t={t}
      />
      <RoofKit at={[-0.4, roof(10), -4.0]} size={[1.6, 1.5]} seed={5} />
      <Tower
        at={[1.4, 0.03, -4.0]}
        size={[0.75, 1.1]}
        floors={2}
        tone={CITY.teal}
        seed={11}
        t={t}
      />

      {/* The site: a building going up, scaffolding on its near face, the crane lifting a load. */}
      <Rising at={[-3.95, 0.03, -2.0]} size={[2.2, 2.0]} done={3} bare={2} seed={4} t={t} />
      <Scaffold at={[-1.75, 0.03, -2.0]} long={2.0} tall={2.3} />
      <Crane at={[-3.95, 0.03, 0.4]} tall={4.3} reach={3.3} t={t} />
      <Cabin at={[-3.9, 0.03, 1.4]} />
      <Pallet at={[-2.3, 0.03, 1.45]} rows={3} />
      <Pallet at={[-1.7, 0.03, 1.45]} rows={2} tone={CITY.concrete} />
      <Pallet at={[-2.3, 0.03, 0.85]} rows={4} />
      <Fence at={[-3.9, 0.03, 2.14]} long={2.5} along="x" />
      <Barrier at={[-1.3, 0.03, 2.1]} along="x" />
      <Cone at={[-0.95, 0.03, 1.75]} />
      <Cone at={[-1.15, 0.03, 0.55]} />
      <Cone at={[-0.75, 0.03, 0.2]} />
      <Place at={[-3.2, 0.03, 0.75]} size={[0.7, 0.26, 0.42]} tone={CITY.steel} />
      <Place at={[-3.14, 0.29, 0.81]} size={[0.58, 0.05, 0.3]} tone={T.wood} />
      {[0, 1, 2].map((k) => (
        <Place
          key={k}
          at={[-1.75, 0.03 + k * 0.09, 0.3 + k * 0.03]}
          size={[0.8, 0.09, 0.1]}
          tone={CITY.blue}
        />
      ))}
      <Folk
        at={[-1.35, 0.03, 1.05]}
        t={t}
        body="#e3b341"
        motion="hammer"
        turn={0.4}
        seed={3}
        gear={["hardhat", "hammer"]}
      />
      <Folk
        at={[-2.75, 0.03, 0.55]}
        t={t}
        body="#e3b341"
        motion="wave"
        turn={0.9}
        seed={7}
        gear={["hardhat"]}
      />
      <Folk
        at={[-2.9, 2.27, -0.9]}
        t={t}
        body="#e3b341"
        motion="cheer"
        seed={5}
        gear={["hardhat"]}
        s={0.3}
      />

      {/* A park by the far road: grass, trees, a bench, and a board with the year on it. */}
      <Place at={[0.95, 0.03, -2.6]} size={[1.2, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.25, 0.05, -2.3]} s={1.1} />
      <Tree at={[1.85, 0.05, -1.8]} s={0.9} />
      <Tree at={[1.3, 0.05, -1.3]} s={1.0} />
      <Bench at={[1.45, 0.05, -0.95]} />
      <Hedge at={[0.95, 0.05, -0.74]} long={1.2} along="x" />
      <Billboard at={[-0.35, 0.03, -2.25]} size={[1.25, 0.72]}>
        <Graph cols={9} rows={4} cell={0.1} gap={0.03} seed={21} t={t} />
      </Billboard>
    </Block>
  );
}

const TRACK: Tone = { top: "#c4553a", left: "#a3442e", right: "#843724", edge: "#d97a62" };

/**
 * Consistent: a running track in the block. Runners on its lanes, a podium and a board with the
 * week on the infield, floodlights, bleachers, and a clock tower among the towers behind.
 */
function Consistent({ t }: { t: number }) {
  const day = Math.floor(((t % 2) / 2) * 7);
  return (
    <Block
      id="consistent"
      t={t}
      cars={[CITY.teal, CITY.blue, CITY.red, CITY.violet, CITY.teal]}
      floats={
        <>
          <Around right={-3.7} up={2.6} t={t} phase={0}>
            <Bit at={[0, -0.12, 0]} size={[0.42, 0.3, 0.3]} tone={RED} />
            <Bit at={[0, 0.14, 0]} size={[0.32, 0.28, 0.26]} tone={ORANGE} />
            <Bit at={[0.03, 0.38, 0]} size={[0.18, 0.24, 0.2]} tone={GOLD} />
          </Around>
          <Around right={0.2} up={4.6} t={t} phase={0.15}>
            {Array.from({ length: 7 }, (_, i) => (
              <Bit
                // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed days
                key={i}
                at={[(i - 3) * 0.28, 0, 0]}
                size={[0.22, 0.22, 0.22]}
                tone={i <= day ? toneOf("#39d353") : T.greenDeep}
              />
            ))}
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.4}>
            <Bit at={[0, -0.3, 0]} size={[0.4, 0.1, 0.3]} tone={T.wood} />
            <Bit at={[0, -0.16, 0]} size={[0.12, 0.2, 0.12]} tone={GOLD} />
            <Bit at={[0, 0.1, 0]} size={[0.46, 0.36, 0.3]} tone={GOLD} />
            <Bit at={[-0.3, 0.12, 0]} size={[0.1, 0.2, 0.08]} tone={GOLD} />
            <Bit at={[0.3, 0.12, 0]} size={[0.1, 0.2, 0.08]} tone={GOLD} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.7}>
            <Bit size={[0.44, 0.44, 0.12]} tone={T.paper} />
            <Bit at={[0, 0.28, 0]} size={[0.12, 0.12, 0.1]} tone={T.mid} />
            <Bit at={[0, 0.06, 0.07]} size={[0.05, 0.2, 0.02]} tone={T.dark} />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.55}>
            <Bit size={[0.86, 0.7, 0.08]} tone={T.paper} />
            <Bit at={[0, 0.3, 0.01]} size={[0.86, 0.14, 0.09]} tone={RED} />
            <group position={[0, -0.06, 0.05]}>
              <Graph cols={7} rows={4} cell={0.085} gap={0.02} seed={5} t={t} />
            </group>
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.85}>
            <Bit at={[0, 0.2, 0]} size={[0.16, 0.3, 0.05]} tone={RED} />
            <Bit at={[0, -0.08, 0]} size={[0.36, 0.36, 0.1]} tone={GOLD} />
            <Bit at={[0, -0.08, 0.06]} size={[0.16, 0.16, 0.03]} tone={T.paper} />
          </Around>
        </>
      }
    >
      {/* Behind: flats, the clock tower, the gym with panels on its roof, a tower of offices. */}
      <Tower at={[-4.0, 0.03, -4.0]} size={[1.5, 1.5]} floors={6} tone={T.mid} seed={31} t={t} />
      <RoofKit at={[-4.0, roof(6), -4.0]} size={[1.5, 1.5]} seed={31} />
      <Tower
        at={[-2.3, 0.03, -3.9]}
        size={[0.9, 0.9]}
        floors={8}
        tone={CITY.concrete}
        seed={33}
        t={t}
        trim={CITY.steel}
      />
      <ClockFace at={[-1.85, 3.2, -2.994]} r={0.3} t={t} />
      <Place at={[-2.1, roof(8), -3.7]} size={[0.5, 0.4, 0.5]} tone={CITY.gold} />
      <Place at={[-1.95, roof(8) + 0.4, -3.55]} size={[0.2, 0.3, 0.2]} tone={CITY.gold} />
      <Tower
        at={[-1.15, 0.03, -4.0]}
        size={[2.0, 1.4]}
        floors={3}
        tone={toneOf("#1f6f38")}
        seed={35}
        t={t}
      />
      <Solar at={[-0.95, roof(3), -3.6]} n={4} />
      <RoofKit at={[-1.15, roof(3), -4.0]} size={[2.0, 1.4]} seed={35} />
      <Tower
        at={[1.1, 0.03, -4.0]}
        size={[1.05, 1.3]}
        floors={8}
        tone={toneOf("#30476b")}
        seed={37}
        t={t}
      />
      <RoofKit at={[1.1, roof(8), -4.0]} size={[1.05, 1.3]} seed={37} />

      {/* The track: lanes round an infield. */}
      <Place at={[-3.95, 0.03, -2.05]} size={[2.95, 0.03, 4.1]} tone={TRACK} />
      <Place at={[-3.3, 0.06, -1.4]} size={[1.65, 0.02, 2.8]} tone={CITY.grass} />
      {[-3.74, -3.52].map((x) => (
        <PaneY key={x} at={[x, 0.062, 0]} size={[0.02, 3.9]} color="#f0f6fc" />
      ))}
      {[-1.43, -1.21].map((x) => (
        <PaneY key={x} at={[x, 0.062, 0]} size={[0.02, 3.9]} color="#f0f6fc" />
      ))}
      {[-1.83, -1.62, 1.6, 1.82].map((z) => (
        <PaneY key={z} at={[-2.48, 0.062, z]} size={[2.7, 0.02]} color="#f0f6fc" />
      ))}
      <PaneY at={[-1.32, 0.063, 0.4]} size={[0.6, 0.1]} color="#f0f6fc" />
      {/* Runners, each in its lane. */}
      <Folk
        at={[-1.32, 0.06, -1.1]}
        t={t}
        body="#39d353"
        motion="run"
        turn={0}
        seed={2}
        gear={["sweatband"]}
      />
      <Folk
        at={[-1.54, 0.06, 0.9]}
        t={t}
        body="#38bdf8"
        motion="run"
        turn={0}
        seed={6}
        gear={["sweatband"]}
      />
      <Folk
        at={[-3.63, 0.06, 0.3]}
        t={t}
        body="#ff7ab6"
        motion="run"
        turn={Math.PI}
        seed={9}
        gear={["sweatband"]}
      />
      <Folk
        at={[-2.6, 0.06, -1.72]}
        t={t}
        body="#a78bfa"
        motion="run"
        turn={-Math.PI / 2}
        seed={4}
        gear={["sweatband"]}
      />
      {/* On the infield: the podium, and the week on a board. */}
      <Place at={[-2.95, 0.08, 0.5]} size={[0.32, 0.2, 0.32]} tone={CITY.white} />
      <Place at={[-2.63, 0.08, 0.5]} size={[0.32, 0.34, 0.32]} tone={CITY.gold} />
      <Place at={[-2.31, 0.08, 0.5]} size={[0.32, 0.14, 0.32]} tone={CITY.brick} />
      <Folk at={[-2.47, 0.42, 0.66]} t={t} body="#39d353" motion="cheer" seed={8} s={0.26} />
      <Billboard at={[-3.2, 0.08, -1.05]} size={[1.4, 0.5]}>
        <Graph cols={7} rows={2} cell={0.15} gap={0.04} seed={3} t={t} />
      </Billboard>
      <Floodlight at={[-3.9, 0.03, -2.0]} />
      <Floodlight at={[-1.1, 0.03, -2.0]} />
      <Floodlight at={[-3.9, 0.03, 2.0]} />
      <Floodlight at={[-1.1, 0.03, 2.0]} />

      {/* By the plaza: bleachers, a water stand, trees. */}
      <Bleachers at={[-0.55, 0.03, -2.3]} long={1.5} rows={3} tone={CITY.teal} />
      <Place at={[1.15, 0.03, -2.6]} size={[1.0, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.4, 0.05, -2.25]} s={1.0} />
      <Tree at={[1.85, 0.05, -1.55]} s={0.9} />
      <Bench at={[1.3, 0.05, -1.0]} />
      <Stall at={[-0.5, 0.03, -1.35]} tone={CITY.teal} />
    </Block>
  );
}

/**
 * Explorer: the outdoors in the block. A mountain with snow on top, a lake, tents and a fire, a
 * trail of stones, a lodge and a lighthouse, and a tower for each language tried this year.
 */
function Explorer({ t }: { t: number }) {
  return (
    <Block
      id="explorer"
      t={t}
      cars={[CITY.red, CITY.teal, CITY.blue, CITY.violet, CITY.blue]}
      floats={
        <>
          <Around right={-3.7} up={2.6} t={t} phase={0}>
            <Bit size={[0.6, 0.6, 0.1]} tone={T.paper} />
            <Bit at={[0, 0.1, 0.06]} size={[0.1, 0.22, 0.03]} tone={RED} />
            <Bit at={[0, -0.1, 0.06]} size={[0.1, 0.2, 0.03]} tone={T.dark} />
          </Around>
          {/* A hot-air balloon, in the open sky over the mountain. */}
          <Around right={-2.9} up={5.0} t={t} phase={0.2}>
            <Bit at={[0, 0.3, 0]} size={[0.5, 0.2, 0.5]} tone={RED} />
            <Bit at={[0, 0.12, 0]} size={[0.66, 0.2, 0.66]} tone={T.paper} />
            <Bit at={[0, -0.06, 0]} size={[0.5, 0.18, 0.5]} tone={RED} />
            <Bit at={[0, -0.22, 0]} size={[0.26, 0.14, 0.26]} tone={T.paper} />
            <Bit at={[0, -0.46, 0]} size={[0.2, 0.14, 0.2]} tone={T.wood} />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.4}>
            <Bit size={[0.86, 0.6, 0.06]} tone={T.cream} />
            <Bit at={[-0.2, 0.08, 0.04]} size={[0.26, 0.2, 0.02]} tone={T.green} />
            <Bit at={[0.18, -0.1, 0.04]} size={[0.3, 0.16, 0.02]} tone={BLUE} />
            <Bit at={[0.02, 0.0, 0.05]} size={[0.5, 0.04, 0.02]} tone={RED} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.65}>
            <Bit at={[-0.17, 0, 0]} size={[0.26, 0.3, 0.42]} tone={T.dark} />
            <Bit at={[0.17, 0, 0]} size={[0.26, 0.3, 0.42]} tone={T.dark} />
            <Bit at={[0, 0.04, 0]} size={[0.12, 0.12, 0.2]} tone={T.mid} />
            <Bit at={[-0.17, 0, 0.22]} size={[0.18, 0.2, 0.03]} tone={BLUE} />
            <Bit at={[0.17, 0, 0.22]} size={[0.18, 0.2, 0.03]} tone={BLUE} />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.5}>
            <Bit at={[-0.28, 0, 0]} size={[0.24, 0.24, 0.24]} tone={BLUE} />
            <Bit at={[0, 0.1, 0]} size={[0.24, 0.24, 0.24]} tone={GOLD} />
            <Bit at={[0.28, 0, 0]} size={[0.24, 0.24, 0.24]} tone={RED} />
          </Around>
          <Around right={0.3} up={4.8} t={t} phase={0.85}>
            <Star s={0.16} />
          </Around>
        </>
      }
    >
      {/* Behind: the lodge, a tower for each language, a lookout, the lighthouse. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[1.6, 1.3]}
        floors={2}
        tone={toneOf("#7a5a3c")}
        seed={41}
        t={t}
        trim={T.wood}
      />
      <Place at={[-3.9, roof(2), -3.9]} size={[1.4, 0.2, 1.1]} tone={CITY.red} />
      <Place at={[-3.6, roof(2) + 0.2, -3.7]} size={[0.8, 0.16, 0.7]} tone={CITY.red} />
      <Place at={[-2.75, roof(2), -3.5]} size={[0.16, 0.5, 0.16]} tone={CITY.concrete} />
      <Tower
        at={[-2.2, 0.03, -3.9]}
        size={[0.62, 0.62]}
        floors={5}
        tone={CITY.blue}
        seed={43}
        t={t}
        door={false}
      />
      <Tower
        at={[-1.45, 0.03, -3.9]}
        size={[0.62, 0.62]}
        floors={7}
        tone={CITY.gold}
        seed={45}
        t={t}
        door={false}
      />
      <Tower
        at={[-0.7, 0.03, -3.9]}
        size={[0.62, 0.62]}
        floors={4}
        tone={CITY.red}
        seed={47}
        t={t}
        door={false}
      />
      {/* The lookout: a hut on four legs, with a flag. */}
      {[
        [0.2, -3.9],
        [0.8, -3.9],
        [0.2, -3.3],
        [0.8, -3.3],
      ].map(([x, z]) => (
        <Place
          key={`${x}${z}`}
          at={[x ?? 0, 0.03, z ?? 0]}
          size={[0.06, 1.5, 0.06]}
          tone={T.wood}
        />
      ))}
      <Place at={[0.12, 1.5, -3.98]} size={[0.82, 0.06, 0.82]} tone={T.wood} />
      <Place at={[0.22, 1.56, -3.88]} size={[0.62, 0.44, 0.62]} tone={toneOf("#7a5a3c")} />
      <PaneZ at={[0.53, 1.8, -3.256]} size={[0.3, 0.18]} color="#79c0ff" />
      <Place at={[0.16, 2.0, -3.94]} size={[0.74, 0.08, 0.74]} tone={CITY.red} />
      {/* The lighthouse, banded, its lamp lit. */}
      {[0, 1, 2, 3, 4].map((k) => (
        <Place
          key={k}
          at={[1.35 + k * 0.03, 0.03 + k * 0.42, -3.9 + k * 0.03]}
          size={[0.66 - k * 0.06, 0.42, 0.66 - k * 0.06]}
          tone={k % 2 === 0 ? CITY.white : CITY.red}
        />
      ))}
      <Place at={[1.45, 2.13, -3.8]} size={[0.46, 0.06, 0.46]} tone={T.dark} />
      <Place at={[1.53, 2.19, -3.72]} size={[0.3, 0.26, 0.3]} tone={CITY.gold} />
      <Place at={[1.49, 2.45, -3.76]} size={[0.38, 0.08, 0.38]} tone={CITY.red} />

      {/* The mountain, the lake under it, the camp. */}
      <Mountain at={[-3.95, 0.03, -2.05]} size={[2.75, 2.75]} levels={6} />
      <Lake at={[-3.9, 0.035, 0.95]} size={[1.9, 1.15]} />
      <Place at={[-3.2, 0.06, 0.9]} size={[0.3, 0.05, 1.25]} tone={T.wood} />
      <Tent at={[-1.8, 0.03, 1.25]} tone={CITY.brick} />
      <Tent at={[-1.75, 0.03, 0.45]} tone={CITY.teal} />
      <Campfire at={[-1.0, 0.03, 1.2]} t={t} />
      <Folk
        at={[-0.85, 0.03, 1.7]}
        t={t}
        body="#38bdf8"
        motion="think"
        turn={2.6}
        seed={3}
        gear={["cap"]}
      />
      <Folk
        at={[-1.3, 0.03, -0.35]}
        t={t}
        body="#ff8a3d"
        motion="wave"
        turn={0.6}
        seed={7}
        gear={["cap", "backpack"]}
      />
      <Folk
        at={[-2.58, 2.19, -0.68]}
        t={t}
        body="#2dd4bf"
        motion="cheer"
        seed={5}
        gear={["cap"]}
        s={0.28}
      />
      {[-1.05, -0.5, 0.05].map((z) => (
        <Tree key={z} at={[-1.0, 0.03, z - 1.0]} s={0.95} tone={T.leaf} />
      ))}
      {/* A trail of stones from the camp to the plaza. */}
      {[
        [-1.45, 0.05],
        [-1.15, 0.3],
        [-0.85, 0.5],
      ].map(([x, z]) => (
        <Place
          key={`${x}${z}`}
          at={[x ?? 0, 0.03, z ?? 0]}
          size={[0.2, 0.04, 0.2]}
          tone={T.green}
        />
      ))}

      {/* By the plaza: a signpost, a map of the park, pines. */}
      <Place at={[1.0, 0.03, -2.6]} size={[1.15, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.3, 0.05, -2.3]} s={1.15} />
      <Tree at={[1.85, 0.05, -1.7]} s={1.0} />
      <Tree at={[1.25, 0.05, -1.2]} s={0.9} />
      <Place at={[0.45, 0.03, -1.25]} size={[0.06, 0.7, 0.06]} tone={T.wood} />
      <Place at={[0.45, 0.55, -1.22]} size={[0.44, 0.14, 0.05]} tone={CITY.gold} />
      <Place at={[0.13, 0.36, -1.22]} size={[0.4, 0.14, 0.05]} tone={CITY.white} />
      <Billboard at={[-0.4, 0.03, -2.25]} size={[1.25, 0.72]}>
        <mesh>
          <planeGeometry args={[1.1, 0.58]} />
          <Flat color="#f0e2c8" />
        </mesh>
        <mesh position={[-0.25, 0.08, 0.002]}>
          <planeGeometry args={[0.34, 0.24]} />
          <Flat color="#2ea043" />
        </mesh>
        <mesh position={[0.22, -0.1, 0.002]}>
          <planeGeometry args={[0.36, 0.2]} />
          <Flat color="#388bfd" />
        </mesh>
        <mesh position={[0.02, 0, 0.003]} rotation={[0, 0, 0.3]}>
          <planeGeometry args={[0.7, 0.03]} />
          <Flat color="#da3633" />
        </mesh>
      </Billboard>
    </Block>
  );
}

/**
 * Collaborator: an office campus in the block. Two towers joined by a bridge, a café, a
 * courtyard of tables where small Cells in every colour talk, a bus stop, and a bus.
 */
function Collaborator({ t }: { t: number }) {
  return (
    <Block
      id="collaborator"
      t={t}
      bus
      cars={[CITY.teal, CITY.violet, CITY.blue, CITY.red, CITY.violet]}
      floats={
        <>
          <Around right={-3.7} up={2.6} t={t} phase={0}>
            <Bubble />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.45}>
            <Bubble tone={BLUE} dots={T.paper} />
          </Around>
          <Around right={0.2} up={4.6} t={t} phase={0.25}>
            <Heart />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.7}>
            <Bit at={[-0.2, 0.2, 0]} size={[0.2, 0.2, 0.2]} tone={T.green} />
            <Bit at={[0.2, 0.2, 0]} size={[0.2, 0.2, 0.2]} tone={toneOf("#a78bfa")} />
            <Bit at={[0, -0.2, 0]} size={[0.2, 0.2, 0.2]} tone={T.green} />
            <Bit at={[-0.1, 0, 0]} size={[0.08, 0.26, 0.08]} tone={T.mid} />
            <Bit at={[0.1, 0, 0]} size={[0.08, 0.26, 0.08]} tone={T.mid} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.9}>
            <Bit size={[0.5, 0.5, 0.1]} tone={T.green} />
            <Bit at={[-0.08, -0.06, 0.06]} size={[0.1, 0.16, 0.03]} tone={T.paper} />
            <Bit at={[0.08, 0.04, 0.06]} size={[0.1, 0.34, 0.03]} tone={T.paper} />
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.6}>
            <Bit at={[0, -0.08, 0]} size={[0.36, 0.3, 0.2]} tone={GOLD} />
            <Bit at={[-0.12, 0.16, 0]} size={[0.12, 0.26, 0.16]} tone={GOLD} />
            <Bit at={[-0.26, -0.08, 0]} size={[0.12, 0.3, 0.2]} tone={BLUE} />
          </Around>
        </>
      }
    >
      {/* Behind: two towers and the bridge between them, and the café with its sign. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[1.6, 1.5]}
        floors={9}
        tone={toneOf("#8a3d63")}
        seed={51}
        t={t}
      />
      <RoofKit at={[-4.0, roof(9), -4.0]} size={[1.6, 1.5]} seed={51} />
      <Tower
        at={[-1.0, 0.03, -4.0]}
        size={[1.5, 1.4]}
        floors={7}
        tone={toneOf("#30476b")}
        seed={53}
        t={t}
      />
      <RoofKit at={[-1.0, roof(7), -4.0]} size={[1.5, 1.4]} seed={53} />
      <Place at={[-2.4, 1.72, -3.55]} size={[1.4, 0.34, 0.5]} tone={CITY.steel} />
      {[-2.2, -1.85, -1.5, -1.15].map((x) => (
        <PaneZ key={x} at={[x, 1.89, -3.046]} size={[0.22, 0.18]} color="#79c0ff" />
      ))}
      <Tower
        at={[0.75, 0.03, -4.0]}
        size={[1.4, 1.2]}
        floors={1}
        tone={T.cream}
        seed={55}
        t={t}
        trim={T.wood}
      />
      <Awning at={[0.75, 0.55, -2.8]} long={1.4} tone={toneOf("#ff7ab6")} />
      <group position={[1.45, 1.05, -3.3]} scale={1.1}>
        <Bubble tone={toneOf("#ff7ab6")} dots={T.paper} />
      </group>
      <Place at={[1.42, roof(1), -3.34]} size={[0.06, 0.2, 0.06]} tone={CITY.steel} />

      {/* A studio, and the courtyard: tables, and a team in every colour. */}
      <Tower
        at={[-3.95, 0.03, -2.0]}
        size={[1.4, 1.6]}
        floors={3}
        tone={CITY.teal}
        seed={57}
        t={t}
      />
      <Solar at={[-3.8, roof(3), -1.7]} n={3} />
      <Place at={[-2.45, 0.03, -2.0]} size={[1.5, 0.02, 1.7]} tone={CITY.grass} />
      <CafeTable at={[-2.0, 0.05, -1.5]} />
      <CafeTable at={[-1.5, 0.05, -0.7]} tone={CITY.gold} />
      <Folk at={[-2.35, 0.05, -1.3]} t={t} body="#38bdf8" motion="wave" turn={1.2} seed={2} />
      <Folk at={[-1.7, 0.05, -1.75]} t={t} body="#ff8a3d" motion="cheer" turn={-0.4} seed={5} />
      <Folk
        at={[-1.15, 0.05, -0.55]}
        t={t}
        body="#a78bfa"
        motion="think"
        turn={-1.0}
        seed={8}
        gear={["glasses"]}
      />
      <Folk
        at={[-1.9, 0.05, -0.5]}
        t={t}
        body="#2dd4bf"
        motion="wave"
        turn={1.4}
        seed={11}
        gear={["headset"]}
      />
      <group position={[-2.0, 0.95, -1.4]} scale={0.5}>
        <Bubble />
      </group>
      <group position={[-1.5, 0.95, -0.6]} scale={0.5}>
        <Bubble tone={BLUE} dots={T.paper} />
      </group>
      {/* The square in front: a board of merged work, bikes, the bus stop. */}
      <Billboard at={[-3.9, 0.03, -0.2]} size={[1.3, 0.7]}>
        <Graph cols={9} rows={4} cell={0.1} gap={0.03} seed={29} t={t} />
      </Billboard>
      {[0, 1, 2, 3].map((k) => (
        <Place
          key={k}
          at={[-3.8 + k * 0.24, 0.03, 0.55]}
          size={[0.04, 0.2, 0.34]}
          tone={CITY.steel}
        />
      ))}
      <Folk
        at={[-2.6, 0.03, 0.75]}
        t={t}
        body="#ff7ab6"
        motion="wave"
        turn={0.3}
        seed={14}
        gear={["headset"]}
      />
      <Folk at={[-2.1, 0.03, 0.95]} t={t} body="#39d353" motion="cheer" turn={-0.3} seed={17} />
      <Place at={[-3.9, 0.03, 1.45]} size={[0.05, 0.6, 0.05]} tone={CITY.steel} />
      <Place at={[-2.85, 0.03, 1.45]} size={[0.05, 0.6, 0.05]} tone={CITY.steel} />
      <Place at={[-3.95, 0.63, 1.4]} size={[1.2, 0.05, 0.5]} tone={CITY.blue} />
      <Bench at={[-3.65, 0.03, 1.5]} />
      <Tree at={[-1.45, 0.03, 1.7]} s={0.95} />
      <Hedge at={[-2.45, 0.03, 1.95]} long={1.3} along="x" />

      {/* By the plaza: a lawn, trees and a table. */}
      <Place at={[1.0, 0.03, -2.6]} size={[1.15, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.3, 0.05, -2.3]} s={1.0} />
      <Tree at={[1.85, 0.05, -1.5]} s={0.9} />
      <CafeTable at={[1.4, 0.05, -1.0]} tone={toneOf("#ff7ab6")} />
      <Stall at={[-0.5, 0.03, -2.2]} tone={toneOf("#ff7ab6")} />
    </Block>
  );
}

const NIGHT = toneOf("#232b3d");

/**
 * Night Owl: the block late at night. Towers with most of their windows lit, a sign in lights,
 * the owl on a roof, a roof terrace where someone is still at a screen, a coffee stand, a diner.
 */
function NightOwl({ t }: { t: number }) {
  return (
    <Block
      id="night-owl"
      t={t}
      cars={[CITY.violet, CITY.blue, CITY.red, CITY.teal, CITY.violet]}
      floats={
        <>
          {/* The moon, with a bite out of it. */}
          <Around right={-2.7} up={4.8} t={t} phase={0}>
            <Bit size={[0.76, 0.76, 0.14]} tone={GOLD} />
            <Bit at={[0.22, 0.16, 0.02]} size={[0.44, 0.46, 0.16]} tone={T.navy} />
          </Around>
          <Around right={0.3} up={4.6} t={t} phase={0.3}>
            <Star s={0.18} />
          </Around>
          <Around right={3.2} up={4.3} t={t} phase={0.6}>
            <Star s={0.13} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.8}>
            <Bit size={[0.36, 0.4, 0.36]} tone={T.paper} />
            <Bit at={[0.24, 0, 0]} size={[0.12, 0.2, 0.1]} tone={T.paper} />
            <Spot x={0} y={0.203} z={0} s={0.26} color="#4a3b2e" />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.75}>
            {[0, 1].map((k) => (
              <group
                key={k}
                position={[k * 0.34 - 0.1, k * 0.26 - 0.1, 0]}
                scale={k === 0 ? 1 : 0.7}
              >
                <Bit at={[0, 0.12, 0]} size={[0.3, 0.07, 0.06]} tone={T.paper} />
                <Bit at={[0, 0, 0]} size={[0.1, 0.1, 0.06]} tone={T.paper} />
                <Bit at={[0, -0.12, 0]} size={[0.3, 0.07, 0.06]} tone={T.paper} />
              </group>
            ))}
          </Around>
          <Around right={-3.7} up={2.6} t={t} phase={0.4}>
            <Bit size={[0.8, 0.22, 0.26]} tone={T.navy} />
            <Bit at={[-0.1, 0.18, 0]} size={[0.42, 0.2, 0.26]} tone={T.navy} />
            <Bit at={[0.2, 0.14, 0]} size={[0.26, 0.14, 0.26]} tone={T.navy} />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.45}>
            <Bit size={[0.8, 0.54, 0.08]} tone={T.dark} />
            <group position={[0, 0, 0.045]}>
              <Graph cols={8} rows={4} cell={0.07} gap={0.018} seed={9} t={t} />
            </group>
          </Around>
        </>
      }
    >
      {/* Behind: three towers lit late, the owl on one, a sign in lights on another, the diner. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[1.6, 1.5]}
        floors={9}
        tone={NIGHT}
        seed={61}
        t={t}
        night
      />
      <RoofKit at={[-4.0, roof(9), -4.0]} size={[1.6, 1.5]} seed={61} />
      <IsoOwl t={t} position={[-2.9, roof(9) + 0.07, -2.9]} rotationY={0.6} />
      <Tower
        at={[-2.25, 0.03, -4.0]}
        size={[1.5, 1.4]}
        floors={11}
        tone={toneOf("#1c2a4a")}
        seed={63}
        t={t}
        night
      />
      <Billboard at={[-2.2, roof(11), -2.75]} size={[1.4, 0.6]}>
        <Graph cols={10} rows={3} cell={0.1} gap={0.03} seed={13} t={t} />
      </Billboard>
      <Tower
        at={[-0.6, 0.03, -4.0]}
        size={[1.5, 1.5]}
        floors={8}
        tone={toneOf("#2b2440")}
        seed={65}
        t={t}
        night
      />
      <RoofKit at={[-0.6, roof(8), -4.0]} size={[1.5, 1.5]} seed={65} />
      <Tower
        at={[1.1, 0.03, -4.0]}
        size={[1.05, 1.2]}
        floors={1}
        tone={CITY.red}
        seed={67}
        t={t}
        night
        trim={CITY.white}
      />
      <Place at={[1.2, roof(1), -3.2]} size={[0.85, 0.3, 0.1]} tone={CITY.gold} />
      <Awning at={[1.1, 0.55, -2.8]} long={1.05} tone={CITY.red} />

      {/* Flats, and on their roof someone still at a screen. */}
      <Tower
        at={[-3.95, 0.03, -2.0]}
        size={[1.5, 1.7]}
        floors={5}
        tone={NIGHT}
        seed={69}
        t={t}
        night
      />
      <Place at={[-3.6, roof(5), -1.5]} size={[0.6, 0.22, 0.34]} tone={T.wood} />
      <Place at={[-3.55, roof(5) + 0.22, -1.45]} size={[0.5, 0.34, 0.05]} tone={T.dark} />
      <group position={[-3.3, roof(5) + 0.39, -1.396]}>
        <Graph cols={6} rows={3} cell={0.06} gap={0.016} seed={17} t={t} />
      </group>
      <Folk
        at={[-3.3, roof(5), -0.95]}
        t={t}
        body="#a78bfa"
        motion="groove"
        turn={Math.PI}
        seed={4}
        gear={["glasses"]}
        s={0.3}
      />
      <Lamp at={[-2.3, roof(5), -0.5]} over="x" />
      {/* A coffee stand with a cup on its roof, and a small park under lamps. */}
      <Cabin at={[-2.3, 0.03, -1.6]} tone={CITY.violet} />
      <Place at={[-1.75, 0.71, -1.42]} size={[0.3, 0.32, 0.3]} tone={CITY.white} />
      <Place at={[-1.45, 0.78, -1.34]} size={[0.1, 0.16, 0.1]} tone={CITY.white} />
      <Folk at={[-1.55, 0.03, -0.75]} t={t} body="#38bdf8" motion="think" turn={0.2} seed={9} />
      <Place at={[-3.9, 0.03, 0.0]} size={[2.9, 0.02, 2.05]} tone={CITY.grass} />
      <Tree at={[-3.5, 0.05, 0.4]} s={1.1} />
      <Tree at={[-2.7, 0.05, 1.5]} s={1.0} />
      <Tree at={[-1.5, 0.05, 0.5]} s={0.9} />
      <Bench at={[-3.2, 0.05, 1.3]} />
      <Bench at={[-2.1, 0.05, 0.4]} />
      <Lamp at={[-3.7, 0.05, 1.8]} over="x" />
      <Lamp at={[-2.0, 0.05, 1.2]} over="z" />
      <Lamp at={[-1.2, 0.05, 1.8]} over="x" />
      <Folk at={[-2.75, 0.05, 0.75]} t={t} body="#ff7ab6" motion="wave" turn={0.7} seed={12} />

      {/* By the plaza: a bus shelter lit from inside, trees. */}
      <Place at={[1.0, 0.03, -2.6]} size={[1.15, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.3, 0.05, -2.3]} s={1.0} />
      <Tree at={[1.85, 0.05, -1.5]} s={0.9} />
      <Lamp at={[1.2, 0.05, -1.0]} over="x" />
      <Billboard at={[-0.4, 0.03, -2.25]} size={[1.25, 0.72]}>
        <Graph cols={9} rows={4} cell={0.1} gap={0.03} seed={23} t={t} />
      </Billboard>
    </Block>
  );
}

/**
 * Open Sourcer: a square the whole town uses. A stage with a crowd in every colour, market
 * stalls under bunting, a fountain, a globe on a plinth, a depot of packages, a library.
 */
function OpenSourcer({ t }: { t: number }) {
  const crowd: [number, number, string, number][] = [
    [-2.35, -1.55, "#ff8a3d", 2],
    [-1.85, -1.75, "#38bdf8", 5],
    [-1.35, -1.5, "#ff7ab6", 8],
    [-2.15, -0.95, "#a78bfa", 11],
    [-1.6, -0.9, "#39d353", 14],
    [-1.15, -0.75, "#f5d36b", 17],
  ];
  return (
    <Block
      id="open-sourcer"
      t={t}
      cars={[CITY.teal, CITY.red, CITY.blue, CITY.violet, CITY.teal]}
      floats={
        <>
          <Around right={0.2} up={4.6} t={t} phase={0.1}>
            <Star s={0.2} />
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.4}>
            <Star s={0.15} />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.65}>
            <Heart />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.85}>
            <Bit at={[0, -0.24, 0]} size={[0.2, 0.2, 0.2]} tone={T.green} />
            <Bit at={[0, -0.04, 0]} size={[0.08, 0.2, 0.08]} tone={T.mid} />
            <Bit at={[0, 0.08, 0]} size={[0.5, 0.08, 0.08]} tone={T.mid} />
            <Bit at={[-0.22, 0.26, 0]} size={[0.2, 0.2, 0.2]} tone={T.green} />
            <Bit at={[0.22, 0.26, 0]} size={[0.2, 0.2, 0.2]} tone={T.green} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.25}>
            <Bit size={[0.5, 0.5, 0.5]} tone={BLUE} />
            <Bit at={[-0.08, 0.08, 0.26]} size={[0.24, 0.2, 0.02]} tone={T.green} />
            <Bit at={[0.26, -0.06, 0.06]} size={[0.02, 0.22, 0.22]} tone={T.green} />
            <Spot x={0.06} y={0.253} z={-0.04} s={0.22} color="#3fd45a" />
          </Around>
          <Around right={-3.7} up={2.6} t={t} phase={0.5}>
            <Bit size={[0.62, 0.8, 0.06]} tone={T.paper} />
            {[0.24, 0.1, -0.04, -0.18].map((y, k) => (
              <Bit
                key={y}
                at={[k === 3 ? -0.1 : 0, y, 0.04]}
                size={[k === 3 ? 0.26 : 0.46, 0.05, 0.02]}
                tone={T.mid}
              />
            ))}
            <Bit at={[0.16, -0.28, 0.04]} size={[0.16, 0.16, 0.03]} tone={T.green} />
          </Around>
          <Around right={3.2} up={4.3} t={t} phase={0.75}>
            <Star s={0.12} />
          </Around>
        </>
      }
    >
      {/* Behind: the library, a tower with a heart on it, the depot, the globe on its plinth. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[1.6, 1.5]}
        floors={6}
        tone={toneOf("#1f6f66")}
        seed={71}
        t={t}
      />
      <RoofKit at={[-4.0, roof(6), -4.0]} size={[1.6, 1.5]} seed={71} />
      <Solar at={[-3.7, roof(6), -3.3]} n={3} />
      <Tower
        at={[-2.2, 0.03, -3.95]}
        size={[1.3, 1.2]}
        floors={8}
        tone={toneOf("#30476b")}
        seed={73}
        t={t}
      />
      <Place at={[-1.58, roof(8), -3.4]} size={[0.06, 0.34, 0.06]} tone={CITY.steel} />
      <group position={[-1.55, roof(8) + 0.62, -3.37]} scale={1.2}>
        <Heart />
      </group>
      <Cabin at={[-0.7, 0.03, -3.75]} tone={CITY.teal} />
      <Pallet at={[-0.6, 0.03, -3.0]} rows={3} tone={T.wood} />
      <Pallet at={[0.0, 0.03, -3.0]} rows={2} tone={T.wood} />
      <Place at={[1.25, 0.03, -3.8]} size={[0.8, 0.3, 0.8]} tone={CITY.concrete} />
      <Place at={[1.35, 0.33, -3.7]} size={[0.6, 0.6, 0.6]} tone={CITY.blue} />
      <PaneZ at={[1.55, 0.7, -3.096]} size={[0.26, 0.22]} color="#2ea043" />
      <PaneX at={[1.954, 0.56, -3.5]} size={[0.24, 0.2]} color="#2ea043" />
      <PaneZ at={[1.82, 0.5, -3.096]} size={[0.14, 0.12]} color="#2ea043" />

      {/* The stage, its board of stars, and the crowd. */}
      <Place at={[-3.9, 0.03, -2.0]} size={[1.3, 0.24, 2.0]} tone={T.dark} />
      <PaneX at={[-2.596, 0.2, -1.0]} size={[1.96, 0.035]} color={LIT} />
      <Billboard at={[-3.85, 0.27, -1.98]} size={[1.2, 0.8]}>
        <Graph cols={9} rows={5} cell={0.095} gap={0.028} seed={31} t={t} />
      </Billboard>
      <Folk
        at={[-3.25, 0.27, -0.9]}
        t={t}
        body="#2dd4bf"
        motion="cheer"
        turn={1.2}
        seed={3}
        gear={["scarf"]}
        s={0.4}
      />
      {crowd.map(([x, z, body, seed]) => (
        <Folk
          key={body}
          at={[x, 0.03, z]}
          t={t}
          body={body}
          motion={seed % 2 === 0 ? "cheer" : "wave"}
          turn={-1.6}
          seed={seed}
        />
      ))}
      {/* The market: stalls under bunting, and the fountain. */}
      <Stall at={[-3.85, 0.03, 0.45]} tone={CITY.red} />
      <Stall at={[-3.05, 0.03, 0.45]} tone={CITY.blue} />
      <Stall at={[-2.25, 0.03, 0.45]} tone={CITY.gold} />
      <Stall at={[-3.85, 0.03, 1.4]} tone={CITY.teal} />
      <Stall at={[-3.05, 0.03, 1.4]} tone={CITY.violet} />
      <Bunting at={[-3.9, 0.03, 1.15]} long={2.4} />
      <Fountain at={[-1.85, 0.03, 1.05]} t={t} />
      <Folk at={[-2.6, 0.03, 1.1]} t={t} body="#ff7ab6" motion="wave" turn={0.4} seed={20} />
      <Folk at={[-1.2, 0.03, 0.35]} t={t} body="#38bdf8" motion="think" turn={2.4} seed={23} />

      {/* By the plaza: a lawn, trees, a bench. */}
      <Place at={[1.0, 0.03, -2.6]} size={[1.15, 0.02, 1.9]} tone={CITY.grass} />
      <Tree at={[1.3, 0.05, -2.3]} s={1.0} />
      <Tree at={[1.85, 0.05, -1.5]} s={0.9} />
      <Bench at={[1.3, 0.05, -1.0]} />
      <Bunting at={[-0.5, 0.03, -2.2]} long={1.3} tall={0.8} />
    </Block>
  );
}

function Letter({ t }: { t: number }) {
  return (
    <>
      <Room />
      {/* A writing desk: sheets, a pen, the sealed envelope, a lamp. */}
      <Table at={[-1.9, 0, -1.6]} size={[2.2, 0.76, 0.9]} />
      <Place at={[-1.6, 0.76, -1.4]} size={[0.55, 0.02, 0.7]} tone={T.paper} />
      <IsoBox
        size={[0.55, 0.02, 0.7]}
        position={[-1.15, 0.79, -1.0]}
        rotation={[0, 0.2, 0]}
        tone={T.paper}
      />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`ln${i}`}
          position={[-1.15, 0.801, -1.22 + i * 0.12]}
          rotation={[-Math.PI / 2, 0, 0.2]}
        >
          <planeGeometry args={[0.38, 0.02]} />
          <Flat color="#8b949e" />
        </mesh>
      ))}
      <IsoBox
        size={[0.04, 0.04, 0.4]}
        position={[-0.75, 0.8, -0.95]}
        rotation={[0, 0.6, 0]}
        tone={T.navy}
      />
      <Place at={[-0.55, 0.76, -1.45]} size={[0.6, 0.06, 0.42]} tone={T.paper} />
      <Spot x={-0.25} y={0.825} z={-1.24} s={0.12} />
      <Place at={[0.05, 0.76, -1.5]} size={[0.18, 0.04, 0.18]} tone={T.dark} />
      <Place at={[0.12, 0.8, -1.45]} size={[0.04, 0.4, 0.04]} tone={T.mid} />
      <Place at={[0.05, 1.16, -1.48]} size={[0.26, 0.1, 0.16]} tone={T.mid} />
      {/* A post box by the wall, and a shelf of envelopes. */}
      <Place at={[1.2, 0, -1.65]} size={[0.6, 1.0, 0.5]} tone={RED} />
      <Place at={[1.3, 0.7, -1.14]} size={[0.4, 0.06, 0.02]} tone={T.dark} />
      <Place at={[-2.18, 0.9, -0.2]} size={[0.4, 0.06, 1.4]} tone={T.wood} />
      {[0, 1, 2, 3].map((i) => (
        <Place
          key={`env${i}`}
          at={[-2.1, 0.96, -0.1 + i * 0.32]}
          size={[0.3, 0.2, 0.26]}
          tone={T.paper}
        />
      ))}
      <Plant at={[1.75, 0, 1.2]} />
      <Rug at={[-0.6, 0, -0.4]} size={[1.8, 1.6]} />
      <IsoCell
        look={CELL}
        motion="think"
        t={t}
        position={[-0.4, 0.02, 0.35]}
        rotationY={-0.4}
        scale={0.8}
      />
      {/* The carrier bird, waiting for the letter. */}
      <IsoCritter
        t={t}
        position={[0.9, 0.02, 0.6]}
        rotationY={-0.8}
        tone={T.paper}
        belly={T.cream}
        ears="pointed"
        hop
      />
    </>
  );
}

function Privacy({ t }: { t: number }) {
  const blink = Math.floor((t % 2) * 4) % 2 === 0;
  return (
    <>
      <Room />
      {/* The vault: a heavy door with a lit wheel. */}
      <Place at={[-2.05, 0, -1.65]} size={[1.6, 1.6, 1.3]} tone={T.dark} />
      <Place at={[-0.45, 0.25, -1.4]} size={[0.04, 1.1, 0.8]} tone={T.mid} />
      <mesh position={[-0.405, 0.8, -1.0]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.18, 0.24, 32]} />
        <Flat color={LIT} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`sp${i}`}
          position={[-0.404, 0.8, -1.0]}
          rotation={[0, Math.PI / 2, (i * Math.PI) / 3]}
        >
          <planeGeometry args={[0.04, 0.42]} />
          <Flat color={LIT} />
        </mesh>
      ))}
      {/* A server rack whose lights blink, a shield on the wall, a key on a hook. */}
      <Place at={[0.3, 0, -1.65]} size={[0.6, 1.4, 0.55]} tone={T.dark} />
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={`srv${i}`}>
          <Place at={[0.35, 0.12 + i * 0.25, -1.1]} size={[0.5, 0.18, 0.02]} tone={T.mid} />
          <mesh position={[0.45, 0.21 + i * 0.25, -1.077]}>
            <planeGeometry args={[0.04, 0.04]} />
            <Flat color={(i + (blink ? 1 : 0)) % 2 === 0 ? LIT : GREENS[0]} />
          </mesh>
        </group>
      ))}
      <Place at={[1.2, 0.85, Z0 + 0.12]} size={[0.5, 0.6, 0.04]} tone={T.greenDeep} />
      <mesh position={[1.45, 1.15, Z0 + 0.163]}>
        <planeGeometry args={[0.18, 0.22]} />
        <Flat color="#7ee787" />
      </mesh>
      <Place at={[-2.18, 0.95, 0.3]} size={[0.04, 0.04, 0.2]} tone={T.mid} />
      <Place at={[-2.17, 0.7, 0.35]} size={[0.03, 0.25, 0.1]} tone={GOLD} />
      <Plant at={[1.75, 0, 1.15]} />
      <Rug at={[-0.5, 0, 0.0]} size={[1.8, 1.4]} tone={T.dark} />
      <IsoCell
        look={CELL}
        motion="proud"
        t={t}
        position={[0.35, 0.02, 0.6]}
        rotationY={0.2}
        scale={0.8}
      />
      {/* A cat asleep on the rug. */}
      <IsoCritter
        t={0}
        position={[-0.9, 0.02, 0.7]}
        rotationY={0.4}
        tone={T.mid}
        belly={T.paper}
        ears="pointed"
      />
    </>
  );
}

/** The close: the whole sample year as a city on a long slab, Cell crowned on a stage. */
function Closing({ t }: { t: number }) {
  const city = buildCity(sampleRecap);
  const levels = heatLevels(city.plots);
  const tile = 0.2;
  const cols = Math.max(...city.plots.map((p) => p.col)) + 1;
  const ox = (-cols * tile) / 2;
  const oz = (-7 * tile) / 2;
  const front = oz + 7 * tile;
  const bursts: V3[] = [
    [-2.5, 2.2, -0.5],
    [2.8, 2.6, -0.8],
    [0.8, 3.0, -1.2],
  ];
  return (
    <>
      <Place
        at={[ox - 0.25, -0.3, oz - 0.25]}
        size={[cols * tile + 0.5, 0.3, 7 * tile + 0.5]}
        tone={T.floor}
      />
      <mesh position={[0, -0.08, front + 0.253]}>
        <planeGeometry args={[cols * tile + 0.44, 0.03]} />
        <Flat color={LIT} />
      </mesh>
      {city.plots.map((p) => {
        const active = p.state === "active";
        const h = active ? plotHeight(p, city.maxCount) * 0.09 + 0.03 : 0.02;
        const level = Math.min(3, Math.max(0, (levels[p.index] ?? 1) - 1));
        const tone: Tone =
          p.index === city.busiestIndex
            ? T.green
            : active
              ? {
                  top: GREENS[level] ?? LIT,
                  left: T.dark.left,
                  right: T.dark.right,
                  edge: T.dark.edge,
                }
              : T.dark;
        return (
          <Place
            key={p.index}
            at={[ox + p.col * tile + 0.02, 0, oz + p.row * tile + 0.02]}
            size={[tile - 0.04, h, tile - 0.04]}
            tone={tone}
            edges={active}
          />
        );
      })}
      <Place at={[-0.9, -0.3, front + 0.5]} size={[1.8, 0.3, 1.1]} tone={T.dark} />
      <IsoCell
        look={{ ...CELL, eyes: "happy", gear: ["crown"] }}
        motion="proud"
        t={t}
        position={[0, 0, front + 1.05]}
        rotationY={0.3}
        scale={0.7}
      />
      {bursts.map(([x, y, z], i) => {
        const burst = ((t + i * 0.6) % 2) / 2;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
          <group key={`fw${i}`} position={[x, y, z]} scale={0.4 + burst}>
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k / 8) * Math.PI * 2;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
                <mesh key={k} position={[Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0]}>
                  <boxGeometry args={[0.06, 0.06, 0.06]} />
                  <Flat color={[GREENS[3], "#e3b341", "#ff7ab6"][i] ?? LIT} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

/** The scene for a diorama id, drawn at time `t` (seconds, looping every two). */
export function dioramaScene(id: DioramaId, t: number): ReactNode {
  switch (id) {
    case "skin-builder":
      return <Builder t={t} />;
    case "skin-consistent":
      return <Consistent t={t} />;
    case "skin-explorer":
      return <Explorer t={t} />;
    case "skin-collaborator":
      return <Collaborator t={t} />;
    case "skin-night-owl":
      return <NightOwl t={t} />;
    case "skin-open-sourcer":
      return <OpenSourcer t={t} />;
    case "iso-letter":
      return <Letter t={t} />;
    case "iso-privacy":
      return <Privacy t={t} />;
    case "iso-closing":
      return <Closing t={t} />;
  }
}
