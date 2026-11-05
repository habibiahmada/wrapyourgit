import type { RecapData } from "@wyg/schema";
import { AbsoluteFill, Freeze, Html5Audio, interpolate, Series, staticFile } from "remotion";
import { sceneAccent, sceneDash } from "./accents";
import { beats, TRACK } from "./audio/track";
import { AccentContext } from "./components/Field";
import { SceneTransition } from "./components/SceneTransition";
import { SfxContext } from "./components/Sfx";
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
 * so every cut lands on a beat. `field` colours the cells of the next scene's transition.
 */
export const SCENES = TIMELINE.map((scene) => ({
  ...scene,
  durationInFrames: beats(scene.beats),
  Component: COMPONENTS[scene.id],
}));

export const STORY_DURATION_IN_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);

export type WrapStoryProps = {
  data: RecapData;
  /**
   * Mix the soundtrack into the composition (default). The web story passes false: it plays the
   * music itself, looping across chapters, while the Player plays only the effects.
   */
  music?: boolean;
};

export function WrapStory({ data, music = true }: WrapStoryProps) {
  const layout = useLayout();
  // Fade the music over the last two beats so the export never ends on a hard cut-off.
  const fadeStart = STORY_DURATION_IN_FRAMES - beats(2);
  return (
    <AbsoluteFill>
      {music && (
        <Html5Audio
          src={staticFile(TRACK.file)}
          volume={(frame) =>
            interpolate(frame, [fadeStart, STORY_DURATION_IN_FRAMES], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
      <Series>
        {SCENES.map((scene, index) => {
          const { id, durationInFrames, Component } = scene;
          const previous = SCENES[index - 1];
          return (
            <Series.Sequence key={id} durationInFrames={durationInFrames} name={id}>
              {previous && "transition" in scene ? (
                <SceneTransition
                  variant={scene.transition}
                  from={previous.field}
                  to={scene.field}
                  seed={id}
                  previous={
                    // The scene being left, held on its last frame and silent: its sounds already played.
                    <SfxContext value={false}>
                      <AccentContext value={sceneAccent(previous.id, data, layout)}>
                        <Freeze frame={previous.durationInFrames - 1}>
                          <previous.Component data={data} />
                        </Freeze>
                      </AccentContext>
                    </SfxContext>
                  }
                >
                  <AccentContext value={sceneAccent(id, data, layout)}>
                    <Component data={data} />
                  </AccentContext>
                  {sceneDash(id)}
                </SceneTransition>
              ) : (
                <AccentContext value={sceneAccent(id, data, layout)}>
                  <Component data={data} />
                </AccentContext>
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}
