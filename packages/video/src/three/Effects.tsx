import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/**
 * Post effects: bloom only on what glows (emissive top cells and the stage rim, via a luminance
 * threshold) and a light vignette that keeps the eye in the centre. No depth of field: it
 * blurred Cell along with the background.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette offset={0.25} darkness={0.75} />
    </EffectComposer>
  );
}
