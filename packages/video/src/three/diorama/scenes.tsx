import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import { archetypeRole } from "../../cast";
import { sampleRecap } from "../../fixtures/sample-recap";
import { heatLevels } from "../../heat";
import { buildCity, plotHeight } from "../../world/city";
import type { Look } from "../pose";
import { IsoCell, IsoCritter, IsoOwl, toneOf } from "./IsoCell";
import { Flat, GREENS, Graph, IsoBox, LIT, Place, T, type Tone, type V3 } from "./isokit";

/*
 * The isometric dioramas (ADR-0021): each archetype's `skin-*` art is the place its rule happens,
 * with Cell in that archetype's look doing its motion and a companion; the landing's letter,
 * privacy and closing get scenes of their own. Busy but tidy: objects never cross, and green
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

/** A monitor facing +z with a lit contribution graph on its screen; `at` is its back corner. */
function Monitor({ at, t, seed }: { at: V3; t: number; seed: number }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x + 0.3, y, z + 0.05]} size={[0.3, 0.03, 0.2]} tone={T.dark} />
      <Place at={[x + 0.42, y + 0.03, z + 0.08]} size={[0.06, 0.22, 0.05]} tone={T.dark} />
      <Place at={[x, y + 0.22, z]} size={[0.9, 0.55, 0.05]} tone={T.dark} />
      <group position={[x + 0.45, y + 0.495, z + 0.053]}>
        <Graph cols={11} rows={6} cell={0.055} gap={0.018} seed={seed} t={t} />
      </group>
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

function Builder({ t }: { t: number }) {
  const r = archetypeRole("builder");
  const tools: [number, number, number, number][] = [
    [-1.45, 1.35, 0.06, 0.3],
    [-1.2, 1.2, 0.3, 0.06],
    [-0.85, 1.3, 0.06, 0.4],
    [-0.6, 1.0, 0.25, 0.1],
    [-0.3, 1.25, 0.06, 0.35],
  ];
  return (
    <>
      <Room />
      {/* Pegboard of tools on the back wall. */}
      <Place at={[-1.6, 0.8, Z0 + 0.12]} size={[1.7, 0.9, 0.04]} tone={T.wood} />
      {tools.map(([x, y, w, h]) => (
        <Place key={`${x}${y}`} at={[x, y, Z0 + 0.16]} size={[w, h, 0.03]} tone={T.mid} />
      ))}
      {/* Workbench with a half-built repository on it. */}
      <Table at={[-2.0, 0, -1.55]} size={[1.9, 0.78, 0.8]} />
      <Place at={[-1.85, 0.78, -1.4]} size={[0.5, 0.3, 0.45]} tone={T.greenDeep} />
      <Place at={[-1.78, 1.08, -1.33]} size={[0.36, 0.24, 0.32]} tone={T.green} />
      <Place at={[-1.2, 0.78, -1.45]} size={[0.6, 0.06, 0.15]} tone={T.paper} />
      {/* Crates of new repositories, the newest one lit. */}
      <Place at={[0.9, 0, -1.6]} size={[0.6, 0.5, 0.6]} tone={T.wood} />
      <Place at={[1.55, 0, -1.6]} size={[0.6, 0.5, 0.6]} tone={T.wood} />
      <Place at={[1.0, 0.5, -1.5]} size={[0.5, 0.42, 0.5]} tone={T.wood} />
      <Place at={[1.6, 0.5, -1.55]} size={[0.5, 0.42, 0.5]} tone={T.green} />
      <Spot x={1.85} y={0.925} z={-1.3} s={0.3} color="#7ee787" />
      <Place at={[1.6, 0, -0.85]} size={[0.5, 0.4, 0.5]} tone={T.wood} />
      <Plant at={[-2.05, 0, 1.15]} />
      <Rug at={[-0.6, 0, -0.3]} size={[1.9, 1.6]} tone={T.dark} />
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[0.0, 0.02, 0.4]}
        rotationY={-0.25}
        scale={0.82}
      />
      {/* The beaver, bringing a plank. */}
      <IsoCritter t={t} position={[1.3, 0, 0.75]} rotationY={-0.9} tone={T.owl} belly={T.cream} />
      <Place at={[1.0, 0.0, 1.2]} size={[0.8, 0.05, 0.16]} tone={T.wood} />
    </>
  );
}

