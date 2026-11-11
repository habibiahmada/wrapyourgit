import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { Composition } from "remotion";
import { BAKE_FPS, HEAD_ART_ID, LOOP_FRAMES, WEB_ART_IDS } from "./art";
import { sampleRecap } from "./fixtures/sample-recap";
import { type ArtId, ArtStill } from "./three/ArtStill";
import { DioramaStill } from "./three/diorama/DioramaStill";
import { DIORAMA_IDS, type LandingDioramaId } from "./three/diorama/scenes";
import { worldDuration } from "./world/model";
import { WorldStory, type WorldStoryProps } from "./world/WorldStory";

/** Every baked loop: web art and the letterhead head (art.ts). */
export const ART_IDS: ArtId[] = [...WEB_ART_IDS, HEAD_ART_ID];

/** Pixel size of each landing diorama: the close is a wide band, the rest fit a card. */
export function dioramaSize(id: LandingDioramaId): { width: number; height: number } {
  return id === "iso-closing" ? { width: 1600, height: 900 } : { width: 1200, height: 900 };
}

/** Pixel size of each baked composition. */
export function artSize(art: ArtId): { width: number; height: number } {
  if (art === HEAD_ART_ID) return { width: 600, height: 600 };
  return { width: 1200, height: 900 };
}

/** One story world composition per export format (`world-<format>`, e.g. `world-9x16`), plus the art bake. */
export function Root() {
  return (
    <>
      {/* The story world, video mode: duration depends on the data, so it comes from the props. */}
      {(Object.keys(VIDEO_FORMATS) as VideoFormatId[]).map((formatId) => {
        const format = VIDEO_FORMATS[formatId];
        const defaultProps: WorldStoryProps = { data: sampleRecap, mode: "video" };
        return (
          <Composition
            key={`world-${formatId}`}
            id={`world-${formatId}`}
            component={WorldStory}
            durationInFrames={worldDuration(sampleRecap, format, "video")}
            calculateMetadata={({ props }) => ({
              durationInFrames: worldDuration(props.data, format, props.mode),
            })}
            fps={VIDEO_FPS}
            width={format.width}
            height={format.height}
            defaultProps={defaultProps}
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
      {/* The landing's isometric dioramas, baked the same way. */}
      {DIORAMA_IDS.map((id) => (
        <Composition
          key={id}
          id={`art-${id}`}
          component={DioramaStill}
          durationInFrames={LOOP_FRAMES}
          fps={BAKE_FPS}
          {...dioramaSize(id)}
          defaultProps={{ id }}
        />
      ))}
    </>
  );
}
