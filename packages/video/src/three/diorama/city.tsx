import type { ReactNode } from "react";
import { Flat, IsoBox, LIT, Place, T, type Tone, type V3 } from "./isokit";

/*
 * A kit of small city parts for the dense isometric pictures: towers with rows of windows, roads
 * with lane marks, cars, trees, street lamps, a crane, scaffolding, and the bits that stand on
 * roofs and pavements. Everything is boxes and flat panes in the landing's style (ADR-0021), and
 * every part is placed by its footprint's back corner (lowest x and z) unless it says otherwise.
 * The camera sits at +x, +y, +z, so the faces that show are +x (the right) and +z (the left).
 * Nothing here is random: a part's variety comes from `seed`, so every bake is the same picture.
 */

/** A number from 0 to 1 that depends only on `n`. */
export const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const OFF = 0.004;
/** 0 to n - 1, to map over: the parts of a row are told apart by their place in it. */
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** A flat pane on a +z face, by its centre. */
export function PaneZ({ at, size, color }: { at: V3; size: [number, number]; color: string }) {
  return (
    <mesh position={at}>
      <planeGeometry args={size} />
      <Flat color={color} />
    </mesh>
  );
}

/** A flat pane on a +x face, by its centre. `size` is along z, then up. */
export function PaneX({ at, size, color }: { at: V3; size: [number, number]; color: string }) {
  return (
    <mesh position={at} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={size} />
      <Flat color={color} />
    </mesh>
  );
}

/** A flat pane lying on a top face, by its centre. `size` is along x, then along z. */
export function PaneY({ at, size, color }: { at: V3; size: [number, number]; color: string }) {
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <Flat color={color} />
    </mesh>
  );
}

export const C = {
  road: { top: "#2a3038", left: "#1d2228", right: "#171b20", edge: "#3a424d" },
  pave: { top: "#3d4651", left: "#2c333c", right: "#232930", edge: "#56616e" },
  grass: { top: "#1f6f38", left: "#18592d", right: "#124523", edge: "#2ea043" },
  concrete: { top: "#a9b3be", left: "#8e98a4", right: "#747e8a", edge: "#c9d1d9" },
  steel: { top: "#6e7681", left: "#545d68", right: "#444c56", edge: "#8b949e" },
  brick: { top: "#ff9a5c", left: "#e8743b", right: "#c25b26", edge: "#ffb98c" },
  gold: { top: "#f5d36b", left: "#e3b341", right: "#bb8f2a", edge: "#f8e29a" },
  red: { top: "#ff7b72", left: "#da3633", right: "#b62324", edge: "#ffa198" },
  blue: { top: "#79c0ff", left: "#388bfd", right: "#1f6feb", edge: "#a5d6ff" },
  violet: { top: "#c4b5fd", left: "#a78bfa", right: "#8468d8", edge: "#ddd6fe" },
  teal: { top: "#5eead4", left: "#2dd4bf", right: "#1fa896", edge: "#99f6e4" },
  white: { top: "#f0f6fc", left: "#c9d1d9", right: "#aab4bf", edge: "#ffffff" },
} as const satisfies Record<string, Tone>;

const GLASS = "#1b2a41";
const GLASS_LIT = "#ffd866";
const GLASS_COOL = "#79c0ff";
const FLOOR = 0.42;

/**
 * A tower: `floors` storeys of windows on both faces that show, a base course, floor lines and a
 * parapet. Windows are dark glass, with some lit warm and a few cool, by `seed`; `blink` windows
 * switch on and off once a loop.
 */
