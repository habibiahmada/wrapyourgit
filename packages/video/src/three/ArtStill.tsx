import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import type { ArchetypeId } from "@wyg/schema";
import { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { BlobShadow } from "./BlobShadow";
import { CellCharacter, type Pose } from "./CellCharacter";
import { ArchetypeDiorama, ArchetypeProps } from "./Dioramas";
import { HeroScene } from "./HeroScene";
import { ArchetypeSkin, HeroCast } from "./skins";
import { CutoutLights } from "./World";

export type ArtId =
  | ArchetypeId
  | "hero"
  | `cell-${Pose}`
  | `cutout-cell-${Pose}`
  | `cutout-${ArchetypeId}`
  | `skin-${ArchetypeId}`
  | "hero-cast";

/**
 * A 3D scene rendered by Remotion, used to bake still PNGs (scripts/render-art.ts) for places that
 * can't run WebGL: the PNG/PDF exports (next/og), the story scenes, reduced-motion fallbacks and
 * loading states. "cutout-*" ids render on a transparent background with no stage, so the 2D
 * layouts can crop, tint and place them freely. Time comes from the frame, so a given frame always
 * renders the same image.
 */
/**
 * drei's Outlines attach their ink meshes in a layout effect, after ThreeCanvas has drawn the
 * frame. Draw once more, then let Remotion take the picture, or the ink never shows.
 */
function Settle() {
  const { gl, scene, camera } = useThree();
  const [handle] = useState(() => delayRender("Drawing ink outlines"));
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      gl.render(scene, camera);
      continueRender(handle);
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera, handle]);
  return null;
}

export function ArtStill({ art }: { art: ArtId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const skin = art.startsWith("skin-");
  const cast = art === "hero-cast";
  const cutout = art.startsWith("cutout-") || skin || cast;
  const cellOnly = art.startsWith("cutout-cell-");
  const camera = cellOnly
    ? { position: [3.2, 2.6, 5.2] as const, fov: 30, look: 1 }
    : skin
      ? { position: [3, 2.3, 6.1] as const, fov: 33, look: 1 }
      : cast
        ? { position: [6.4, 4.2, 9.4] as const, fov: 32, look: 0.95 }
        : { position: [10, 7.5, 13] as const, fov: 28, look: 1.1 };
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows={!cutout}
      gl={{ alpha: true, preserveDrawingBuffer: true }}
      camera={{ position: [...camera.position], fov: camera.fov }}
      onCreated={(state) => {
        state.camera.lookAt(0, camera.look, 0);
        // Khronos PBR Neutral keeps brand colours as picked; ACES shifted the green toward yellow.
        state.gl.toneMapping = NeutralToneMapping;
        state.gl.toneMappingExposure = 1.05;
      }}
    >
      <Settle />
      {cutout && (
        // A soft shadow where the feet meet the ground, so characters stand instead of float.
        // It is not a stage: nothing is drawn but the shadow itself.
        <BlobShadow size={cellOnly ? [1.9, 1.4] : cast ? [9, 4] : [5, 2.6]} opacity={0.45} />
      )}
      {skin ? (
        <>
          <CutoutLights />
          <ArchetypeSkin archetype={art.slice("skin-".length) as ArchetypeId} t={t} />
        </>
      ) : cast ? (
        <>
          <CutoutLights />
          <HeroCast t={t} />
        </>
      ) : cellOnly ? (
        <>
          <CutoutLights />
          <CellCharacter pose={art.slice("cutout-cell-".length) as Pose} t={t} rotationY={0.55} />
        </>
      ) : cutout ? (
        <>
          <CutoutLights />
          <ArchetypeProps archetype={art.slice("cutout-".length) as ArchetypeId} t={t} />
        </>
      ) : art === "hero" ? (
        <HeroScene t={t} pose="wave" builder effects={false} />
      ) : art.startsWith("cell-") ? (
        <HeroScene t={t} pose={art.slice(5) as Pose} levels={[]} effects={false} />
      ) : (
        <ArchetypeDiorama archetype={art as ArchetypeId} t={t} effects={false} />
      )}
    </ThreeCanvas>
  );
}
