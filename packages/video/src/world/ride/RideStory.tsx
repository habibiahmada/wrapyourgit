import { layoutForSize, type RecapData } from "@wyg/schema";
import { useMemo } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { languageIcon } from "../../languages";
import { fontFamily } from "../../theme";
import { Chrome } from "../Chrome";
import { reachedStop } from "../fade";
import { StoryMusic } from "../StoryMusic";
import { gardenModel } from "../scenes/garden.model";
import { Letter } from "../scenes/Letter";
import { videoSounds } from "../sound";
import type { WorldMode } from "../timeline";
import { WorldSfx } from "../WorldSfx";
import { backdrop } from "./backdrop";
import { buildRide, letterBeat, rideFrame } from "./model";
import { SKY } from "./palette";
import { scenePrims } from "./prims";
import { RideCanvas } from "./RideCanvas";
import { archetypeFigures } from "./stations/archetype";

export type RideStoryProps = {
  data: RecapData;
  mode: WorldMode;
  /** Mix the soundtrack in (video mode only; the web player plays music itself). */
  music?: boolean;
  /** Include the letter's pages. Defaults to true; the public page leaves them out. */
  letter?: boolean;
  /**
   * Frames the idle motion runs ahead of the player's frame (see `rideFrame`). The web player sets
   * it while a move carries on from part way through a rest loop; exports never do.
   */
  idle?: number;
};

/**
 * The story as a train ride (spec 2026-11-11-story-ride-design.md). Everything on screen comes
 * from `rideFrame`, a pure function of the frame; this component only paints it on one canvas
 * (the backdrop, the ground, then the objects), with the chrome over it. No text is laid over
 * the scene: every number is printed on a solid inside it. The one exception is the letter,
 * whose sheet of paper comes up over the scene at its stops (model.ts `letterBeat`).
 */
export function RideStory({ data, mode, music = true, letter = true, idle = 0 }: RideStoryProps) {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const size = useMemo(() => ({ width, height }), [width, height]);
  const model = useMemo(
    () => buildRide(data, size, mode, fps, { letter }),
    [data, size, mode, fps, letter],
  );
  const { cam, roll, fog, ground, objects } = rideFrame(model, data, frame, size, fps, idle);
  // Every picture the scene draws: the languages' logos and the archetype's figure.
  const logos = useMemo(() => {
    return [
      ...gardenModel(data)
        .trees.map((tree) => languageIcon(tree.name))
        .filter((icon): icon is string => icon !== null),
      ...archetypeFigures(data),
    ].map((file) => staticFile(file));
  }, [data]);
  const { sheet } = letterBeat(model, frame);
  const layers = [
    backdrop(cam, size, model.city, frame + idle),
    scenePrims(ground, cam, size, fog),
    scenePrims(objects, cam, size, fog),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily, overflow: "hidden" }}>
      {/* The scene rolls into the bends. */}
      <RideCanvas
        layers={layers}
        width={width}
        height={height}
        fontFamily={fontFamily}
        logos={logos}
        roll={roll}
      />
      {/* The letter: today's sheet of paper over the scene, a page to a stop. */}
      {sheet && (
        <AbsoluteFill style={{ opacity: sheet.opacity }}>
          <Letter
            data={data}
            stop={sheet.stop}
            city={model.city}
            size={size}
            layout={layoutForSize(width, height)}
            enter={sheet.enter}
            frame={frame}
          />
        </AbsoluteFill>
      )}
      <Chrome
        stops={model.stops.length}
        current={reachedStop(frame, model.timeline.stopFrames)}
        year={data.meta.year}
        frame={size}
        darkness={{ top: 1, bottom: 1 }}
      />
      {/* A video carries its own sound; the web player plays the same sounds itself, on the tap. */}
      {mode === "video" && (
        <>
          {videoSounds(model).map(({ frame: at, sound, frames }, k) => (
            // Index keys: the list is fixed for a given ride, and one frame can hold two sounds.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            <WorldSfx key={`${k}-${sound}`} at={at} sound={sound} frames={frames} />
          ))}
          {music && <StoryMusic end={model.timeline.durationInFrames} fps={fps} />}
        </>
      )}
    </AbsoluteFill>
  );
}