export function Tower({
  at,
  size,
  floors,
  tone = T.mid,
  seed = 1,
  t = 0,
  trim = T.dark,
  door = true,
  night = false,
}: {
  at: V3;
  size: [number, number];
  floors: number;
  tone?: Tone;
  seed?: number;
  t?: number;
  trim?: Tone;
  door?: boolean;
  /** Late at night: most windows are lit. */
  night?: boolean;
}) {
  const [x, y, z] = at;
  const [w, d] = size;
  const h = floors * FLOOR + 0.14;
  const across = Math.max(2, Math.round(w / 0.3));
  const deep = Math.max(2, Math.round(d / 0.3));
  const on = t % 2 < 1;
  const glass = (k: number) => {
    const v = hash(seed * 17.3 + k);
    if (v > 0.95) return on ? GLASS_LIT : GLASS;
    if (v > (night ? 0.42 : 0.74)) return GLASS_LIT;
    if (v > (night ? 0.3 : 0.66)) return GLASS_COOL;
    return GLASS;
  };
  const panes: ReactNode[] = [];
  for (let f = 0; f < floors; f++) {
    const py = y + 0.14 + f * FLOOR + FLOOR * 0.5;
    const ground = f === 0 && door;
    for (let c = 0; c < across; c++) {
      // The ground floor's middle bay on the left face is the door.
      if (ground && c === Math.floor(across / 2)) continue;
      panes.push(
        <PaneZ
          key={`z${f}-${c}`}
          at={[x + ((c + 0.5) * w) / across, py, z + d + OFF]}
          size={[(w / across) * 0.62, FLOOR * 0.52]}
          color={glass(f * 31 + c)}
        />,
      );
    }
    for (let c = 0; c < deep; c++) {
      panes.push(
        <PaneX
          key={`x${f}-${c}`}
          at={[x + w + OFF, py, z + ((c + 0.5) * d) / deep]}
          size={[(d / deep) * 0.62, FLOOR * 0.52]}
          color={glass(f * 31 + c + 500)}
        />,
      );
    }
    // A line under each storey, on both faces.
    panes.push(
      <PaneZ
        key={`lz${f}`}
        at={[x + w / 2, y + 0.14 + f * FLOOR + 0.02, z + d + OFF]}
        size={[w, 0.025]}
        color={trim.left}
      />,
      <PaneX
        key={`lx${f}`}
        at={[x + w + OFF, y + 0.14 + f * FLOOR + 0.02, z + d / 2]}
        size={[d, 0.025]}
        color={trim.right}
      />,
    );
  }
  return (
    <>
      <Place at={[x, y, z]} size={[w, h, d]} tone={tone} />
      <Place at={[x - 0.03, y, z - 0.03]} size={[w + 0.06, 0.1, d + 0.06]} tone={trim} />
      <Place at={[x - 0.04, y + h, z - 0.04]} size={[w + 0.08, 0.07, d + 0.08]} tone={trim} />
      {panes}
      {door && (
        <>
          <PaneZ
            at={[x + ((Math.floor(across / 2) + 0.5) * w) / across, y + 0.14 + 0.17, z + d + OFF]}
            size={[(w / across) * 0.7, 0.34]}
            color="#0d1117"
          />
          <Place
            at={[x + (Math.floor(across / 2) * w) / across - 0.03, y + 0.5, z + d]}
            size={[w / across + 0.06, 0.04, 0.14]}
            tone={trim}
          />
        </>
      )}
    </>
  );
}

/** What stands on a roof at height `y`: an air unit with its fan, a water tank, an antenna, a hatch. */
export function RoofKit({ at, size, seed = 1 }: { at: V3; size: [number, number]; seed?: number }) {
  const [x, y, z] = at;
  const [w, d] = size;
  const ax = x + 0.12 + hash(seed) * (w - 0.6);
  const az = z + 0.12 + hash(seed + 1) * (d - 0.6);
  return (
    <>
      {/* An air unit, its fan a dark disc. */}
      <Place at={[ax, y, az]} size={[0.34, 0.16, 0.26]} tone={C.steel} />
      <mesh position={[ax + 0.17, y + 0.162, az + 0.13]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09, 16]} />
        <Flat color="#21262d" />
      </mesh>
      {/* A water tank on four legs. */}
      {w > 1 && d > 1 && (
        <>
          <Place at={[x + w - 0.5, y, z + 0.14]} size={[0.3, 0.1, 0.3]} tone={T.dark} />
          <Place
            at={[x + w - 0.52, y + 0.1, z + 0.12]}
            size={[0.34, 0.26, 0.34]}
            tone={C.concrete}
          />
        </>
      )}
      {/* An antenna with a red lamp. */}
      <Place at={[x + 0.14, y, z + d - 0.2]} size={[0.04, 0.5, 0.04]} tone={C.steel} />
      <Place at={[x + 0.12, y + 0.5, z + d - 0.22]} size={[0.08, 0.06, 0.08]} tone={C.red} />
      {/* A hatch. */}
      <Place at={[x + w / 2 - 0.1, y, z + d / 2]} size={[0.22, 0.05, 0.22]} tone={T.dark} />
    </>
  );
}

/** A row of solar panels lying on a roof, each a dark pane with a grid. */
export function Solar({ at, n = 3 }: { at: V3; n?: number }) {
  const [x, y, z] = at;
  return (
    <>
      {range(n).map((i) => (
        <group key={i}>
          <Place at={[x + i * 0.36, y, z]} size={[0.32, 0.04, 0.5]} tone={C.blue} />
          <PaneY
            at={[x + i * 0.36 + 0.16, y + 0.042, z + 0.25]}
            size={[0.26, 0.44]}
            color="#12366e"
          />
          <PaneY
            at={[x + i * 0.36 + 0.16, y + 0.043, z + 0.25]}
            size={[0.02, 0.44]}
            color="#79c0ff"
          />
          <PaneY
            at={[x + i * 0.36 + 0.16, y + 0.043, z + 0.25]}
            size={[0.26, 0.02]}
            color="#79c0ff"
          />
        </group>
      ))}
    </>
  );
}

/**
 * A stretch of road with a dashed middle line and kerbs. `along` is the axis it runs on; `at` is
 * its back corner, `long` its length and `wide` its width.
 */
export function Road({
  at,
  long,
  wide = 1.2,
  along = "x",
}: {
  at: V3;
  long: number;
  wide?: number;
  along?: "x" | "z";
}) {
  const [x, y, z] = at;
  const dashes = Math.floor(long / 0.5);
  return (
    <>
      <Place
        at={[x, y, z]}
        size={along === "x" ? [long, 0.02, wide] : [wide, 0.02, long]}
        tone={C.road}
      />
      {range(dashes).map((i) => {
        const s = 0.25 + i * 0.5;
        return along === "x" ? (
          <PaneY
            key={i}
            at={[x + s, y + 0.022, z + wide / 2]}
            size={[0.24, 0.035]}
            color="#c9d1d9"
          />
        ) : (
          <PaneY
            key={i}
            at={[x + wide / 2, y + 0.022, z + s]}
            size={[0.035, 0.24]}
            color="#c9d1d9"
          />
        );
      })}
    </>
  );
}

