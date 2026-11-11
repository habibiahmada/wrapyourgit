import { Edges } from "@react-three/drei";
import type { ReactNode } from "react";

/*
 * Crisp isometric 3D, the look of the landing's references and its SVG hero: every box face is
 * one flat colour chosen by which way it faces (top lightest, the face toward the viewer's left
 * mid, toward the right darkest), with a hairline edge, and green light where something is on.
 * Flat colours are unlit (meshBasicMaterial), so lighting can't muddy them; real 3D depth means
 * nothing ever overlaps wrongly.
 */

export type V3 = [number, number, number];
export type Tone = { top: string; left: string; right: string; edge?: string };

export const T = {
  floor: { top: "#21262d", left: "#161b22", right: "#11161d", edge: "#30363d" },
  wall: { top: "#2d333b", left: "#1b2129", right: "#151a21", edge: "#30363d" },
  dark: { top: "#2d333b", left: "#21262d", right: "#181d24", edge: "#3d444d" },
  mid: { top: "#444c56", left: "#373e47", right: "#2d333b", edge: "#545d68" },
  wood: { top: "#5c4a3a", left: "#4a3b2e", right: "#3c3025", edge: "#6e5a48" },
  paper: { top: "#e6edf3", left: "#c9d1d9", right: "#b1bac4", edge: "#8b949e" },
  green: { top: "#3fd45a", left: "#2ea043", right: "#238636", edge: "#56e070" },
  greenDeep: { top: "#2ea043", left: "#238636", right: "#196c2e", edge: "#3fb950" },
  leaf: { top: "#2ea043", left: "#1f7a3a", right: "#196c2e", edge: "#3fb950" },
  navy: { top: "#1c2a4a", left: "#14203a", right: "#0f182c", edge: "#2b3d66" },
  owl: { top: "#8b6a4f", left: "#735740", right: "#5e4634", edge: "#a07f62" },
  cream: { top: "#f0e2c8", left: "#dbcaa9", right: "#c6b48f", edge: "#f7ecd8" },
} as const satisfies Record<string, Tone>;

export const LIT = "#39d353";
export const GREENS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;

/** Unlit flat colour. */
export function Flat({ color }: { color: string }) {
  return <meshBasicMaterial color={color} toneMapped={false} />;
}

/**
 * A box with one flat colour per face, by orientation: +y top, +z the viewer's left face,
 * +x the right face (the camera sits at +x, +y, +z). Hidden faces reuse the darkest.
 */
export function IsoBox({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  tone = T.dark,
  edges = true,
  children,
}: {
  size: V3;
  position?: V3;
  rotation?: V3;
  tone?: Tone;
  edges?: boolean;
  children?: ReactNode;
}) {
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z.
  const faces = [tone.right, tone.right, tone.top, tone.right, tone.left, tone.left];
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      {faces.map((c, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: one material per box face, in face order
        <meshBasicMaterial key={i} attach={`material-${i}`} color={c} toneMapped={false} />
      ))}
      {edges && <Edges color={tone.edge ?? "#30363d"} threshold={20} />}
      {children}
    </mesh>
  );
}

/** A box sitting on y = 0 at (x, z): position by its footprint corner, the way plans are drawn. */
export function Place({
  at,
  size,
  tone,
  edges,
  rotation,
}: {
  at: V3;
  size: V3;
  tone?: Tone;
  edges?: boolean;
  rotation?: V3;
}) {
  return (
    <IsoBox
      size={size}
      position={[at[0] + size[0] / 2, at[1] + size[1] / 2, at[2] + size[2] / 2]}
      tone={tone}
      edges={edges}
      rotation={rotation}
    />
  );
}

/** A lit panel (screens, windows, eyes): flat light, no edge. */
export function Light({
  size,
  position,
  rotation = [0, 0, 0],
  color = LIT,
}: {
  size: [number, number];
  position: V3;
  rotation?: V3;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <Flat color={color} />
    </mesh>
  );
}

/** A contribution graph on a face that looks toward +z (rotate the group for +x faces). */
export function Graph({
  cols,
  rows,
  cell,
  gap,
  seed = 1,
  t = 0,
}: {
  cols: number;
  rows: number;
  cell: number;
  gap: number;
  seed?: number;
  t?: number;
}) {
  const step = cell + gap;
  const sweep = Math.floor(((t % 2) / 2) * cols);
  const out: ReactNode[] = [];
  let s = seed * 7919 + 13;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      s = (s * 9301 + 49297) % 233280;
      const level = Math.floor((s / 233280) * 5);
      const lit = level === 0 ? "#161b22" : GREENS[Math.min(3, level - 1 + (c === sweep ? 1 : 0))];
      out.push(
        <mesh
          key={`${c}-${r}`}
          position={[c * step - ((cols - 1) * step) / 2, r * step - ((rows - 1) * step) / 2, 0]}
        >
          <planeGeometry args={[cell, cell]} />
          <Flat color={lit ?? LIT} />
        </mesh>,
      );
    }
  }
  return <group>{out}</group>;
}
