import type { ReactNode } from "react";
import { sampleRecap } from "../../fixtures/sample-recap";
import { heatLevels } from "../../heat";
import { buildCity, plotHeight } from "../../world/city";
import {
  Around,
  Bit,
  BLUE,
  Block,
  Bubble,
  CELL,
  Float,
  Folk,
  GOLD,
  Heart,
  RED,
  roof,
  Sparkles,
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
  Car,
  C as CITY,
  Fence,
  Floodlight,
  Fountain,
  Hedge,
  hash,
  Lamp,
  Pallet,
  PaneX,
  PaneY,
  PaneZ,
  RoofKit,
  Solar,
  Stall,
  Tower,
  Tree,
} from "./city";
import { IsoCell, IsoCritter, toneOf } from "./IsoCell";
import { Flat, GREENS, Graph, IsoBox, LIT, Mover, Place, T, type Tone, type V3 } from "./isokit";

/*
 * The landing's own pictures (ADR-0022): the letter and privacy sections each get a city block
 * like the archetypes' (block.tsx), and the page closes on the whole sample year as a city with
 * the story's train running along it. Nothing floats in front of Cell in any of them.
 */

const CARD = toneOf("#c8a57a");
const PINK = toneOf("#ff7ab6");

/** An envelope seen from its front: the flap's two edges meet at a green seal. */
function Envelope({ w = 0.7, tone = T.paper }: { w?: number; tone?: Tone }) {
  const h = w * 0.64;
  return (
    <>
      <Bit size={[w, h, 0.1]} tone={tone} />
      {[0, 1, 2, 3].flatMap((k) =>
        [-1, 1].map((side) => (
          <Bit
            key={`${k}${side}`}
            at={[side * (w / 2 - ((k + 0.5) * w) / 8), h / 2 - ((k + 0.5) * h) / 8, 0.06]}
            size={[w / 8, h / 10, 0.02]}
            tone={CITY.steel}
          />
        )),
      )}
      <Bit at={[0, -h / 16, 0.07]} size={[w * 0.17, w * 0.17, 0.03]} tone={T.green} />
    </>
  );
}

/** A quill: the feather, its spine and a gold nib, leaning. */
function Quill() {
  return (
    <group rotation={[0, 0, -0.5]}>
      <Bit at={[0, 0.16, 0]} size={[0.18, 0.56, 0.06]} tone={T.paper} />
      <Bit at={[0, 0.16, 0.04]} size={[0.03, 0.56, 0.02]} tone={CITY.steel} />
      <Bit at={[0, -0.22, 0]} size={[0.07, 0.2, 0.06]} tone={T.navy} />
      <Bit at={[0, -0.37, 0]} size={[0.04, 0.1, 0.04]} tone={GOLD} />
    </group>
  );
}

/** A postage stamp: a green picture in a paper frame. */
function Stamp() {
  return (
    <>
      <Bit size={[0.5, 0.58, 0.06]} tone={T.paper} />
      <Bit at={[0, 0, 0.04]} size={[0.38, 0.46, 0.03]} tone={T.green} />
      <Bit at={[0, 0.02, 0.06]} size={[0.14, 0.14, 0.02]} tone={T.paper} />
    </>
  );
}

/** A pillar box: red, capped, a slot on both faces the camera sees. */
function PostBox({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[0.3, 0.5, 0.3]} tone={RED} />
      <Place at={[x - 0.02, y + 0.5, z - 0.02]} size={[0.34, 0.07, 0.34]} tone={RED} />
      <PaneZ at={[x + 0.15, y + 0.39, z + 0.304]} size={[0.18, 0.04]} color="#161b22" />
      <PaneX at={[x + 0.304, y + 0.39, z + 0.15]} size={[0.18, 0.04]} color="#161b22" />
      <PaneZ at={[x + 0.15, y + 0.2, z + 0.304]} size={[0.13, 0.1]} color="#f0f6fc" />
    </>
  );
}

/** The letter itself, as a monument: a sheet on a plinth, its lines and a green seal. */
function Sheet({ at, w = 1.3, h = 1.7 }: { at: V3; w?: number; h?: number }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x - 0.1, y, z - 0.1]} size={[w + 0.2, 0.12, 0.34]} tone={T.dark} />
      <Place at={[x, y + 0.12, z]} size={[w, h, 0.1]} tone={T.paper} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const short = i % 3 === 2;
        const long = short ? w * 0.46 : w * 0.76;
        return (
          <PaneZ
            key={i}
            at={[x + w * 0.12 + long / 2, y + 0.12 + h - 0.24 - i * 0.17, z + 0.104]}
            size={[long, 0.05]}
            color={i === 0 ? "#2ea043" : "#8b949e"}
          />
        );
      })}
      <PaneZ at={[x + w - 0.26, y + 0.34, z + 0.104]} size={[0.2, 0.2]} color={LIT} />
    </>
  );
}

/**
 * Letter: the post office's block. The post office with an envelope on its roof, the sorting
 * depot with parcels and vans in its yard, a row of pillar boxes with small Cells queuing, the
 * letter itself as a monument, carrier birds, and Cell on the plaza thinking it over.
 */
