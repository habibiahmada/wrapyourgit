import type { SceneTone } from "../chrome-tone";
import type { StopKind } from "../stops";
import { Archetype } from "./Archetype";
import { Busiest } from "./Busiest";
import { City } from "./City";
import { Closing } from "./Closing";
import { FirstDay } from "./FirstDay";
import { Garden } from "./Garden";
import { Hello } from "./Hello";
import { Letter } from "./Letter";
import { Planes } from "./Planes";
import { Private } from "./Private";
import { Projects } from "./Projects";
import { Rhythm } from "./Rhythm";
import { Seesaw } from "./Seesaw";
import { Sky } from "./Sky";
import type { Scene } from "./types";

export type { Scene, SceneProps } from "./types";

/**
 * What each scene puts behind the chrome; the chrome turns paper-coloured over dark. Night scenes
 * are dark throughout; the runway and the garden soil are dark only under the copyright line.
 * Others are light.
 */
export const SCENE_TONE: Partial<Record<StopKind, SceneTone>> = {
  languages: { top: "light", bottom: "dark" },
  community: "dark",
  engineering: { top: "light", bottom: "dark" },
  archetype: "dark",
  letter: "dark",
  closing: "dark",
};

/** The picture each stop draws. Kinds without their own scene yet show the phase 1 card. */
export const SCENES: Record<StopKind, Scene> = {
  hello: Hello,
  "first-day": FirstDay,
  private: Private,
  city: City,
  busiest: Busiest,
  rhythm: Rhythm,
  languages: Garden,
  projects: Projects,
  community: Sky,
  engineering: Planes,
  archetype: Archetype,
  versus: Seesaw,
  letter: Letter,
  closing: Closing,
};
