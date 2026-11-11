import { iso, type Vec, viewBoxOf } from "./iso";
import { IsoArt } from "./iso-art";
import type { Glyph, Scene } from "./section-scenes";

const LIT = "#39d353";
const p = ([x, y]: [number, number]) => `${x.toFixed(3)} ${y.toFixed(3)}`;
const line = (points: Vec[]) => `M${points.map((v) => p(iso(v))).join("L")}`;

function GlyphMark({ glyph }: { glyph: Glyph }) {
  switch (glyph.kind) {
    case "link":
      return (
        <path
          d={line([glyph.from, glyph.to])}
          fill="none"
          stroke={LIT}
          strokeOpacity="0.7"
          strokeWidth="1.25"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      );
    case "moon": {
      // A crescent: a lit disc with a canvas-coloured disc over its upper right.
      const [x, y] = iso(glyph.at);
      return (
        <g>
          <circle cx={x} cy={y} r="0.75" fill={LIT} />
          <circle cx={x + 0.35} cy={y - 0.25} r="0.68" fill="#0d1117" />
        </g>
      );
    }
    case "flap": {
      const [x, y, z] = glyph.at;
      return (
        <path
          d={line([
            [x, y, z],
            [x + glyph.width / 2, y + glyph.depth * 0.55, z],
            [x + glyph.width, y, z],
          ])}
          fill="none"
          stroke={LIT}
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    case "keyhole": {
      // On the vault's right face, which leans with the projection: a ring and a slot.
      const [x, y] = iso(glyph.at);
      return (
        <g fill={LIT}>
          <ellipse cx={x} cy={y} rx="0.32" ry="0.36" />
          <path
            d={`M${x - 0.13} ${y + 0.15}L${x + 0.13} ${y + 0.27}L${x + 0.13} ${y + 0.85}L${x - 0.13} ${y + 0.73}Z`}
          />
        </g>
      );
    }
  }
}

/** A section's isometric diorama (section-scenes.ts), decorative: the text beside it says it. */
export function SceneArt({ scene, className }: { scene: Scene; className?: string }) {
  const extra: Vec[] = scene.glyphs.flatMap((g) =>
    g.kind === "link" ? [g.from, g.to] : g.kind === "moon" ? [[g.at[0], g.at[1], g.at[2] + 1]] : [],
  );
  return (
    <IsoArt
      boxes={scene.boxes}
      viewBox={viewBoxOf(scene.boxes, extra, 0.8)}
      className={className}
      // Links lie on the ground, so they go under the blocks; marks on faces go over them.
      before={scene.glyphs
        .filter((g) => g.kind === "link")
        .map((glyph, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a scene's glyphs are a fixed list
          <GlyphMark key={i} glyph={glyph} />
        ))}
      after={scene.glyphs
        .filter((g) => g.kind !== "link")
        .map((glyph, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a scene's glyphs are a fixed list
          <GlyphMark key={i} glyph={glyph} />
        ))}
    />
  );
}