export function Letter({ t }: { t: number }) {
  return (
    <Block
      cast={{ look: { ...CELL, gear: ["glasses"] }, motion: "think" }}
      t={t}
      cars={[CITY.white, CITY.red, CITY.white, CITY.blue, CITY.red]}
      floats={
        <>
          <Around right={-3.7} up={2.6} t={t} phase={0}>
            <Envelope />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.45}>
            <Envelope tone={T.cream} />
          </Around>
          <Around right={1.3} up={5.0} t={t} phase={0.25}>
            <Heart />
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.6}>
            <Quill />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.9}>
            <Stamp />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.7}>
            <Envelope w={0.5} />
          </Around>
          <Around right={2.9} up={4.5} t={t} phase={0.15}>
            <Star s={0.16} />
          </Around>
        </>
      }
    >
      {/* Behind: the post office with its envelope, two towers, and the counter hall. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[2.0, 1.5]}
        floors={5}
        tone={CITY.red}
        seed={61}
        t={t}
        trim={T.paper}
      />
      <RoofKit at={[-4.0, roof(5), -4.0]} size={[2.0, 1.5]} seed={61} />
      <Place at={[-3.05, roof(5), -3.2]} size={[0.06, 0.5, 0.06]} tone={CITY.steel} />
      <group position={[-3.02, roof(5) + 0.9, -3.17]} scale={1.7}>
        <Envelope />
      </group>
      <Tower
        at={[-1.8, 0.03, -4.0]}
        size={[1.4, 1.4]}
        floors={8}
        tone={toneOf("#30476b")}
        seed={63}
        t={t}
      />
      <RoofKit at={[-1.8, roof(8), -4.0]} size={[1.4, 1.4]} seed={63} />
      <Tower
        at={[-0.2, 0.03, -4.0]}
        size={[1.3, 1.3]}
        floors={6}
        tone={toneOf("#5b4a8a")}
        seed={65}
        t={t}
      />
      <Solar at={[-0.05, roof(6), -3.75]} n={3} />
      <Tower
        at={[1.25, 0.03, -4.0]}
        size={[0.95, 1.5]}
        floors={2}
        tone={T.cream}
        seed={67}
        t={t}
        trim={T.wood}
      />
      <Awning at={[1.25, 0.55, -2.5]} long={0.95} tone={CITY.red} />

      {/* The sorting depot, its yard of parcels, and the vans. */}
      <Tower
        at={[-4.0, 0.03, -2.3]}
        size={[1.5, 1.7]}
        floors={2}
        tone={CITY.concrete}
        seed={69}
        t={t}
      />
      <Awning at={[-4.0, 0.55, -0.6]} long={1.5} tone={CITY.red} />
      <Solar at={[-3.85, roof(2), -2.0]} n={3} />
      <Pallet at={[-3.95, 0.03, -0.35]} rows={3} tone={CARD} />
      <Pallet at={[-3.35, 0.03, -0.35]} rows={2} tone={CARD} />
      <Pallet at={[-3.95, 0.03, 0.25]} rows={2} tone={CARD} />
      <Car at={[-2.35, 0.03, -2.15]} tone={CITY.white} kind="van" />
      <Car at={[-2.35, 0.03, -1.5]} tone={CITY.red} kind="van" />
      <Barrier at={[-2.45, 0.03, -0.9]} along="x" />
      <Folk
        at={[-3.0, 0.03, 0.35]}
        t={t}
        body="#38bdf8"
        motion="wave"
        turn={0.8}
        seed={3}
        gear={["cap", "backpack"]}
      />

      {/* The pillar boxes, and the queue. */}
      {[-0.45, 0.15, 0.75, 1.35].map((z) => (
        <PostBox key={z} at={[-1.45, 0.03, z]} />
      ))}
      <Folk at={[-1.95, 0.03, -0.3]} t={t} body="#ff8a3d" motion="wave" turn={1.3} seed={6} />
      <Folk at={[-1.95, 0.03, 0.35]} t={t} body="#a78bfa" motion="think" turn={1.3} seed={9} />
      <Folk
        at={[-1.95, 0.03, 0.95]}
        t={t}
        body="#ff7ab6"
        motion="cheer"
        turn={1.3}
        seed={12}
        gear={["scarf"]}
      />
      <group position={[-1.95, 0.72, 0.4]} scale={0.42}>
        <Envelope />
      </group>

      {/* The letter, a lawn, the carrier birds. */}
      <Place at={[-4.0, 0.03, 0.95]} size={[1.9, 0.02, 1.2]} tone={CITY.grass} />
      <Sheet at={[-3.75, 0.05, 1.25]} />
      <IsoCritter
        t={t}
        position={[-2.6, 0.05, 1.75]}
        rotationY={0.6}
        tone={T.paper}
        belly={T.cream}
        ears="pointed"
        hop
      />
      <IsoCritter
        t={t + 0.7}
        position={[-2.3, 0.05, 1.25]}
        rotationY={-0.2}
        tone={T.paper}
        belly={T.cream}
        ears="pointed"
        hop
      />
      <Hedge at={[-1.75, 0.03, 1.95]} long={1.1} along="x" />

      {/* By the plaza: a stamp stall, a fountain in a small park, a notice board. */}
      <Stall at={[-0.55, 0.03, -2.3]} tone={CITY.red} />
      <Place at={[0.6, 0.03, -2.35]} size={[1.55, 0.02, 1.6]} tone={CITY.grass} />
      <Fountain at={[1.35, 0.05, -1.6]} t={t} />
      <Tree at={[0.85, 0.05, -2.1]} s={0.95} />
      <Bench at={[1.2, 0.05, -0.95]} />
      <Billboard at={[-0.6, 0.03, -1.2]} size={[0.9, 0.6]}>
        <Graph cols={7} rows={4} cell={0.085} gap={0.02} seed={37} t={t} />
      </Billboard>
    </Block>
  );
}

