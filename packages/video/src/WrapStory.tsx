import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, Html5Audio, interpolate, Series, staticFile } from "remotion";
import { sceneAccent } from "./accents";
import { beats, TRACK } from "./audio/track";
import { CellWipe } from "./components/CellWipe";
import { AccentContext } from "./components/Field";
import { useLayout } from "./layout";
import { ClosingScene } from "./scenes/ClosingScene";
import { CommunityScene } from "./scenes/CommunityScene";
import { ContributionsScene } from "./scenes/ContributionsScene";
import { EngineeringScene } from "./scenes/EngineeringScene";
import { IdentityScene } from "./scenes/IdentityScene";
import { IntroScene } from "./scenes/IntroScene";
import { ProjectsScene } from "./scenes/ProjectsScene";
import { RhythmScene } from "./scenes/RhythmScene";
import { TechDnaScene } from "./scenes/TechDnaScene";
import { type SceneId, TIMELINE } from "./timeline";

const COMPONENTS: Record<SceneId, (props: { data: RecapData }) => React.ReactNode> = {
  intro: IntroScene,
  contributions: ContributionsScene,
  rhythm: RhythmScene,
  "tech-dna": TechDnaScene,
  projects: ProjectsScene,
  community: CommunityScene,
  engineering: EngineeringScene,
  identity: IdentityScene,
  closing: ClosingScene,
};

/**
 * The full recap as one timeline. The SAME component is used by:
 * - the web live story (@remotion/player), and
 * - MP4 export (Remotion Lambda).
 * Order, beats and fields come from timeline.ts; durations are whole beats of the soundtrack,
 * so every cut lands on a beat. `field` is what the next scene's cell wipe breaks apart.
 */
export const SCENES = TIMELINE.map((scene) => ({
  ...scene,
  durationInFrames: beats(scene.beats),
  Component: COMPONENTS[scene.id],
}));

export const STORY_DURATION_IN_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type WrapStoryProps = { data: RecapData };

export function WrapStory({ data }: WrapStoryProps) {
  const layout = useLayout();
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
              <AccentContext value={sceneAccent(id, data, layout)}>
                <Component data={data} />
              </AccentContext>
              {previous && <CellWipe from={previous.field} seed={id} />}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}
