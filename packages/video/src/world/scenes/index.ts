import type { StopKind } from "../stops";
import { Archetype } from "./Archetype";
import { Busiest } from "./Busiest";
import { City } from "./City";
import { FirstDay } from "./FirstDay";
import { Garden } from "./Garden";
import { Hello } from "./Hello";
import { Letter } from "./Letter";
import { Placeholder } from "./Placeholder";
import { Planes } from "./Planes";
import { Private } from "./Private";
import { Projects } from "./Projects";
import { Rhythm } from "./Rhythm";
import { Seesaw } from "./Seesaw";
import { Sky } from "./Sky";
import type { Scene } from "./types";

export type { Scene, SceneProps } from "./types";

/** Stops drawn on a night sky; the chrome turns paper-coloured over them. Others are light. */
export const SCENE_TONE: Partial<Record<StopKind, "dark">> = {
  community: "dark",
  archetype: "dark",
  letter: "dark",
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
  closing: Placeholder,
};