function Consistent({ t }: { t: number }) {
  const r = archetypeRole("consistent");
  const track: Tone = { top: "#c4553a", left: "#a3442e", right: "#843724", edge: "#d97a62" };
  const lanes = [Z0 + 0.2, D / 2 - 1.1];
  const lit = Math.floor(((t % 2) / 2) * 7);
  return (
    <>
      <Room
        walls={false}
        floor={{ top: "#1f6f38", left: "#18592d", right: "#124523", edge: "#2ea043" }}
      />
      {lanes.map((z) => (
        <group key={z}>
          <Place at={[X0 + 0.2, 0, z]} size={[W - 0.4, 0.04, 0.9]} tone={track} />
          {[0.3, 0.6].map((dz) => (
            <mesh key={dz} position={[0, 0.042, z + dz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[W - 0.4, 0.025]} />
              <Flat color="#f0f6fc" />
            </mesh>
          ))}
        </group>
      ))}
      {/* The streak board: the week lights up day by day. */}
      <Place at={[-1.2, 0, -0.55]} size={[0.08, 1.2, 0.08]} tone={T.dark} />
      <Place at={[1.0, 0, -0.55]} size={[0.08, 1.2, 0.08]} tone={T.dark} />
      <Place at={[-1.25, 0.75, -0.6]} size={[2.35, 0.55, 0.06]} tone={T.dark} />
      {Array.from({ length: 7 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
        <mesh key={`d${i}`} position={[-1.0 + i * 0.3, 1.02, -0.537]}>
          <planeGeometry args={[0.22, 0.22]} />
          <Flat color={i <= lit ? GREENS[3] : GREENS[0]} />
        </mesh>
      ))}
      {[-1.6, -0.6, 0.6, 1.6].map((x) => (
        <Place key={x} at={[x, 0.04, 0.05]} size={[0.16, 0.22, 0.16]} tone={ORANGE} />
      ))}
      <Place at={[1.85, 0.04, -1.2]} size={[0.12, 0.3, 0.12]} tone={BLUE} />
      <Place at={[2.0, 0.04, 1.2]} size={[0.05, 1.0, 0.05]} tone={T.paper} />
      <Place at={[2.03, 0.72, 1.2]} size={[0.02, 0.26, 0.42]} tone={T.green} />
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[-0.3, 0.04, 1.15]}
        rotationY={1.57}
        scale={0.82}
      />
      <IsoCritter
        t={t}
        position={[-1.35, 0.04, 1.05]}
        rotationY={1.57}
        tone={{ top: "#d9a066", left: "#c08550", right: "#9d6a3c", edge: "#e8bd8f" }}
        ears="pointed"
        hop
      />
    </>
  );
}

function Explorer({ t }: { t: number }) {
  const r = archetypeRole("explorer");
  const rock: Tone = { top: "#57606a", left: "#484f58", right: "#3a4048", edge: "#6e7781" };
  const snow: Tone = { top: "#f0f6fc", left: "#d0d7de", right: "#afb8c1", edge: "#ffffff" };
  const steps = [T.greenDeep, T.greenDeep, T.green, T.green];
  return (
    <>
      <Room
        walls={false}
        floor={{ top: "#2b4a2f", left: "#223c26", right: "#1a2f1e", edge: "#3b6b41" }}
      />
      {/* Stepped mountains, snow on top, a flag on the summit. */}
      <Place at={[-2.2, 0, -1.7]} size={[1.8, 0.7, 1.4]} tone={rock} />
      <Place at={[-1.95, 0.7, -1.55]} size={[1.3, 0.6, 1.0]} tone={rock} />
      <Place at={[-1.7, 1.3, -1.4]} size={[0.8, 0.45, 0.6]} tone={snow} />
      <Place at={[-1.36, 1.75, -1.12]} size={[0.04, 0.5, 0.04]} tone={T.paper} />
      <Place at={[-1.33, 2.0, -1.12]} size={[0.32, 0.2, 0.02]} tone={T.green} />
      <Place at={[0.2, 0, -1.7]} size={[1.2, 0.5, 1.0]} tone={rock} />
      <Place at={[0.4, 0.5, -1.55]} size={[0.7, 0.35, 0.6]} tone={snow} />
      {/* Stepping tiles, one per language, getting brighter. */}
      {steps.map((tone, i) => (
        <Place
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
          key={`st${i}`}
          at={[-0.6 + i * 0.55, 0, 0.9 - i * 0.55]}
          size={[0.42, 0.06 + i * 0.05, 0.42]}
          tone={tone}
        />
      ))}
      {/* Tent, signpost, a pine. */}
      {/* A stepped tent with its door facing us. */}
      <Place at={[1.1, 0, 0.5]} size={[0.9, 0.3, 0.8]} tone={ORANGE} />
      <Place at={[1.25, 0.3, 0.5]} size={[0.6, 0.22, 0.8]} tone={ORANGE} />
      <Place at={[1.4, 0.52, 0.5]} size={[0.3, 0.16, 0.8]} tone={ORANGE} />
      <mesh position={[1.55, 0.2, 1.302]}>
        <planeGeometry args={[0.26, 0.38]} />
        <Flat color="#5a2a0f" />
      </mesh>
      <Place at={[-1.9, 0, 1.0]} size={[0.06, 0.9, 0.06]} tone={T.wood} />
      <Place at={[-1.95, 0.7, 0.85]} size={[0.5, 0.12, 0.04]} tone={T.wood} />
      <Place at={[-1.75, 0.5, 0.85]} size={[0.5, 0.12, 0.04]} tone={T.wood} />
      <Place at={[1.6, 0, -0.6]} size={[0.14, 0.3, 0.14]} tone={T.wood} />
      <Place at={[1.47, 0.3, -0.73]} size={[0.4, 0.35, 0.4]} tone={T.leaf} />
      <Place at={[1.54, 0.65, -0.66]} size={[0.26, 0.3, 0.26]} tone={T.leaf} />
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[0.15, 0.06, 0.95]}
        rotationY={0.2}
        scale={0.82}
      />
      <IsoCritter
        t={t}
        position={[-0.9, 0, 1.35]}
        rotationY={0.5}
        tone={{ top: "#f0883e", left: "#db6d28", right: "#b85a1f", edge: "#ffa657" }}
        ears="pointed"
      />
    </>
  );
}

