/*
 * Paint for characters and costumes. The maintainer tried a cel-shaded cartoon look with ink
 * outlines and rejected it (2026-11-04); characters are glossy 3D like the world around them.
 * `Toon` and `Ink` keep their names so the character files stay unchanged: `Toon` is now a
 * lacquered physical material and `Ink` draws nothing.
 */

/** Glossy paint for characters and costumes, the same finish as the contribution cells. */
export function Toon({ color, emissive }: { color: string; emissive?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.32}
      clearcoat={0.8}
      clearcoatRoughness={0.25}
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.4 : 0}
    />
  );
}

/** Formerly the ink outline of the cartoon look; kept as a no-op so call sites stay valid. */
export function Ink(_props: { width?: number }) {
  return null;
}