/** A padlock seen from its front. */
function Padlock({ tone = GOLD }: { tone?: Tone }) {
  return (
    <>
      <Bit at={[0, -0.1, 0]} size={[0.5, 0.4, 0.2]} tone={tone} />
      <Bit at={[-0.15, 0.2, 0]} size={[0.08, 0.26, 0.1]} tone={CITY.steel} />
      <Bit at={[0.15, 0.2, 0]} size={[0.08, 0.26, 0.1]} tone={CITY.steel} />
      <Bit at={[0, 0.36, 0]} size={[0.38, 0.08, 0.1]} tone={CITY.steel} />
      <Bit at={[0, -0.06, 0.11]} size={[0.1, 0.1, 0.02]} tone={T.dark} />
      <Bit at={[0, -0.16, 0.11]} size={[0.05, 0.12, 0.02]} tone={T.dark} />
    </>
  );
}

/** A key lying on its side. */
function Key() {
  return (
    <>
      <Bit at={[-0.28, 0, 0]} size={[0.28, 0.28, 0.08]} tone={GOLD} />
      <Bit at={[-0.28, 0, 0.05]} size={[0.11, 0.11, 0.02]} tone={T.dark} />
      <Bit at={[0.12, 0, 0]} size={[0.54, 0.08, 0.08]} tone={GOLD} />
      <Bit at={[0.2, -0.1, 0]} size={[0.07, 0.12, 0.08]} tone={GOLD} />
      <Bit at={[0.33, -0.08, 0]} size={[0.07, 0.08, 0.08]} tone={GOLD} />
    </>
  );
}

/** A shield with a tick on it. */
function Shield({ tone = T.green }: { tone?: Tone }) {
  return (
    <>
      <Bit at={[0, 0.16, 0]} size={[0.62, 0.3, 0.1]} tone={tone} />
      <Bit at={[0, -0.06, 0]} size={[0.52, 0.14, 0.1]} tone={tone} />
      <Bit at={[0, -0.19, 0]} size={[0.36, 0.12, 0.1]} tone={tone} />
      <Bit at={[0, -0.3, 0]} size={[0.18, 0.1, 0.1]} tone={tone} />
      {/* The tick: down to its lowest point, then up to the right. */}
      {[
        [-2, 0],
        [-1, -1],
        [0, 0],
        [1, 1],
        [2, 2],
      ].map(([c, r]) => (
        <Bit
          key={c}
          at={[(c ?? 0) * 0.075, 0.02 + (r ?? 0) * 0.075, 0.06]}
          size={[0.08, 0.08, 0.03]}
          tone={T.paper}
        />
      ))}
    </>
  );
}

/** A camera on a pole, a red light on it. */
function Cctv({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[0.05, 0.95, 0.05]} tone={CITY.steel} />
      <Place at={[x - 0.02, y + 0.95, z - 0.02]} size={[0.26, 0.12, 0.14]} tone={CITY.white} />
      <PaneZ at={[x + 0.19, y + 1.01, z + 0.124]} size={[0.05, 0.05]} color="#da3633" />
    </>
  );
}

/** A server cabinet whose lights blink in turn. */
function Rack({ at, t, seed }: { at: V3; t: number; seed: number }) {
  const [x, y, z] = at;
  const beat = Math.floor((t % 2) * 4);
  return (
    <>
      <Place at={[x, y, z]} size={[0.32, 0.78, 0.32]} tone={T.dark} />
      {[0, 1, 2, 3, 4].map((i) => (
        <group key={i}>
          <PaneZ
            at={[x + 0.16, y + 0.1 + i * 0.14, z + 0.324]}
            size={[0.26, 0.09]}
            color="#373e47"
          />
          <PaneZ
            at={[x + 0.08, y + 0.1 + i * 0.14, z + 0.326]}
            size={[0.04, 0.04]}
            color={(i + beat + seed) % 2 === 0 ? LIT : GREENS[0]}
          />
          <PaneZ
            at={[x + 0.15, y + 0.1 + i * 0.14, z + 0.326]}
            size={[0.04, 0.04]}
            color={(i + beat + seed) % 3 === 0 ? "#ffd866" : "#161b22"}
          />
        </group>
      ))}
    </>
  );
}