function Collaborator({ t }: { t: number }) {
  const r = archetypeRole("collaborator");
  const mate: Look = { ...CELL, body: "#58a6ff" };
  const notes: [number, number, string][] = [
    [-1.75, 1.35, "#f0883e"],
    [-1.35, 1.0, "#39d353"],
    [-0.85, 1.35, "#79c0ff"],
    [-0.35, 1.0, "#ff7ab6"],
    [0.1, 1.3, "#e3b341"],
  ];
  const lift = 0.05 * Math.sin(Math.PI * t);
  return (
    <>
      <Room />
      {/* The shared board: sticky notes linked by arrows. */}
      <Place at={[-1.9, 0.75, Z0 + 0.12]} size={[2.4, 0.95, 0.04]} tone={T.paper} />
      {notes.map(([x, y, c]) => (
        <mesh key={`${x}${y}`} position={[x + 0.12, y + 0.12, Z0 + 0.163]}>
          <planeGeometry args={[0.24, 0.24]} />
          <Flat color={c} />
        </mesh>
      ))}
      {[-1.4, -0.9, -0.4].map((x) => (
        <mesh key={`ar${x}`} position={[x, 1.3, Z0 + 0.164]}>
          <planeGeometry args={[0.18, 0.025]} />
          <Flat color="#57606a" />
        </mesh>
      ))}
      <Table at={[-1.6, 0, -0.95]} size={[1.1, 0.74, 0.6]} />
      <Monitor at={[-1.5, 0.74, -0.9]} t={t} seed={4} />
      <Table at={[0.6, 0, -0.95]} size={[1.1, 0.74, 0.6]} />
      <Monitor at={[0.7, 0.74, -0.9]} t={t} seed={9} />
      <Plant at={[1.85, 0, -1.65]} />
      <Rug at={[-1.5, 0, 0.0]} size={[3.0, 1.5]} tone={T.dark} />
      {/* Cell hands a pull request to a teammate. */}
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[-0.75, 0.02, 0.75]}
        rotationY={0.9}
        scale={0.78}
      />
      <IsoCell
        look={mate}
        motion="wave"
        t={t}
        seed={2}
        position={[0.75, 0.02, 0.7]}
        rotationY={0.15}
        scale={0.74}
      />
      <IsoBox size={[0.34, 0.04, 0.24]} position={[0, 0.98 + lift, 0.72]} tone={T.paper} />
      <Spot x={0} y={1.001 + lift} z={0.72} s={0.1} color={toneOf("#58a6ff").left} />
    </>
  );
}

