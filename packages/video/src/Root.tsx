import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { Composition } from "remotion";
import { BAKE_FPS, HEAD_ART_ID, LOOP_FRAMES, SPRITE_IDS, SPRITE_SHEET, WEB_ART_IDS } from "./art";
import { sampleRecap } from "./fixtures/sample-recap";
import { type ArtId, ArtStill } from "./three/ArtStill";
import { STORY_DURATION_IN_FRAMES, WrapStory } from "./WrapStory";

/** Every baked loop: web art, the letterhead head and the story's sprites (art.ts). */
export const ART_IDS: ArtId[] = [
  ...WEB_ART_IDS,
  HEAD_ART_ID,
  ...SPRITE_IDS.map((id) => `sprite-${id}` as const),
];

/** Pixel size of each baked composition. */
export function artSize(art: ArtId): { width: number; height: number } {
  if (art.startsWith("sprite-")) return { width: SPRITE_SHEET.size, height: SPRITE_SHEET.size };
  if (art === HEAD_ART_ID) return { width: 600, height: 600 };
  return { width: 1200, height: 900 };
}

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
      {/* One loop of each baked animation: bun scripts/render-art.ts */}
      {ART_IDS.map((art) => (
        <Composition
          key={art}
          id={`art-${art}`}
          component={ArtStill}
          durationInFrames={LOOP_FRAMES}
          fps={BAKE_FPS}
          {...artSize(art)}
          defaultProps={{ art }}
        />
      ))}
    </>
  );
}