/** A zebra crossing over a road: stripes across `wide`, starting at `at`. */
export function Crossing({
  at,
  wide = 1.2,
  along = "x",
}: {
  at: V3;
  wide?: number;
  along?: "x" | "z";
}) {
  const [x, y, z] = at;
  return (
    <>
      {range(6).map((i) => {
        const s = 0.1 + i * (wide - 0.2) * 0.2;
        return along === "x" ? (
          <PaneY key={i} at={[x + 0.2, y + 0.023, z + s]} size={[0.36, 0.09]} color="#e6edf3" />
        ) : (
          <PaneY key={i} at={[x + s, y + 0.023, z + 0.2]} size={[0.09, 0.36]} color="#e6edf3" />
        );
      })}
    </>
  );
}

/**
 * A car, by its middle on the road. It points along +x, or along +z when `turned`; `kind` is a
 * saloon, a van or a taxi with its sign.
 */
export function Car({
  at,
  tone = C.blue,
  turned = false,
  kind = "saloon",
}: {
  at: V3;
  tone?: Tone;
  turned?: boolean;
  kind?: "saloon" | "van" | "taxi";
}) {
  const van = kind === "van";
  const long = van ? 0.74 : 0.64;
  const cabin = van ? 0.52 : 0.32;
  const top = van ? 0.26 : 0.15;
  return (
    <group position={at} rotation={[0, turned ? -Math.PI / 2 : 0, 0]}>
      <IsoBox size={[long, 0.15, 0.32]} position={[0, 0.145, 0]} tone={tone} />
      <IsoBox
        size={[cabin, top, 0.28]}
        position={[van ? -0.06 : -0.04, 0.22 + top / 2, 0]}
        tone={tone}
      />
      {/* Windows: the side that shows, and the windscreen. */}
      <PaneZ
        at={[van ? -0.06 : -0.04, 0.23 + top / 2, 0.141 + OFF]}
        size={[cabin * 0.8, top * 0.62]}
        color="#0d1b2e"
      />
      <PaneX
        at={[(van ? -0.06 : -0.04) + cabin / 2 + OFF, 0.23 + top / 2, 0]}
        size={[0.22, top * 0.62]}
        color="#0d1b2e"
      />
      {/* Head lamps and a bumper. */}
      <PaneX at={[long / 2 + OFF, 0.16, 0.1]} size={[0.07, 0.05]} color="#ffe9a3" />
      <PaneX at={[long / 2 + OFF, 0.16, -0.1]} size={[0.07, 0.05]} color="#ffe9a3" />
      <IsoBox
        size={[0.04, 0.05, 0.34]}
        position={[long / 2, 0.09, 0]}
        tone={T.dark}
        edges={false}
      />
      {/* Wheels. */}
      {[-long * 0.3, long * 0.3].map((wx) => (
        <group key={wx}>
          <IsoBox
            size={[0.14, 0.14, 0.05]}
            position={[wx, 0.07, 0.165]}
            tone={T.floor}
            edges={false}
          />
          <PaneZ at={[wx, 0.07, 0.191 + OFF]} size={[0.06, 0.06]} color="#8b949e" />
        </group>
      ))}
      {kind === "taxi" && (
        <IsoBox size={[0.14, 0.05, 0.08]} position={[-0.04, 0.4, 0]} tone={C.gold} />
      )}
    </group>
  );
}

/** A tree: a trunk and three steps of leaves, `s` its size. */
export function Tree({ at, s = 1, tone = T.leaf }: { at: V3; s?: number; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      <Place
        at={[x - 0.04 * s, y, z - 0.04 * s]}
        size={[0.08 * s, 0.26 * s, 0.08 * s]}
        tone={T.wood}
      />
      <Place
        at={[x - 0.2 * s, y + 0.24 * s, z - 0.2 * s]}
        size={[0.4 * s, 0.22 * s, 0.4 * s]}
        tone={tone}
      />
      <Place
        at={[x - 0.15 * s, y + 0.46 * s, z - 0.15 * s]}
        size={[0.3 * s, 0.2 * s, 0.3 * s]}
        tone={tone}
      />
      <Place
        at={[x - 0.09 * s, y + 0.66 * s, z - 0.09 * s]}
        size={[0.18 * s, 0.16 * s, 0.18 * s]}
        tone={T.green}
      />
    </>
  );
}

/** A low hedge. */
export function Hedge({ at, long, along = "x" }: { at: V3; long: number; along?: "x" | "z" }) {
  return (
    <Place at={at} size={along === "x" ? [long, 0.16, 0.16] : [0.16, 0.16, long]} tone={T.leaf} />
  );
}

