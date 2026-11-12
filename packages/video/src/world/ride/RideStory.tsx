import { layoutForSize, type RecapData } from "@wyg/schema";
import { useMemo } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { languageIcon } from "../../languages";
import { fontFamily } from "../../theme";
import { Chrome } from "../Chrome";
import { reachedStop } from "../fade";
import { gardenModel } from "../scenes/garden.model";
import { Letter } from "../scenes/Letter";
import type { WorldMode } from "../timeline";
import { backdrop } from "./backdrop";
import { buildRide, letterBeat, rideFrame } from "./model";
import { SKY } from "./palette";
import { scenePrims } from "./prims";
import { RideCanvas } from "./RideCanvas";
import { archetypeFigures } from "./stations/archetype";

export type RideStoryProps = {
  data: RecapData;
  mode: WorldMode;
  /** Accepted for parity with WorldStory. The ride has no sound until phase 3 of the story ride. */
  music?: boolean;
  /** Include the letter's pages. Defaults to true; the public page leaves them out. */
  letter?: boolean;
};

/**
 * The story as a train ride (spec 2026-11-11-story-ride-design.md). Everything on screen comes
 * from `rideFrame`, a pure function of the frame; this component only paints it on one canvas
 * (the backdrop, the ground, then the objects), with the chrome over it. No text is laid over
 * the scene: every number is printed on a solid inside it. The one exception is the letter,
 * whose sheet of paper comes up over the scene at its stops (model.ts `letterBeat`).
 */
export function RideStory({ data, mode, letter = true }: RideStoryProps) {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const size = useMemo(() => ({ width, height }), [width, height]);
  const model = useMemo(
    () => buildRide(data, size, mode, fps, { letter }),
    [data, size, mode, fps, letter],
  );
  const { cam, roll, fog, ground, objects } = rideFrame(model, data, frame, size, fps);
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
    backdrop(cam, size, model.city, frame),
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
    </AbsoluteFill>
  );
}