function NightOwl({ t }: { t: number }) {
  const r = archetypeRole("night-owl");
  const books = [T.greenDeep, T.mid, T.navy, T.wood, T.greenDeep, T.mid];
  const stars: [number, number][] = [
    [0.45, 1.5],
    [0.75, 1.1],
    [1.5, 0.95],
    [0.35, 0.95],
  ];
  return (
    <>
      <Room />
      {/* Window in the back wall: night outside, the moon, a few stars. */}
      <Place at={[0.2, 0.75, Z0 + 0.11]} size={[1.5, 0.95, 0.03]} tone={T.navy} />
      <mesh position={[1.25, 1.42, Z0 + 0.145]}>
        <circleGeometry args={[0.15, 32]} />
        <Flat color="#e6ffe9" />
      </mesh>
      {stars.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, Z0 + 0.145]}>
          <planeGeometry args={[0.035, 0.035]} />
          <Flat color="#c9f7d0" />
        </mesh>
      ))}
      <Table at={[-2.0, 0, -1.62]} size={[2.0, 0.78, 0.82]} />
      <Monitor at={[-1.55, 0.78, -1.47]} t={t} seed={7} />
      <Place at={[-0.62, 0.78, -1.5]} size={[0.18, 0.04, 0.18]} tone={T.dark} />
      <Place at={[-0.55, 0.82, -1.45]} size={[0.04, 0.4, 0.04]} tone={T.mid} />
      <Place at={[-0.62, 1.18, -1.48]} size={[0.26, 0.1, 0.16]} tone={T.mid} />
      <mesh position={[-0.55, 0.785, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshBasicMaterial color="#c8ffd2" transparent opacity={0.14} toneMapped={false} />
      </mesh>
      <Place at={[-0.3, 0.78, -1.1]} size={[0.12, 0.14, 0.12]} tone={T.paper} />
      <Place at={[-1.3, 0.42, -0.6]} size={[0.55, 0.06, 0.5]} tone={T.mid} />
      <Place at={[-1.3, 0.48, -0.65]} size={[0.55, 0.5, 0.06]} tone={T.mid} />
      <Place at={[-1.05, 0, -0.38]} size={[0.06, 0.42, 0.06]} tone={T.dark} />
      <Place at={[-2.18, 0, 0.0]} size={[0.42, 1.3, 1.1]} tone={T.dark} />
      {books.map((tone, i) => (
        <Place
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
          key={`bk${i}`}
          at={[-1.77, i < 3 ? 0.12 : 0.68, 0.08 + (i % 3) * 0.32]}
          size={[0.04, 0.42 - (i % 2) * 0.08, 0.24]}
          tone={tone}
        />
      ))}
      <IsoOwl t={t} position={[-1.97, 1.3, 0.55]} rotationY={0.7} />
      <Rug at={[-0.1, 0, -0.1]} size={[1.7, 1.5]} />
      <Plant at={[1.6, 0, -1.6]} />
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[0.75, 0.02, 0.65]}
        rotationY={0.35}
        scale={0.78}
      />
    </>
  );
}

function OpenSourcer({ t }: { t: number }) {
  const r = archetypeRole("open-sourcer");
  const friends: { c: string; p: V3; s: number }[] = [
    { c: "#ff7ab6", p: [-1.2, 0.02, 0.8], s: 1 },
    { c: "#58a6ff", p: [0.15, 0.02, 1.15], s: 2 },
    { c: "#e3b341", p: [1.4, 0.02, 0.6], s: 3 },
  ];
  return (
    <>
      <Room />
      {/* A mural of the community's year across the back wall. */}
      <Place at={[-1.95, 0.55, Z0 + 0.12]} size={[3.0, 1.05, 0.04]} tone={T.dark} />
      <group position={[-0.45, 1.075, Z0 + 0.163]}>
        <Graph cols={22} rows={7} cell={0.1} gap={0.03} seed={11} t={t} />
      </group>
      {/* A low stage with a lit edge; stars the projects earned on a board. */}
      <Place at={[-1.2, 0, -1.0]} size={[2.4, 0.18, 1.0]} tone={T.dark} />
      <mesh position={[0, 0.12, 0.003]}>
        <planeGeometry args={[2.36, 0.03]} />
        <Flat color={LIT} />
      </mesh>
      <Place at={[-2.18, 0, 0.3]} size={[0.06, 1.2, 1.2]} tone={T.paper} />
      {[0.5, 0.85, 1.2].flatMap((z, i) =>
        [0.45, 0.85].map((y) => (
          <IsoBox
            key={`${z}${y}`}
            size={[0.06, 0.16, 0.16]}
            position={[-2.1, y + (i % 2) * 0.1, z]}
            rotation={[Math.PI / 4, 0, 0]}
            tone={GOLD}
          />
        )),
      )}
      <Plant at={[1.7, 0, -1.6]} />
      <IsoCell
        look={r.look}
        motion={r.motion}
        t={t}
        position={[0, 0.18, -0.5]}
        rotationY={0.3}
        scale={0.74}
      />
      {friends.map(({ c, p, s }) => (
        <IsoCell
          key={c}
          look={{ ...CELL, body: c, eyes: "happy" }}
          motion="cheer"
          t={t}
          seed={s}
          position={p}
          rotationY={0.5}
          scale={0.5}
        />
      ))}
    </>
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