/** A street lamp: a pole, an arm over the road and a lit head. */
export function Lamp({ at, over = "z" }: { at: V3; over?: "x" | "z" }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x - 0.025, y, z - 0.025]} size={[0.05, 0.86, 0.05]} tone={C.steel} />
      <Place
        at={over === "z" ? [x - 0.025, y + 0.84, z - 0.025] : [x - 0.025, y + 0.84, z - 0.025]}
        size={over === "z" ? [0.05, 0.04, 0.3] : [0.3, 0.04, 0.05]}
        tone={C.steel}
      />
      <Place
        at={over === "z" ? [x - 0.05, y + 0.78, z + 0.2] : [x + 0.2, y + 0.78, z - 0.05]}
        size={[0.1, 0.06, 0.1]}
        tone={C.gold}
      />
    </>
  );
}

/** A traffic cone. */
export function Cone({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x - 0.09, y, z - 0.09]} size={[0.18, 0.03, 0.18]} tone={C.brick} />
      <Place at={[x - 0.06, y + 0.03, z - 0.06]} size={[0.12, 0.09, 0.12]} tone={C.brick} />
      <Place at={[x - 0.045, y + 0.12, z - 0.045]} size={[0.09, 0.05, 0.09]} tone={C.white} />
      <Place at={[x - 0.03, y + 0.17, z - 0.03]} size={[0.06, 0.08, 0.06]} tone={C.brick} />
    </>
  );
}

/** A striped barrier on two feet, running along `along`. */
export function Barrier({ at, along = "x" }: { at: V3; along?: "x" | "z" }) {
  const [x, y, z] = at;
  const stripes = 5;
  return (
    <>
      {[0.04, 0.6].map((s) => (
        <Place
          key={s}
          at={along === "x" ? [x + s, y, z - 0.04] : [x - 0.04, y, z + s]}
          size={along === "x" ? [0.05, 0.12, 0.14] : [0.14, 0.12, 0.05]}
          tone={T.dark}
        />
      ))}
      {range(stripes).map((i) => (
        <Place
          key={i}
          at={along === "x" ? [x + i * 0.14, y + 0.12, z] : [x, y + 0.12, z + i * 0.14]}
          size={along === "x" ? [0.14, 0.14, 0.05] : [0.05, 0.14, 0.14]}
          tone={i % 2 === 0 ? C.red : C.white}
        />
      ))}
    </>
  );
}

/** A pallet stacked with bricks, `rows` high. */
export function Pallet({ at, rows = 3, tone = C.brick }: { at: V3; rows?: number; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[0.52, 0.05, 0.42]} tone={T.wood} />
      {range(rows).map((r) =>
        [0, 1, 2].map((c) => (
          <Place
            key={`${r}-${c}`}
            at={[x + 0.03 + c * 0.16 + (r % 2) * 0.02, y + 0.05 + r * 0.1, z + 0.04]}
            size={[0.14, 0.1, 0.34]}
            tone={tone}
          />
        )),
      )}
    </>
  );
}

/** A site office: a container on blocks with a door, two windows and a stripe. */
export function Cabin({ at, tone = C.gold }: { at: V3; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x + 0.06, y, z + 0.06]} size={[0.14, 0.08, 0.5]} tone={T.dark} />
      <Place at={[x + 1.2, y, z + 0.06]} size={[0.14, 0.08, 0.5]} tone={T.dark} />
      <Place at={[x, y + 0.08, z]} size={[1.4, 0.56, 0.62]} tone={tone} />
      <PaneZ at={[x + 0.7, y + 0.2, z + 0.62 + OFF]} size={[1.4, 0.06]} color="#0d1117" />
      <PaneZ at={[x + 0.28, y + 0.34, z + 0.62 + OFF]} size={[0.2, 0.42]} color="#21262d" />
      <PaneZ at={[x + 0.72, y + 0.44, z + 0.62 + OFF]} size={[0.3, 0.18]} color={GLASS_COOL} />
      <PaneZ at={[x + 1.12, y + 0.44, z + 0.62 + OFF]} size={[0.3, 0.18]} color={GLASS_LIT} />
      <PaneX at={[x + 1.4 + OFF, y + 0.44, z + 0.31]} size={[0.32, 0.18]} color={GLASS_COOL} />
      <Place at={[x - 0.02, y + 0.64, z - 0.02]} size={[1.44, 0.04, 0.66]} tone={C.steel} />
    </>
  );
}

/**
 * A tower crane: a lattice mast, a cab, a long jib with its trolley and a counterweight, and a
 * load on the hook that rises and falls once a loop. `at` is the mast's corner; the jib runs
 * along +x.
 */
