"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { ArchetypeId } from "@wyg/schema";
import { ArchetypeDiorama, HeroScene, type Pose } from "@wyg/video/three";
import { useState } from "react";
import type { ArtId } from "./scene-3d";

function Animated({ art, effects }: { art: ArtId; effects: boolean }) {
  const [t, setT] = useState(0);
  useFrame(({ clock }) => setT(clock.elapsedTime));
  if (art === "hero")
    return <HeroScene t={t} pose="wave" builder effects={effects} grow={Math.min(1, t / 2)} />;
  if (art.startsWith("cell-")) {
    return <HeroScene t={t} pose={art.slice(5) as Pose} levels={[]} effects={effects} />;
  }
  return <ArchetypeDiorama archetype={art as ArchetypeId} t={t} effects={effects} />;
}

/** The live WebGL scene. Loaded lazily by Scene3D, never during server rendering. */
export default function SceneCanvas({
  art,
  effects,
  onReady,
}: {
  art: ArtId;
  effects: boolean;
  onReady: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, effects ? 2 : 1.5]}
      camera={{ position: [10, 7.5, 13], fov: 28 }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 1.1, 0);
        // One frame after creation the scene has drawn; reveal it over the poster image.
        requestAnimationFrame(onReady);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Animated art={art} effects={effects} />
    </Canvas>
  );
}
