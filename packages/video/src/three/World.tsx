import { Environment, Lightformer } from "@react-three/drei";

/**
 * Studio light for characters on a transparent background. Neutral on purpose: the earlier rig
 * lit everything with cobalt and persimmon point lights, which tinted every character purple and
 * orange. The environment is a small photo studio (one big overhead softbox, a key, a fill, two
 * rim strips and a warm floor bounce) so glossy surfaces have real highlights to reflect.
 */
export function CutoutLights() {
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-4, 7, 6]} intensity={1.9} color="#fff4e6" />
      <directionalLight position={[5, 3, 4]} intensity={0.55} color="#eef4ff" />
      <directionalLight position={[1, 5, -6]} intensity={1.4} color="#e6eeff" />
      <Environment resolution={512} frames={1}>
        <color attach="background" args={["#2a2d33"]} />
        <Lightformer
          form="rect"
          intensity={2.4}
          position={[0, 7, 1]}
          rotation-x={Math.PI / 2}
          scale={[9, 9, 1]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[-5, 3, 5]}
          scale={[4, 5, 1]}
          color="#fff3e2"
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[6, 2, 4]}
          scale={[3, 4, 1]}
          color="#eef4ff"
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[-6, 2, -4]}
          rotation-y={Math.PI / 3}
          scale={[1, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[6, 2, -4]}
          rotation-y={-Math.PI / 3}
          scale={[1, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          position={[0, -3, 2]}
          rotation-x={-Math.PI / 2}
          scale={[10, 10, 1]}
          color="#f2e6d0"
        />
      </Environment>
    </>
  );
}
