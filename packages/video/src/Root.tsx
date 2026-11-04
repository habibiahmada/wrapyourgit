import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { Composition } from "remotion";
import { sampleRecap } from "./fixtures/sample-recap";
import { ArtStill } from "./three/ArtStill";
import { STORY_DURATION_IN_FRAMES, WrapStory } from "./WrapStory";

export const ART_IDS = [
  "hero",
  "builder",
  "consistent",
  "explorer",
  "collaborator",
  "night-owl",
  "open-sourcer",
  "cell-think",
  "cell-proud",
  "cell-sleep",
] as const;

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
