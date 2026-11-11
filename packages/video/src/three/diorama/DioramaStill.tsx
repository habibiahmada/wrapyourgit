import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { NeutralToneMapping } from "three";
import { DIORAMA_SPAN, dioramaScene, type LandingDioramaId } from "./scenes";

/**
 * One loop of a landing diorama for baking (ADR-0013, ADR-0021): an orthographic camera at the
 * landing's isometric angle (30 degrees up, 45 degrees round, the same 2:1 look as its SVG hero),
 * on a transparent background so the page's canvas shows through.
 */
export function DioramaStill({ id }: { id: LandingDioramaId }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const look: [number, number, number] = [0, id === "iso-closing" ? 0.9 : 0.8, 0];
  return (
    <AbsoluteFill>
      <ThreeCanvas
        width={width}
        height={height}
        orthographic
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        camera={{ position: [10, 8.165, 10], zoom: width / DIORAMA_SPAN[id], near: 0.1, far: 100 }}
        onCreated={(state) => {
          state.camera.position.set(look[0] + 10, look[1] + 8.165, look[2] + 10);
          state.camera.lookAt(...look);
          state.gl.toneMapping = NeutralToneMapping;
        }}
      >
        {dioramaScene(id, t)}
      </ThreeCanvas>
    </AbsoluteFill>
  );
}
