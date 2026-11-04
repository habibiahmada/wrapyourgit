import { CanvasTexture, RepeatWrapping, type Texture } from "three";

/*
 * Paint for characters and costumes. History, all rejected by the maintainer on 2026-11-04: a
 * cel-shaded cartoon look; a lacquer finish whose faces were unlit stickers; then a clear-coated
 * vinyl that read as glass. What real toys look like up close is matte: light scatters instead of
 * mirroring, and the surface has a fine grain. So: high roughness, almost no clear coat, muted
 * environment reflections, and a faint procedural bump for the grain.
 * `Toon` and `Ink` keep their names so the character files stay unchanged; `Ink` draws nothing.
 */

let grain: Texture | null = null;

/**
 * A tiling grey noise used as a bump map. Seeded, not Math.random, so every render of a frame is
 * identical (AGENTS.md rule 3). Created once, on first use, because it needs a canvas.
 */
function grainTexture(): Texture | null {
  if (grain || typeof document === "undefined") return grain;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(size, size);
  let seed = 1337;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const v = 118 + ((seed >>> 24) % 20);
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  grain = new CanvasTexture(canvas);
  grain.wrapS = RepeatWrapping;
  grain.wrapT = RepeatWrapping;
  grain.repeat.set(4, 4);
  return grain;
}

/** Matte vinyl: soft, diffuse, with a fine grain and only a hint of sheen at grazing angles. */
export function Toon({ color, emissive }: { color: string; emissive?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.68}
      clearcoat={0.08}
      clearcoatRoughness={0.6}
      sheen={0.18}
      sheenRoughness={0.8}
      sheenColor="#ffffff"
      envMapIntensity={0.55}
      bumpMap={grainTexture()}
      bumpScale={0.35}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.15 : 0}
    />
  );
}

/** Eyes and noses: smoother than the body, a soft wet sheen rather than a mirror. */
export function Gloss({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.28}
      clearcoat={0.35}
      clearcoatRoughness={0.3}
      envMapIntensity={0.6}
    />
  );
}

/** The cartoon sparkle in an eye. Unlit and untoned so it stays pure white at any exposure. */
export function Sparkle() {
  return <meshBasicMaterial color="#ffffff" toneMapped={false} />;
}

/** Blush: powdery and matte. */
export function Blush({ color = "#ff9a8f" }: { color?: string }) {
  // Opaque: a see-through pink over green mixes to brown.
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.9}
      sheen={0.4}
      sheenColor="#ffd6d0"
      envMapIntensity={0.4}
    />
  );
}

/** Inside of a mouth: deep, warm and matte. */
export function MouthPaint() {
  return <meshPhysicalMaterial color="#3a0f14" roughness={0.75} envMapIntensity={0.4} />;
}

/** Formerly the ink outline of the cartoon look; kept as a no-op so call sites stay valid. */
export function Ink(_props: { width?: number }) {
  return null;
}