/** The vault: a heavy block with a round door whose lit wheel turns, a keypad beside it. */
function Vault({ at, t }: { at: V3; t: number }) {
  const [x, y, z] = at;
  const w = 2.2;
  const h = 2.1;
  const d = 2.0;
  const door: V3 = [x + 0.95, y + 1.05, z + d + 0.004];
  const turn = Math.sin((t / 2) * Math.PI * 2) * 0.35;
  return (
    <>
      <Place at={[x, y, z]} size={[w, h, d]} tone={T.dark} />
      <Place at={[x - 0.04, y + h, z - 0.04]} size={[w + 0.08, 0.1, d + 0.08]} tone={CITY.steel} />
      <Place at={[x - 0.04, y, z - 0.04]} size={[w + 0.08, 0.12, d + 0.08]} tone={CITY.steel} />
      <mesh position={door}>
        <circleGeometry args={[0.78, 48]} />
        <Flat color="#6e7681" />
      </mesh>
      <mesh position={[door[0], door[1], door[2] + 0.002]}>
        <circleGeometry args={[0.66, 48]} />
        <Flat color="#444c56" />
      </mesh>
      {Array.from({ length: 10 }, (_, k) => {
        const a = (k / 10) * Math.PI * 2;
        return (
          <mesh
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed ring of bolts
            key={k}
            position={[door[0] + Math.cos(a) * 0.72, door[1] + Math.sin(a) * 0.72, door[2] + 0.004]}
          >
            <circleGeometry args={[0.035, 12]} />
            <Flat color="#c9d1d9" />
          </mesh>
        );
      })}
      <group position={[door[0], door[1], door[2] + 0.006]} rotation={[0, 0, turn]}>
        <mesh>
          <ringGeometry args={[0.36, 0.44, 40]} />
          <Flat color={LIT} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <planeGeometry args={[0.06, 0.8]} />
            <Flat color={LIT} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[0.1, 24]} />
          <Flat color="#161b22" />
        </mesh>
      </group>
      {/* The keypad, and vents on the side. */}
      <PaneZ at={[x + 1.95, y + 1.1, z + d + 0.004]} size={[0.26, 0.4]} color="#161b22" />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <PaneZ
            key={`${r}${c}`}
            at={[x + 1.88 + c * 0.07, y + 1.02 + r * 0.08, z + d + 0.006]}
            size={[0.045, 0.045]}
            color={(r + c) % 2 === 0 ? "#7ee787" : "#545d68"}
          />
        )),
      )}
      <PaneZ at={[x + 1.95, y + 1.4, z + d + 0.006]} size={[0.2, 0.07]} color={LIT} />
      {[0, 1, 2, 3].map((i) => (
        <PaneX
          key={i}
          at={[x + w + 0.004, y + 1.5 - i * 0.16, z + 1.0]}
          size={[1.3, 0.07]}
          color="#444c56"
        />
      ))}
      <PaneX at={[x + w + 0.004, y + 0.55, z + 1.0]} size={[0.5, 0.86]} color="#161b22" />
      <PaneX at={[x + w + 0.006, y + 0.62, z + 0.82]} size={[0.06, 0.06]} color={LIT} />
    </>
  );
}

/**
 * Privacy: the vault's block. The vault with its round door, the data centre and its cabinets
 * behind a fence, a guard post with a barrier, cameras and floodlights, a great padlock on the
 * lawn, a cat asleep by the gate, and Cell standing guard on the plaza.
 */
