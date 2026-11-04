import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { Composition } from "remotion";
import { sampleRecap } from "./fixtures/sample-recap";
import { STORY_DURATION_IN_FRAMES, WrapStory } from "./WrapStory";

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
    </>
  );
}
