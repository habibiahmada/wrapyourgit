import { useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

/*
 * A soft shadow on the ground under a character, from a radial gradient texture. drei's
 * ContactShadows renders its shadow inside useFrame, which a Remotion still never runs, so it came
 * out empty; this draws the same thing with no render pass and the same result every frame.
 */
export function BlobShadow({
  position = [0, 0.002, 0],
  size = [1.8, 1.3],
  opacity = 0.5,
}: {
  position?: [number, number, number];
  /** Width (x) and depth (z) of the shadow, in world units. */
  size?: [number, number];
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(0.45, "rgba(0,0,0,0.55)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