export function Privacy({ t }: { t: number }) {
  return (
    <Block
      cast={{ look: CELL, motion: "proud" }}
      t={t}
      cars={[CITY.blue, CITY.teal, CITY.violet, CITY.blue, CITY.teal]}
      floats={
        <>
          <Around right={-3.7} up={2.6} t={t} phase={0}>
            <Padlock />
          </Around>
          <Around right={3.6} up={2.7} t={t} phase={0.45}>
            <Key />
          </Around>
          <Around right={0.2} up={4.6} t={t} phase={0.25}>
            <Shield />
          </Around>
          <Around right={-2.7} up={4.7} t={t} phase={0.6}>
            <Bubble tone={T.navy} dots={toneOf("#7ee787")} />
          </Around>
          <Around right={4.9} up={0.9} t={t} phase={0.9}>
            <Padlock tone={BLUE} />
          </Around>
          <Around right={-5.0} up={0.9} t={t} phase={0.7}>
            <Shield tone={BLUE} />
          </Around>
          <Around right={2.9} up={4.5} t={t} phase={0.15}>
            <Star s={0.16} />
          </Around>
        </>
      }
    >
      {/* Behind: the data centre's towers, and the hall with its cabinets. */}
      <Tower
        at={[-4.0, 0.03, -4.0]}
        size={[1.5, 1.6]}
        floors={8}
        tone={toneOf("#232b3d")}
        seed={71}
        t={t}
        night
      />
      <RoofKit at={[-4.0, roof(8), -4.0]} size={[1.5, 1.6]} seed={71} />
      <Tower
        at={[-2.3, 0.03, -4.0]}
        size={[1.5, 1.4]}
        floors={6}
        tone={toneOf("#1f4f46")}
        seed={73}
        t={t}
      />
      <Solar at={[-2.15, roof(6), -3.75]} n={3} />
      <Tower
        at={[-0.6, 0.03, -4.0]}
        size={[1.3, 1.3]}
        floors={9}
        tone={toneOf("#30476b")}
        seed={75}
        t={t}
      />
      <RoofKit at={[-0.6, roof(9), -4.0]} size={[1.3, 1.3]} seed={75} />
      <Place at={[0.02, roof(9), -3.4]} size={[0.06, 0.5, 0.06]} tone={CITY.steel} />
      <group position={[0.05, roof(9) + 0.95, -3.37]} scale={1.5}>
        <Shield />
      </group>
      <Tower
        at={[0.9, 0.03, -4.0]}
        size={[1.3, 1.3]}
        floors={2}
        tone={CITY.steel}
        seed={77}
        t={t}
      />
      {[0, 1, 2].map((k) => (
        <Rack key={k} at={[0.95 + k * 0.42, 0.03, -2.6]} t={t} seed={k} />
      ))}

      {/* The vault and its forecourt: a fence, the guard post, cameras, lights. */}
      <Vault at={[-4.0, 0.03, -2.2]} t={t} />
      <RoofKit at={[-4.0, 2.23, -2.2]} size={[2.2, 2.0]} seed={79} />
      <Fence at={[-4.1, 0.03, 2.1]} long={2.0} along="x" />
      <Barrier at={[-2.0, 0.03, 2.05]} along="x" />
      <Cabin at={[-2.6, 0.03, 1.1]} tone={CITY.blue} />
      <Floodlight at={[-4.0, 0.03, 0.15]} />
      <Floodlight at={[-1.55, 0.03, 0.15]} />
      <Cctv at={[-4.05, 0.03, 1.9]} />
      <Cctv at={[-1.05, 0.03, 1.95]} />
      <Car at={[-3.95, 0.03, 1.2]} tone={CITY.steel} kind="van" />
      <Folk
        at={[-2.9, 0.03, 0.55]}
        t={t}
        body="#38bdf8"
        motion="proud"
        turn={0.6}
        seed={4}
        gear={["cap"]}
      />
      <Folk
        at={[-1.75, 0.03, 0.6]}
        t={t}
        body="#a78bfa"
        motion="wave"
        turn={0.2}
        seed={7}
        gear={["headset"]}
      />
      <IsoCritter
        t={0}
        position={[-1.4, 0.03, 1.45]}
        rotationY={0.4}
        tone={T.mid}
        belly={T.paper}
        ears="pointed"
      />

      {/* By the plaza: the great padlock on a lawn, a status board, trees. */}
      <Place at={[0.75, 0.03, -2.1]} size={[1.4, 0.02, 1.35]} tone={CITY.grass} />
      <Place at={[1.1, 0.05, -1.95]} size={[0.95, 0.75, 0.42]} tone={GOLD} />
      <Place at={[1.22, 0.8, -1.86]} size={[0.14, 0.42, 0.22]} tone={CITY.steel} />
      <Place at={[1.79, 0.8, -1.86]} size={[0.14, 0.42, 0.22]} tone={CITY.steel} />
      <Place at={[1.22, 1.22, -1.86]} size={[0.71, 0.14, 0.22]} tone={CITY.steel} />
      <PaneZ at={[1.575, 0.5, -1.526]} size={[0.16, 0.16]} color="#161b22" />
      <PaneZ at={[1.575, 0.36, -1.526]} size={[0.08, 0.2]} color="#161b22" />
      <Tree at={[0.9, 0.05, -1.1]} s={0.9} />
      <Billboard at={[-0.6, 0.03, -2.3]} size={[1.1, 0.6]}>
        <Graph cols={8} rows={4} cell={0.09} gap={0.025} seed={41} t={t} />
      </Billboard>
      <Hedge at={[-0.6, 0.03, -1.1]} long={1.0} along="x" />
      <Folk at={[-0.2, 0.03, -1.6]} t={t} body="#ff8a3d" motion="think" turn={-0.3} seed={10} />
    </Block>
  );
}

/** A year's city, a tile to a day. */
const TILE = 0.26;

/** The story's train: the engine and its wagons of green squares, heading along +x. */
function Train({ at, wagons = 4 }: { at: V3; wagons?: number }) {
  const [x, y, z] = at;
  const wheel = (wx: number): ReactNode => (
    <PaneZ key={wx} at={[wx, y + 0.07, z + 0.324]} size={[0.11, 0.11]} color="#c9d1d9" />
  );
  const engine = x + wagons * 0.6;
  return (
    <>
      {Array.from({ length: wagons }, (_, k) => {
        const wx = x + k * 0.6;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed row of wagons
          <group key={k}>
            <Place at={[wx, y + 0.04, z]} size={[0.5, 0.1, 0.32]} tone={T.dark} />
            <Place
              at={[wx + 0.06, y + 0.14, z + 0.04]}
              size={[0.38, 0.14 + (k % 3) * 0.05, 0.24]}
              tone={{ ...T.greenDeep, top: GREENS[(k % 3) + 1] ?? LIT }}
            />
            {wheel(wx + 0.12)}
            {wheel(wx + 0.38)}
          </group>
        );
      })}
      <Place at={[engine, y + 0.04, z]} size={[0.72, 0.1, 0.32]} tone={T.dark} />
      <Place at={[engine + 0.04, y + 0.14, z + 0.02]} size={[0.26, 0.4, 0.28]} tone={T.green} />
      <Place at={[engine + 0.3, y + 0.14, z + 0.04]} size={[0.38, 0.22, 0.24]} tone={T.greenDeep} />
      <Place at={[engine + 0.52, y + 0.36, z + 0.1]} size={[0.1, 0.2, 0.1]} tone={T.dark} />
      <PaneZ at={[engine + 0.17, y + 0.4, z + 0.304]} size={[0.14, 0.12]} color="#ffd866" />
      <PaneX at={[engine + 0.684, y + 0.25, z + 0.16]} size={[0.1, 0.1]} color="#ffd866" />
      {wheel(engine + 0.14)}
      {wheel(engine + 0.36)}
      {wheel(engine + 0.58)}
      {[0, 1, 2].map((k) => (
        <IsoBox
          key={k}
          size={[0.1 + k * 0.04, 0.1 + k * 0.04, 0.1 + k * 0.04]}
          position={[engine + 0.57 - k * 0.1, y + 0.7 + k * 0.2, z + 0.15]}
          tone={T.mid}
          edges={false}
        />
      ))}
    </>
  );
}