export function Crane({
  at,
  tall = 5.2,
  reach = 3.4,
  t = 0,
}: {
  at: V3;
  tall?: number;
  reach?: number;
  t?: number;
}) {
  const [x, y, z] = at;
  const m = 0.3;
  const steps = Math.floor(tall / 0.4);
  const swing = (Math.sin((t / 2) * Math.PI * 2) + 1) / 2;
  const drop = 1.2 + swing * 0.9;
  const trolley = x + m + reach * 0.62;
  return (
    <>
      <Place at={[x - 0.15, y, z - 0.15]} size={[m + 0.3, 0.1, m + 0.3]} tone={C.concrete} />
      {[
        [0, 0],
        [m - 0.04, 0],
        [0, m - 0.04],
        [m - 0.04, m - 0.04],
      ].map(([dx, dz]) => (
        <Place
          key={`${dx}${dz}`}
          at={[x + (dx ?? 0), y + 0.1, z + (dz ?? 0)]}
          size={[0.04, tall, 0.04]}
          tone={C.gold}
        />
      ))}
      {range(steps).map((i) => (
        <group key={i}>
          <Place at={[x, y + 0.3 + i * 0.4, z + m - 0.04]} size={[m, 0.03, 0.04]} tone={C.gold} />
          <Place at={[x + m - 0.04, y + 0.3 + i * 0.4, z]} size={[0.04, 0.03, m]} tone={C.gold} />
        </group>
      ))}
      {/* The cab, with a window on each face that shows. */}
      <Place
        at={[x - 0.06, y + tall + 0.1, z - 0.06]}
        size={[m + 0.12, 0.34, m + 0.12]}
        tone={C.white}
      />
      <PaneZ
        at={[x + m / 2, y + tall + 0.29, z + m + 0.06 + OFF]}
        size={[0.28, 0.16]}
        color={GLASS_COOL}
      />
      <PaneX
        at={[x + m + 0.06 + OFF, y + tall + 0.29, z + m / 2]}
        size={[0.28, 0.16]}
        color={GLASS_COOL}
      />
      {/* The jib, its lattice marks, and the counter-jib with its weight. */}
      <Place
        at={[x - 1.2, y + tall + 0.44, z + 0.09]}
        size={[reach + 1.2 + m, 0.1, 0.12]}
        tone={C.gold}
      />
      {range(Math.floor(reach / 0.34)).map((i) => (
        <Place
          key={i}
          at={[x + m + 0.1 + i * 0.34, y + tall + 0.54, z + 0.12]}
          size={[0.03, 0.14, 0.06]}
          tone={C.gold}
        />
      ))}
      <Place at={[x + m, y + tall + 0.68, z + 0.12]} size={[reach, 0.03, 0.06]} tone={C.gold} />
      <Place at={[x - 1.15, y + tall + 0.2, z + 0.03]} size={[0.5, 0.26, 0.24]} tone={C.concrete} />
      <Place
        at={[x + m / 2 - 0.03, y + tall + 0.54, z + m / 2 - 0.03]}
        size={[0.06, 0.5, 0.06]}
        tone={C.gold}
      />
      <Place
        at={[x + m / 2 - 0.05, y + tall + 1.04, z + m / 2 - 0.05]}
        size={[0.1, 0.07, 0.1]}
        tone={C.red}
      />
      {/* The trolley, the cable and the load. */}
      <Place
        at={[trolley - 0.1, y + tall + 0.36, z + 0.07]}
        size={[0.2, 0.08, 0.16]}
        tone={T.dark}
      />
      <Place
        at={[trolley - 0.012, y + tall + 0.36 - drop, z + 0.138]}
        size={[0.024, drop, 0.024]}
        tone={T.dark}
      />
      <Place
        at={[trolley - 0.06, y + tall + 0.28 - drop, z + 0.09]}
        size={[0.12, 0.08, 0.12]}
        tone={C.steel}
      />
      <Place
        at={[trolley - 0.22, y + tall + 0.04 - drop, z - 0.07]}
        size={[0.44, 0.24, 0.44]}
        tone={T.wood}
      />
      <mesh position={[trolley, y + tall + 0.282 - drop, z + 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.24, 0.24]} />
        <Flat color={LIT} />
      </mesh>
    </>
  );
}

/**
 * Scaffolding against a +x face: poles and boards in a grid `long` (along z) by `tall`, standing
 * `out` from the wall at `at` (the wall's foot, lowest z).
 */
export function Scaffold({
  at,
  long,
  tall,
  out = 0.28,
}: {
  at: V3;
  long: number;
  tall: number;
  out?: number;
}) {
  const [x, y, z] = at;
  const bays = Math.max(1, Math.round(long / 0.6));
  const lifts = Math.max(1, Math.round(tall / FLOOR));
  return (
    <>
      {range(bays + 1).map((i) => (
        <Place
          key={`p${i}`}
          at={[x + out, y, z + (i * long) / bays - 0.015]}
          size={[0.03, tall, 0.03]}
          tone={C.steel}
        />
      ))}
      {range(lifts).map((i) => (
        <group key={`l${i}`}>
          <Place
            at={[x, y + (i + 1) * (tall / lifts) - 0.03, z]}
            size={[out + 0.03, 0.03, long]}
            tone={T.wood}
          />
          <Place
            at={[x + out, y + (i + 1) * (tall / lifts) + 0.14, z]}
            size={[0.02, 0.02, long]}
            tone={C.gold}
          />
        </group>
      ))}
    </>
  );
}

/**
 * A building going up: finished storeys with windows below, then bare slabs on columns, then
 * columns reaching for the next slab.
 */
