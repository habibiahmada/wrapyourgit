"use client";

import { Player } from "@remotion/player";
import { layoutForSize, type RecapData, VIDEO_FORMATS, VIDEO_FPS } from "@wyg/schema";
import { STORY_DURATION_IN_FRAMES, WrapStory } from "@wyg/video";
import { useEffect, useState } from "react";

const FORMAT_FOR_LAYOUT = { portrait: "9x16", compact: "4x5", landscape: "16x9" } as const;

/**
 * The live story: the same WrapStory composition the MP4 export renders (ADR-0002), sized to the
 * viewport's layout family. It never autoplays, so sound only starts when the user presses play.
 */
export function StoryPlayer({ data }: { data: RecapData }) {
  const [format, setFormat] = useState<keyof typeof VIDEO_FORMATS>("9x16");
  useEffect(() => {
    const pick = () =>
      setFormat(FORMAT_FOR_LAYOUT[layoutForSize(window.innerWidth, window.innerHeight)]);
    pick();
    window.addEventListener("resize", pick);
    return () => window.removeEventListener("resize", pick);
  }, []);
  const { width, height } = VIDEO_FORMATS[format];

  return (
    <Player
      component={WrapStory}
      inputProps={{ data }}
      durationInFrames={STORY_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      compositionWidth={width}
      compositionHeight={height}
      controls
      acknowledgeRemotionLicense
      style={{ width: "100%", maxHeight: "80svh", aspectRatio: `${width} / ${height}` }}
    />
  );
}