/** A firework: a stem of sparks and two rings that open as the loop goes round. */
function Firework({ at, t, color, phase }: { at: V3; t: number; color: string; phase: number }) {
  const open = (((t / 2 + phase) % 1) + 1) % 1;
  const r = 0.25 + open * 0.75;
  const s = 0.09 * (1 - open * 0.45);
  return (
    <group position={at}>
      {Array.from({ length: 14 }, (_, k) => {
        const a = (k / 14) * Math.PI * 2;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed ring of sparks
          <mesh key={k} position={[Math.cos(a) * r, Math.sin(a) * r, 0]}>
            <boxGeometry args={[s, s, s]} />
            <Flat color={color} />
          </mesh>
        );
      })}
      {Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2 + 0.4;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed ring of sparks
          <mesh key={`in${k}`} position={[Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, 0]}>
            <boxGeometry args={[s * 0.8, s * 0.8, s * 0.8]} />
            <Flat color="#f0f6fc" />
          </mesh>
        );
      })}
      {[0, 1, 2].map((k) => (
        <mesh key={`st${k}`} position={[0, -r - 0.25 - k * 0.22, 0]}>
          <boxGeometry args={[0.04, 0.1, 0.04]} />
          <Flat color={color} />
        </mesh>
      ))}
    </group>
  );
}

/** A balloon on its string. */
function Balloon({ tone }: { tone: Tone }) {
  return (
    <>
      <Bit at={[0, 0.39, 0]} size={[0.2, 0.07, 0.2]} tone={tone} />
      <Bit at={[0, 0.22, 0]} size={[0.3, 0.27, 0.3]} tone={tone} />
      <Bit at={[0, 0.05, 0]} size={[0.2, 0.07, 0.2]} tone={tone} />
      <Bit at={[0, -0.02, 0]} size={[0.07, 0.07, 0.07]} tone={tone} />
      <Bit at={[0, -0.26, 0]} size={[0.012, 0.42, 0.012]} tone={T.mid} />
    </>
  );
}

/**
 * The close: the whole sample year as a city on a long island, a tile to a day, as tall as that
 * day's contributions, lit windows on the towers that show a face. The story's train runs along
 * its front past trees and lamps; Cell stands crowned on a stage before it, a crowd round it on
 * the stands, fireworks over the roofs.
 */
