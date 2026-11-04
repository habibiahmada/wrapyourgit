import { ThreeCanvas } from "@remotion/three";
import type { ArchetypeId } from "@wyg/schema";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Pose } from "./CellCharacter";
import { ArchetypeDiorama } from "./Dioramas";
import { HeroScene } from "./HeroScene";

export type ArtId = ArchetypeId | "hero" | `cell-${Pose}`;

/**
 * A 3D scene rendered by Remotion, used to bake still PNGs (scripts/render-art.ts) for places that
 * can't run WebGL: the PNG/PDF exports (next/og), reduced-motion fallbacks and loading states.
 * Time comes from the frame, so a given frame always renders the same image.
 */
export function ArtStill({ art }: { art: ArtId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows
      camera={{ position: [10, 7.5, 13], fov: 28 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.1, 0)}
    >
      {art === "hero" ? (
        <HeroScene t={t} pose="wave" builder effects={false} />
      ) : art.startsWith("cell-") ? (
        <HeroScene t={t} pose={art.slice(5) as Pose} levels={[]} effects={false} />
      ) : (
        <ArchetypeDiorama archetype={art as ArchetypeId} t={t} effects={false} />
      )}
    </ThreeCanvas>
  );
}
