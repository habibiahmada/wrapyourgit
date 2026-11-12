import type { ArchetypeId } from "@wyg/schema";
import type { ReactNode } from "react";
import {
  Around,
  Bit,
  BLUE,
  Block,
  Bubble,
  Folk,
  GOLD,
  Heart,
  ORANGE,
  RED,
  roof,
  Spot,
  Star,
} from "./block";
import {
  Awning,
  Barrier,
  Bench,
  Billboard,
  Bleachers,
  Bunting,
  Cabin,
  Table as CafeTable,
  Campfire,
  C as CITY,
  ClockFace,
  Cone,
  Crane,
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
  RoofKit,
  Scaffold,
  Solar,
  Stall,
  Tent,
  Tower,
  Tree,
} from "./city";
import { IsoOwl, toneOf } from "./IsoCell";
import { Flat, Graph, LIT, Place, T, type Tone, type V3 } from "./isokit";
import { Closing, Letter, Privacy } from "./landing";

/*
 * The isometric art (ADR-0021, ADR-0022). Each archetype's `skin-*` is a dense city block built
 * from the kit in city.tsx on the island of block.tsx: Cell, large, in that archetype's look on
 * the plaza in the middle, turned to the camera and doing its motion; the district of its rule
 * round it (a building site, a running track, a mountain and a lake, ...) with roads, traffic,
 * trees and small Cells; and the things of its rule floating round Cell, never in front of it.
 * The landing's letter, privacy and closing pictures are in landing.tsx. Busy but tidy: objects
 * never cross, and green light marks the one thing that matters. The camera is at +x, +y, +z.
 */

export type DioramaId = `skin-${ArchetypeId}` | "iso-letter" | "iso-privacy" | "iso-closing";

/** The landing-only dioramas; the archetypes' are baked as `skin-*` (ArtStill). */
export const DIORAMA_IDS = ["iso-letter", "iso-privacy", "iso-closing"] as const;
export type LandingDioramaId = (typeof DIORAMA_IDS)[number];

/** A whole city block with Cell in its middle: corner to corner, and up to its tallest roof. */
export const BLOCK_FRAMING = { look: [0, 1.55, 0] as V3, span: 13.8 };

/** What the camera looks at and how many units fit across the frame, per landing diorama. */
export const DIORAMA_FRAMING: Record<LandingDioramaId, { look: V3; span: number }> = {
  "iso-letter": BLOCK_FRAMING,
  "iso-privacy": BLOCK_FRAMING,
  // The year's island is long and the frame wide: from its far end to the stage's near corner.
  "iso-closing": { look: [-0.3, 0.35, 0.3], span: 16.2 },
};

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