export function Closing({ t }: { t: number }) {
  const city = buildCity(sampleRecap);
  const levels = heatLevels(city.plots);
  const cols = Math.max(...city.plots.map((p) => p.col)) + 1;
  const long = cols * TILE;
  const ox = -long / 2;
  const oz = (-7 * TILE) / 2;
  const front = oz + 7 * TILE;
  const tall = (index: number | undefined): number => {
    const p = index === undefined ? undefined : city.plots[index];
    if (!p) return 0;
    return p.state === "active" ? plotHeight(p, city.maxCount) * 0.115 + 0.04 : 0.02;
  };
  const at = new Map(city.plots.map((p) => [`${p.col},${p.row}`, p.index]));
  const stage: V3 = [1.0, 0.24, front + 2.75];
  const fireworks: [V3, string][] = [
    [[-4.6, 2.0, -0.7], GREENS[3]],
    [[-2.3, 2.9, -1.0], "#ffd866"],
    [[0.2, 3.4, -0.9], "#ff7ab6"],
    [[2.6, 2.9, -0.7], "#79c0ff"],
    [[4.9, 2.3, -0.5], GREENS[3]],
    [[-0.9, 2.2, 0.1], "#c4b5fd"],
  ];
  return (
    <>
      {/* The island: the year's ground, the strip the train runs on, and the stage's square. */}
      <Place
        at={[ox - 0.5, -0.34, oz - 0.5]}
        size={[long + 1.0, 0.34, 7 * TILE + 2.1]}
        tone={T.floor}
      />
      <PaneZ at={[0, -0.08, front + 1.604]} size={[long + 0.9, 0.04]} color={LIT} />
      <PaneX
        at={[ox + long + 0.504, -0.08, oz + 0.55 + (7 * TILE) / 2]}
        size={[7 * TILE + 2.0, 0.04]}
        color={LIT}
      />
      <Place at={[-3.1, -0.34, front + 1.6]} size={[6.1, 0.34, 2.3]} tone={T.floor} />
      <PaneZ at={[-0.05, -0.08, front + 3.904]} size={[6.0, 0.04]} color={LIT} />
      <PaneX at={[3.004, -0.08, front + 2.75]} size={[2.2, 0.04]} color={LIT} />
      <Place at={[ox - 0.4, 0, front + 0.06]} size={[long + 0.8, 0.02, 0.3]} tone={CITY.pave} />
      <Place at={[ox - 0.4, 0, front + 1.0]} size={[long + 0.8, 0.02, 0.52]} tone={CITY.pave} />

      {/* The year. */}
      {city.plots.map((p) => {
        const active = p.state === "active";
        const h = tall(p.index);
        const level = Math.min(3, Math.max(0, (levels[p.index] ?? 1) - 1));
        const busiest = p.index === city.busiestIndex;
        const tone: Tone = busiest
          ? T.green
          : active
            ? {
                top: GREENS[level] ?? LIT,
                left: T.dark.left,
                right: T.dark.right,
                edge: T.dark.edge,
              }
            : T.dark;
        const x = ox + p.col * TILE + 0.02;
        const z = oz + p.row * TILE + 0.02;
        const side = TILE - 0.04;
        // Windows only where a face shows over the tower in front of it.
        const overZ = tall(at.get(`${p.col},${p.row + 1}`));
        const overX = tall(at.get(`${p.col + 1},${p.row}`));
        const floors = Math.floor((h - 0.05) / 0.085);
        const panes: ReactNode[] = [];
        for (let f = 0; f < floors && !busiest; f++) {
          const y = 0.07 + f * 0.085;
          if (y < overZ + 0.03 && y < overX + 0.03) continue;
          for (const k of [0, 1]) {
            const lit = hash(p.index * 7.3 + f * 3.1 + k);
            if (lit > 0.55) continue;
            const color = lit < 0.38 ? "#ffd866" : "#7ee787";
            if (y >= overZ + 0.03)
              panes.push(
                <PaneZ
                  key={`z${f}${k}`}
                  at={[x + side * (0.3 + k * 0.4), y, z + side + 0.003]}
                  size={[0.055, 0.04]}
                  color={color}
                />,
              );
            if (y >= overX + 0.03 && hash(p.index * 1.7 + f + k * 9) < 0.5)
              panes.push(
                <PaneX
                  key={`x${f}${k}`}
                  at={[x + side + 0.003, y, z + side * (0.3 + k * 0.4)]}
                  size={[0.055, 0.04]}
                  color={color}
                />,
              );
          }
        }
        return (
          <group key={p.index}>
            <Place at={[x, 0, z]} size={[side, h, side]} tone={tone} edges={active} />
            {panes}
          </group>
        );
      })}
      {/* A beacon over the busiest day. */}
      {city.busiestIndex !== null &&
        (() => {
          const p = city.plots[city.busiestIndex];
          if (!p) return null;
          const top = tall(p.index);
          return (
            <Float
              at={[ox + p.col * TILE + TILE / 2, top + 0.5, oz + p.row * TILE + TILE / 2]}
              t={t}
              phase={0.3}
            >
              <Star s={0.13} />
            </Float>
          );
        })()}

      {/* The rail and the story's train, trees and lamps along the kerb. */}
      {Array.from({ length: Math.floor((long + 0.6) / 0.3) }, (_, k) => (
        <Place
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed row of sleepers
          key={k}
          at={[ox - 0.3 + k * 0.3, 0, front + 0.46]}
          size={[0.09, 0.03, 0.46]}
          tone={T.wood}
        />
      ))}
      <Place
        at={[ox - 0.4, 0.03, front + 0.54]}
        size={[long + 0.8, 0.03, 0.04]}
        tone={CITY.concrete}
      />
      <Place
        at={[ox - 0.4, 0.03, front + 0.8]}
        size={[long + 0.8, 0.03, 0.04]}
        tone={CITY.concrete}
      />
      <Train at={[-5.9, 0.04, front + 0.53]} />
      {Array.from({ length: 12 }, (_, m) => {
        const x = ox + ((m + 0.5) / 12) * long;
        // The stage's square opens between the fifth and the eighth.
        const clear = x > -3.2 && x < 3.1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: twelve months in a row
          <group key={m}>
            {!clear && <Tree at={[x - 0.25, 0.02, front + 1.26]} s={0.55} />}
            {!clear && m % 2 === 0 && (
              <group position={[x + 0.3, 0.02, front + 1.1]} scale={0.6}>
                <Lamp at={[0, 0, 0]} over="z" />
              </group>
            )}
            {/* A month's post: one green cap for each. */}
            <Place at={[x, 0.02, front + 0.16]} size={[0.04, 0.3, 0.04]} tone={CITY.steel} />
            <Place
              at={[x - 0.07, 0.32, front + 0.14]}
              size={[0.18, 0.1, 0.08]}
              tone={T.greenDeep}
            />
          </group>
        );
      })}
      <group position={[3.3, 0.02, front + 1.06]} scale={0.62}>
        <Stall at={[0, 0, 0]} tone={CITY.red} />
        <Stall at={[1.5, 0, 0]} tone={CITY.teal} />
        <Stall at={[3.0, 0, 0]} tone={CITY.violet} />
      </group>
      <Folk
        at={[3.5, 0.02, front + 1.42]}
        t={t}
        body="#38bdf8"
        motion="wave"
        turn={0.4}
        seed={21}
        s={0.2}
      />
      <Folk
        at={[4.5, 0.02, front + 1.44]}
        t={t}
        body="#ff8a3d"
        motion="cheer"
        turn={0.2}
        seed={24}
        s={0.2}
      />
      <Folk
        at={[5.4, 0.02, front + 1.42]}
        t={t}
        body="#a78bfa"
        motion="wave"
        turn={0.7}
        seed={27}
        s={0.2}
      />
      <Folk
        at={[-4.2, 0.02, front + 1.34]}
        t={t}
        body="#ff7ab6"
        motion="wave"
        turn={0.9}
        seed={30}
        s={0.2}
      />
      <Folk
        at={[-3.1, 0.02, front + 1.36]}
        t={t}
        body="#2dd4bf"
        motion="cheer"
        turn={0.5}
        seed={33}
        s={0.2}
      />

      {/* The stage's square: stands and a crowd, lights, bunting, and Cell crowned. */}
      <group position={[0, 0, front + 1.75]} scale={0.8}>
        <Bleachers at={[-3.6, 0, 0]} long={1.7} rows={3} tone={CITY.teal} />
        <Bleachers at={[1.6, 0, 0]} long={1.7} rows={3} tone={CITY.violet} />
        <Bunting at={[-3.6, 0, -0.1]} long={7.0} tall={1.25} />
        <Floodlight at={[-3.75, 0, 0.9]} />
        <Floodlight at={[3.55, 0, 0.9]} />
      </group>
      {[
        ["#38bdf8", -2.7, 0.26, 0.1, "cheer"],
        ["#ff8a3d", -2.3, 0.26, 0.1, "wave"],
        ["#a78bfa", -1.9, 0.26, 0.1, "cheer"],
        ["#ff7ab6", -2.5, 0.14, 0.27, "wave"],
        ["#2dd4bf", -2.0, 0.14, 0.27, "cheer"],
        ["#ffd866", 1.4, 0.26, 0.1, "cheer"],
        ["#39d353", 1.8, 0.26, 0.1, "wave"],
        ["#79c0ff", 2.2, 0.26, 0.1, "cheer"],
        ["#ff8a3d", 1.6, 0.14, 0.27, "wave"],
        ["#c4b5fd", 2.1, 0.14, 0.27, "cheer"],
      ].map(([body, x, y, dz, motion], i) => (
        <Folk
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed crowd
          key={i}
          at={[x as number, y as number, front + 1.75 + (dz as number)]}
          t={t}
          body={body as string}
          motion={motion as "cheer" | "wave"}
          turn={0.5}
          seed={40 + i * 3}
          s={0.21}
        />
      ))}
      <Place at={[stage[0] - 1.0, 0, stage[2] - 0.6]} size={[2.0, 0.12, 1.3]} tone={T.dark} />
      <Place at={[stage[0] - 0.75, 0.12, stage[2] - 0.45]} size={[1.5, 0.12, 1.0]} tone={T.mid} />
      <PaneZ at={[stage[0], 0.06, stage[2] + 0.704]} size={[1.9, 0.04]} color={LIT} />
      <PaneX at={[stage[0] + 1.004, 0.06, stage[2] + 0.05]} size={[1.2, 0.04]} color={LIT} />
      <PaneY at={[stage[0], 0.244, stage[2] + 0.05]} size={[1.1, 0.7]} color="#545d68" />
      <Mover>
        <IsoCell
          look={{ ...CELL, eyes: "happy", gear: ["crown"] }}
          motion="proud"
          t={t}
          position={stage}
          rotationY={0.5}
          scale={1.15}
        />
      </Mover>
      <group position={stage} scale={0.62}>
        <Sparkles t={t} accent={PINK} clear={{ half: 2.1, top: 3.7 }} spread={1.35} />
      </group>
      {/* A trophy and flowers by the stage, cars that brought the crowd. */}
      <Place at={[stage[0] + 1.25, 0, stage[2] - 0.2]} size={[0.26, 0.1, 0.26]} tone={T.dark} />
      <Place at={[stage[0] + 1.32, 0.1, stage[2] - 0.13]} size={[0.12, 0.16, 0.12]} tone={GOLD} />
      <Place at={[stage[0] + 1.24, 0.26, stage[2] - 0.21]} size={[0.28, 0.2, 0.28]} tone={GOLD} />
      <group position={[-2.9, 0.02, front + 3.05]} scale={0.6}>
        <Car at={[0, 0, 0]} tone={CITY.blue} />
        <Car at={[0, 0, 0.7]} tone={CITY.gold} kind="taxi" />
        <Car at={[1.2, 0, 0.35]} tone={CITY.white} kind="van" />
      </group>
      <Tree at={[-2.95, 0.02, front + 2.45]} s={0.6} />
      <Tree at={[2.35, 0.02, front + 3.5]} s={0.6} />
      <Hedge at={[1.5, 0.02, front + 3.6]} long={0.7} along="x" />

      {/* Over the roofs: fireworks. Balloons drift off the island's near side, clear of the train. */}
      {fireworks.map(([where, color], i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list that never reorders
        <Firework key={i} at={where} t={t} color={color} phase={i * 0.31} />
      ))}
      <Float at={[stage[0] - 1.72, 2.0, stage[2] + 4.36]} t={t} phase={0.2}>
        <Balloon tone={RED} />
      </Float>
      <Float at={[stage[0] - 2.65, 2.4, stage[2] + 4.28]} t={t} phase={0.6}>
        <Balloon tone={GOLD} />
      </Float>
      <Float at={[stage[0] + 0.3, 2.6, stage[2] - 2.9]} t={t} phase={0.8}>
        <Balloon tone={BLUE} />
      </Float>
    </>
  );
}
