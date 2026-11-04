import type { RecapData } from "@wyg/schema";
import { Series } from "remotion";
import { ContributionsScene } from "./scenes/ContributionsScene";
import { IntroScene } from "./scenes/IntroScene";

/**
 * The full recap as one timeline. The SAME component is used by:
 * - the web live story (@remotion/player), and
 * - MP4 export (Remotion Lambda).
 * Scene durations are in frames at VIDEO_FPS.
 */
export const SCENES = [
  { id: "intro", durationInFrames: 90, Component: IntroScene },
  { id: "contributions", durationInFrames: 120, Component: ContributionsScene },
] as const;

export const STORY_DURATION_IN_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type WrapStoryProps = { data: RecapData };

export function WrapStory({ data }: WrapStoryProps) {
  return (
    <Series>
      {SCENES.map(({ id, durationInFrames, Component }) => (
        <Series.Sequence key={id} durationInFrames={durationInFrames} name={id}>
          <Component data={data} />
        </Series.Sequence>
      ))}
    </Series>
  );
}