export function Rising({
  at,
  size,
  done,
  bare,
  seed = 1,
  t = 0,
}: {
  at: V3;
  size: [number, number];
  done: number;
  bare: number;
  seed?: number;
  t?: number;
}) {
  const [x, y, z] = at;
  const [w, d] = size;
  const top = y + done * FLOOR + 0.14;
  const posts: [number, number][] = [];
  for (let i = 0; i <= 2; i++)
    for (let j = 0; j <= 2; j++) posts.push([(i * (w - 0.1)) / 2, (j * (d - 0.1)) / 2]);
  return (
    <>
      <Tower at={at} size={size} floors={done} tone={C.concrete} seed={seed} t={t} trim={C.steel} />
      {range(bare).map((f) => (
        <group key={f}>
          {posts.map(([dx, dz]) => (
            <Place
              key={`${dx}${dz}`}
              at={[x + dx, top + 0.07 + f * FLOOR, z + dz]}
              size={[0.1, FLOOR - 0.06, 0.1]}
              tone={C.concrete}
            />
          ))}
          <Place
            at={[x - 0.03, top + 0.07 + (f + 1) * FLOOR - 0.06, z - 0.03]}
            size={[w + 0.06, 0.06, d + 0.06]}
            tone={C.steel}
          />
        </group>
      ))}
      {/* Starter bars for the next storey. */}
      {posts.map(([dx, dz]) => (
        <Place
          key={`r${dx}${dz}`}
          at={[x + dx + 0.035, top + 0.07 + bare * FLOOR, z + dz + 0.035]}
          size={[0.03, 0.24, 0.03]}
          tone={C.red}
        />
      ))}
    </>
  );
}

/** A bench. */
export function Bench({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y + 0.1, z]} size={[0.5, 0.04, 0.16]} tone={T.wood} />
      <Place at={[x, y + 0.14, z]} size={[0.5, 0.16, 0.03]} tone={T.wood} />
      <Place at={[x + 0.04, y, z + 0.02]} size={[0.04, 0.1, 0.12]} tone={T.dark} />
      <Place at={[x + 0.42, y, z + 0.02]} size={[0.04, 0.1, 0.12]} tone={T.dark} />
    </>
  );
}

/** A billboard on two posts facing +z, with `children` drawn on its face from its centre. */
export function Billboard({
  at,
  size,
  children,
}: {
  at: V3;
  size: [number, number];
  children?: ReactNode;
}) {
  const [x, y, z] = at;
  const [w, h] = size;
  return (
    <>
      <Place at={[x + 0.1, y, z]} size={[0.06, 0.5, 0.06]} tone={C.steel} />
      <Place at={[x + w - 0.16, y, z]} size={[0.06, 0.5, 0.06]} tone={C.steel} />
      <Place at={[x, y + 0.5, z]} size={[w, h, 0.08]} tone={T.floor} />
      <group position={[x + w / 2, y + 0.5 + h / 2, z + 0.08 + OFF]}>{children}</group>
    </>
  );
}

/** A hoarding round a site: fence panels along `along`, each with a stripe. */
export function Fence({ at, long, along = "x" }: { at: V3; long: number; along?: "x" | "z" }) {
  const [x, y, z] = at;
  const n = Math.max(1, Math.round(long / 0.5));
  return (
    <>
      {range(n).map((i) => (
        <group key={i}>
          <Place
            at={along === "x" ? [x + (i * long) / n, y, z] : [x, y, z + (i * long) / n]}
            size={along === "x" ? [long / n - 0.03, 0.34, 0.04] : [0.04, 0.34, long / n - 0.03]}
            tone={C.steel}
          />
          {along === "x" ? (
            <PaneZ
              at={[x + ((i + 0.5) * long) / n, y + 0.24, z + 0.04 + OFF]}
              size={[long / n - 0.08, 0.05]}
              color="#e3b341"
            />
          ) : (
            <PaneX
              at={[x + 0.04 + OFF, y + 0.24, z + ((i + 0.5) * long) / n]}
              size={[long / n - 0.08, 0.05]}
              color="#e3b341"
            />
          )}
        </group>
      ))}
    </>
  );
}

/** A market stall: a counter with goods under a striped awning on four posts. */
export function Stall({ at, tone = C.red }: { at: V3; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      {[
        [0, 0],
        [0.6, 0],
        [0, 0.46],
        [0.6, 0.46],
      ].map(([dx, dz]) => (
        <Place
          key={`${dx}${dz}`}
          at={[x + (dx ?? 0), y, z + (dz ?? 0)]}
          size={[0.04, 0.5, 0.04]}
          tone={C.steel}
        />
      ))}
      <Place at={[x + 0.02, y, z + 0.08]} size={[0.6, 0.22, 0.3]} tone={T.wood} />
      {[C.gold, T.green, C.red].map((goods, i) => (
        <Place
          key={goods.left}
          at={[x + 0.07 + i * 0.19, y + 0.22, z + 0.14]}
          size={[0.14, 0.1, 0.16]}
          tone={goods}
        />
      ))}
      {range(5).map((i) => (
        <Place
          key={i}
          at={[x - 0.03 + i * 0.14, y + 0.5, z - 0.04]}
          size={[0.14, 0.05, 0.6]}
          tone={i % 2 === 0 ? tone : C.white}
        />
      ))}
    </>
  );
}

