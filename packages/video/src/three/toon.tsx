/*
 * Paint for characters and costumes. The maintainer rejected a cel-shaded cartoon look
 * (2026-11-04) and then the first glossy pass as looking cheap: faces were unlit stickers and the
 * plastic had nothing to reflect. Everything here is a lit physical material, tuned to read as a
 * soft vinyl collectible under the studio rig in World.tsx (`StudioLights`).
 * `Toon` and `Ink` keep their names so the character files stay unchanged; `Ink` draws nothing.
 */

/** Soft vinyl: a satin base under a thin clear coat, with a little sheen on the edges. */
export function Toon({ color, emissive }: { color: string; emissive?: string }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.45}
      clearcoat={1}
      clearcoatRoughness={0.1}
      sheen={0.35}
      sheenRoughness={0.5}
      sheenColor="#ffffff"
      emissive={emissive ?? "#000000"}
      emissiveIntensity={emissive ? 0.4 : 0}
    />
  );
}

/** Wet-looking surfaces: eye whites, noses, pupils. The studio softboxes give the catchlights. */
export function Gloss({ color }: { color: string }) {
  return (
    <meshPhysicalMaterial color={color} roughness={0.08} clearcoat={1} clearcoatRoughness={0} />
  );
}

/** The cartoon sparkle in an eye. Unlit and untoned so it stays pure white at any exposure. */
export function Sparkle() {
  return <meshBasicMaterial color="#ffffff" toneMapped={false} />;
}

/** Blush: soft and matte, with a light sheen like powder. */
export function Blush({ color = "#ff9a8f" }: { color?: string }) {
  // Opaque: a see-through pink over green mixes to brown.
  return <meshPhysicalMaterial color={color} roughness={0.75} sheen={0.6} sheenColor="#ffd6d0" />;
}

/** Inside of a mouth: deep and warm rather than flat black. */
export function MouthPaint() {
  return <meshPhysicalMaterial color="#3a0f14" roughness={0.55} clearcoat={0.4} />;
}

/** Formerly the ink outline of the cartoon look; kept as a no-op so call sites stay valid. */
export function Ink(_props: { width?: number }) {
  return null;
}
