import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { Composition } from "remotion";
import { sampleRecap } from "./fixtures/sample-recap";
import { type ArtId, ArtStill } from "./three/ArtStill";
import { STORY_DURATION_IN_FRAMES, WrapStory } from "./WrapStory";

export const ART_IDS = [
  // Baked stills of the story's chibi cast (three/ArtStill.tsx), for the web pages, loading
  // states, the OG image and the letter slide. Same rig and looks as the live story.
  "hero-cast",
  "cutout-cell-wave",
  "cutout-cell-cheer",
  "cutout-cell-think",
  "cutout-cell-proud",
  "cutout-cell-sleep",
  "cutout-builder",
  "cutout-consistent",
  "cutout-explorer",
  "cutout-collaborator",
  "cutout-night-owl",
  "cutout-open-sourcer",
  "skin-builder",
  "skin-consistent",
  "skin-explorer",
  "skin-collaborator",
  "skin-night-owl",
  "skin-open-sourcer",
] as const satisfies readonly ArtId[];

/** One composition per export format. Composition id = `wrap-<format>`, e.g. `wrap-9x16`. */
export function Root() {
  return (
    <>
      {(Object.keys(VIDEO_FORMATS) as VideoFormatId[]).map((formatId) => {
        const { width, height } = VIDEO_FORMATS[formatId];
        return (
          <Composition
            key={formatId}
            id={`wrap-${formatId}`}
            component={WrapStory}
            durationInFrames={STORY_DURATION_IN_FRAMES}
            fps={VIDEO_FPS}
            width={width}
            height={height}
            defaultProps={{ data: sampleRecap }}
          />
        );
      })}
      {/* Baked 3D art for exports and fallbacks: bun scripts/render-art.ts */}
      {ART_IDS.map((art) => (
        <Composition
          key={art}
          id={`art-${art}`}
          component={ArtStill}
          durationInFrames={60}
          fps={VIDEO_FPS}
          width={1200}
          height={900}
          defaultProps={{ art }}
        />
      ))}
    </>
  );
}
