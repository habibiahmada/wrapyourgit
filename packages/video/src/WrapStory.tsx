import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, Html5Audio, interpolate, Series, staticFile } from "remotion";
import { beats, TRACK } from "./audio/track";
import { CellWipe } from "./components/CellWipe";
import { ContributionsScene } from "./scenes/ContributionsScene";
import { IntroScene } from "./scenes/IntroScene";
import { RhythmScene } from "./scenes/RhythmScene";
import { TechDnaScene } from "./scenes/TechDnaScene";
import type { FieldColor } from "./theme";

/**
 * The full recap as one timeline. The SAME component is used by:
 * - the web live story (@remotion/player), and
 * - MP4 export (Remotion Lambda).
 * Durations are whole beats of the soundtrack, so every cut lands on a beat. The intro is
 * exactly TRACK.sections.drop beats long, so the kick enters on the first hard cut.
 * `field` is the scene's background, which the next scene's cell wipe breaks apart.
 */
export const SCENES = [
  {
    id: "intro",
    durationInFrames: beats(TRACK.sections.drop),
    field: "ink",
    Component: IntroScene,
  },
  {
    id: "contributions",
    durationInFrames: beats(16),
    field: "persimmon",
    Component: ContributionsScene,
  },
  { id: "rhythm", durationInFrames: beats(20), field: "paper", Component: RhythmScene },
  { id: "tech-dna", durationInFrames: beats(16), field: "cobalt", Component: TechDnaScene },
] as const satisfies readonly {
  id: string;
  durationInFrames: number;
  field: FieldColor;
  Component: (props: { data: RecapData }) => React.ReactNode;
}[];

export const STORY_DURATION_IN_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type WrapStoryProps = { data: RecapData };

export function WrapStory({ data }: WrapStoryProps) {
  // Fade the music over the last two beats so the export never ends on a hard cut-off.
  const fadeStart = STORY_DURATION_IN_FRAMES - beats(2);
  return (
    <AbsoluteFill>
      <Html5Audio
        src={staticFile(TRACK.file)}
        volume={(frame) =>
          interpolate(frame, [fadeStart, STORY_DURATION_IN_FRAMES], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <Series>
        {SCENES.map(({ id, durationInFrames, Component }, index) => {
          const previous = SCENES[index - 1];
          return (
            <Series.Sequence key={id} durationInFrames={durationInFrames} name={id}>
              <Component data={data} />
              {previous && <CellWipe from={previous.field} seed={id} />}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}