/** Bleachers `long` along x, rising toward the back in `rows` steps, with a line of seats on each. */
export function Bleachers({
  at,
  long,
  rows = 3,
  tone = C.blue,
}: {
  at: V3;
  long: number;
  rows?: number;
  tone?: Tone;
}) {
  const [x, y, z] = at;
  return (
    <>
      {range(rows).map((r) => (
        <group key={r}>
          <Place
            at={[x, y, z + (rows - 1 - r) * 0.2]}
            size={[long, 0.14 * (r + 1), 0.2]}
            tone={C.steel}
          />
          <PaneY
            at={[x + long / 2, y + 0.14 * (r + 1) + OFF, z + (rows - 1 - r) * 0.2 + 0.1]}
            size={[long - 0.06, 0.1]}
            color={tone.left}
          />
        </group>
      ))}
    </>
  );
}

/** A mountain in steps, snow on its top two, a flag on the summit. */
export function Mountain({
  at,
  size,
  levels = 6,
}: {
  at: V3;
  size: [number, number];
  levels?: number;
}) {
  const [x, y, z] = at;
  const [w, d] = size;
  const h = 0.36;
  const step = Math.min(w, d) / (levels * 2 + 0.6);
  return (
    <>
      {range(levels).map((i) => (
        <Place
          key={i}
          at={[x + i * step, y + i * h, z + i * step]}
          size={[w - i * step * 2, h, d - i * step * 2]}
          tone={i >= levels - 2 ? C.white : i % 2 === 0 ? C.steel : T.mid}
        />
      ))}
      <Place
        at={[x + w / 2 - 0.02, y + levels * h, z + d / 2 - 0.02]}
        size={[0.04, 0.5, 0.04]}
        tone={T.wood}
      />
      <Place
        at={[x + w / 2 + 0.02, y + levels * h + 0.3, z + d / 2 - 0.015]}
        size={[0.26, 0.18, 0.03]}
        tone={C.red}
      />
    </>
  );
}

/** A lake: a slab of water with paler ripples on it. */
export function Lake({ at, size }: { at: V3; size: [number, number] }) {
  const [x, y, z] = at;
  const [w, d] = size;
  return (
    <>
      <Place at={[x, y, z]} size={[w, 0.03, d]} tone={C.blue} />
      {range(5).map((i) => (
        <PaneY
          key={i}
          at={[x + 0.3 + hash(i + 3) * (w - 0.6), y + 0.032, z + 0.2 + (i * (d - 0.4)) / 4]}
          size={[0.3 + hash(i + 9) * 0.3, 0.035]}
          color="#a5d6ff"
        />
      ))}
    </>
  );
}

/** A tent in three steps, its door on the +z face. */
export function Tent({ at, tone = C.brick }: { at: V3; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[0.56, 0.14, 0.5]} tone={tone} />
      <Place at={[x + 0.09, y + 0.14, z]} size={[0.38, 0.14, 0.5]} tone={tone} />
      <Place at={[x + 0.19, y + 0.28, z]} size={[0.18, 0.12, 0.5]} tone={tone} />
      <PaneZ at={[x + 0.28, y + 0.12, z + 0.5 + OFF]} size={[0.16, 0.22]} color="#0d1117" />
    </>
  );
}

/** A camp fire: two logs and a flame that flickers twice a loop. */
export function Campfire({ at, t = 0 }: { at: V3; t?: number }) {
  const [x, y, z] = at;
  const flick = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  return (
    <>
      <Place at={[x - 0.16, y, z - 0.03]} size={[0.32, 0.05, 0.06]} tone={T.wood} />
      <Place at={[x - 0.03, y, z - 0.16]} size={[0.06, 0.05, 0.32]} tone={T.wood} />
      <Place
        at={[x - 0.08, y + 0.05, z - 0.08]}
        size={[0.16, 0.12 + flick * 0.04, 0.16]}
        tone={C.red}
      />
      <Place
        at={[x - 0.05, y + 0.17 + flick * 0.04, z - 0.05]}
        size={[0.1, 0.1 + flick * 0.06, 0.1]}
        tone={C.gold}
      />
    </>
  );
}

/** A clock face on a +z wall, by its centre: its long hand goes round once a loop. */
export function ClockFace({ at, r = 0.3, t = 0 }: { at: V3; r?: number; t?: number }) {
  return (
    <group position={at}>
      <mesh>
        <circleGeometry args={[r, 32]} />
        <Flat color="#f0f6fc" />
      </mesh>
      <mesh position={[0, 0, 0.002]} rotation={[0, 0, -(t / 2) * Math.PI * 2]}>
        <planeGeometry args={[0.035, r * 1.5]} />
        <Flat color="#0d1117" />
      </mesh>
      <mesh position={[0, 0, 0.003]} rotation={[0, 0, -0.9]}>
        <planeGeometry args={[0.05, r * 1.0]} />
        <Flat color="#da3633" />
      </mesh>
    </group>
  );
}

