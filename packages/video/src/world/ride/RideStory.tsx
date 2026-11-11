import type { RecapData } from "@wyg/schema";
import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { languageIcon } from "../../languages";
import { fontFamily } from "../../theme";
import { Chrome } from "../Chrome";
import { reachedStop } from "../fade";
import { gardenModel } from "../scenes/garden.model";
import type { WorldMode } from "../timeline";
import { Backdrop } from "./Backdrop";
import { buildRide, rideFrame } from "./model";
import { SKY } from "./palette";
import { scenePrims } from "./prims";
import { RideScene } from "./Scene";

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
 * from `rideFrame`, a pure function of the frame; this component only paints it: the backdrop,
 * the ground, then the objects, in one SVG, with the chrome over it. No text is laid over the
 * scene: every number is printed on a solid inside it.
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
  // Logos are printed inside the SVG, which does not hold a render back while they load. These
  // hidden copies do.
  const logos = useMemo(
    () =>
      gardenModel(data)
        .trees.map((tree) => languageIcon(tree.name))
        .filter((icon): icon is string => icon !== null),
    [data],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: SKY, fontFamily, overflow: "hidden" }}>
      {logos.map((icon) => (
        <Img
          key={icon}
          src={staticFile(icon)}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      ))}
      {/* The scene rolls into the bends; scaled up a little so the roll never shows a corner. */}
      <div style={{ position: "absolute", inset: 0, transform: `rotate(${roll}deg) scale(1.1)` }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
          aria-hidden
        >
          <Backdrop cam={cam} frame={size} city={model.city} frameIndex={frame} />
          <RideScene prims={scenePrims(ground, cam, size, fog)} />
          <RideScene prims={scenePrims(objects, cam, size, fog)} />
        </svg>
      </div>
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