/** A fountain: a basin of water, a column, a bowl, and drops that rise and fall. */
export function Fountain({ at, t = 0 }: { at: V3; t?: number }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x, y, z]} size={[1.0, 0.12, 1.0]} tone={C.concrete} />
      <PaneY at={[x + 0.5, y + 0.122, z + 0.5]} size={[0.84, 0.84]} color="#388bfd" />
      <Place at={[x + 0.42, y + 0.12, z + 0.42]} size={[0.16, 0.4, 0.16]} tone={C.concrete} />
      <Place at={[x + 0.28, y + 0.52, z + 0.28]} size={[0.44, 0.07, 0.44]} tone={C.concrete} />
      <PaneY at={[x + 0.5, y + 0.592, z + 0.5]} size={[0.34, 0.34]} color="#79c0ff" />
      {range(4).map((i) => {
        const rise = 0.1 + 0.26 * Math.abs(Math.sin((t / 2 + i / 4) * Math.PI * 2));
        return (
          <Place
            key={i}
            at={[x + 0.47, y + 0.6 + rise, z + 0.47]}
            size={[0.06, 0.06, 0.06]}
            tone={C.blue}
          />
        );
      })}
    </>
  );
}

/** Bunting: small flags in turn on a line between two posts, `long` along x. */
export function Bunting({ at, long, tall = 0.9 }: { at: V3; long: number; tall?: number }) {
  const [x, y, z] = at;
  const tones = [C.red, C.gold, C.teal, C.violet, C.blue];
  const n = Math.max(3, Math.round(long / 0.26));
  return (
    <>
      <Place at={[x, y, z]} size={[0.04, tall, 0.04]} tone={C.steel} />
      <Place at={[x + long, y, z]} size={[0.04, tall, 0.04]} tone={C.steel} />
      <Place at={[x, y + tall - 0.02, z + 0.01]} size={[long + 0.04, 0.015, 0.015]} tone={T.dark} />
      {range(n).map((i) => (
        <Place
          key={i}
          at={[x + 0.1 + (i * (long - 0.2)) / n, y + tall - 0.14, z + 0.005]}
          size={[0.12, 0.12, 0.025]}
          tone={tones[i % tones.length] ?? C.red}
        />
      ))}
    </>
  );
}

/** A bus, by its middle on the road: windows down its side, a route sign over the windscreen. */
export function Bus({
  at,
  tone = C.teal,
  turned = false,
}: {
  at: V3;
  tone?: Tone;
  turned?: boolean;
}) {
  return (
    <group position={at} rotation={[0, turned ? -Math.PI / 2 : 0, 0]}>
      <IsoBox size={[1.2, 0.4, 0.38]} position={[0, 0.27, 0]} tone={tone} />
      {range(5).map((i) => (
        <PaneZ
          key={i}
          at={[-0.44 + i * 0.22, 0.34, 0.19 + OFF]}
          size={[0.16, 0.14]}
          color="#0d1b2e"
        />
      ))}
      <PaneZ at={[0, 0.17, 0.19 + OFF]} size={[1.2, 0.04]} color="#f0f6fc" />
      <PaneX at={[0.6 + OFF, 0.32, 0]} size={[0.3, 0.16]} color="#0d1b2e" />
      <PaneX at={[0.6 + OFF, 0.43, 0]} size={[0.24, 0.05]} color="#ffd866" />
      {[-0.38, 0.38].map((wx) => (
        <group key={wx}>
          <IsoBox
            size={[0.16, 0.16, 0.05]}
            position={[wx, 0.08, 0.195]}
            tone={T.floor}
            edges={false}
          />
          <PaneZ at={[wx, 0.08, 0.221 + OFF]} size={[0.07, 0.07]} color="#8b949e" />
        </group>
      ))}
    </group>
  );
}

/** A round café table with two stools. */
export function Table({ at, tone = C.white }: { at: V3; tone?: Tone }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x - 0.03, y, z - 0.03]} size={[0.06, 0.2, 0.06]} tone={C.steel} />
      <Place at={[x - 0.16, y + 0.2, z - 0.16]} size={[0.32, 0.04, 0.32]} tone={tone} />
      <Place at={[x - 0.32, y, z - 0.05]} size={[0.1, 0.12, 0.1]} tone={T.wood} />
      <Place at={[x + 0.22, y, z - 0.05]} size={[0.1, 0.12, 0.1]} tone={T.wood} />
    </>
  );
}

/** A striped awning over a shop front on a +z wall, `long` along x. */
export function Awning({ at, long, tone = C.red }: { at: V3; long: number; tone?: Tone }) {
  const [x, y, z] = at;
  const n = Math.max(3, Math.round(long / 0.16));
  return (
    <>
      {range(n).map((i) => (
        <Place
          key={i}
          at={[x + (i * long) / n, y, z]}
          size={[long / n, 0.05, 0.3]}
          tone={i % 2 === 0 ? tone : C.white}
        />
      ))}
    </>
  );
}

/** A floodlight on a tall mast. */
export function Floodlight({ at }: { at: V3 }) {
  const [x, y, z] = at;
  return (
    <>
      <Place at={[x - 0.03, y, z - 0.03]} size={[0.06, 1.5, 0.06]} tone={C.steel} />
      <Place at={[x - 0.16, y + 1.5, z - 0.06]} size={[0.32, 0.14, 0.12]} tone={T.dark} />
      <PaneZ at={[x, y + 1.57, z + 0.06 + OFF]} size={[0.26, 0.08]} color="#ffe9a3" />
    </>
  );
}
