import type { StopKind } from "../stops";
import { FirstDay } from "./FirstDay";
import { Hello } from "./Hello";
import { Placeholder } from "./Placeholder";
import { Private } from "./Private";
import type { Scene } from "./types";

export type { Scene, SceneProps } from "./types";

/** The picture each stop draws. Kinds without their own scene yet show the phase 1 card. */
export const SCENES: Record<StopKind, Scene> = {
  hello: Hello,
  "first-day": FirstDay,
  private: Private,
  city: Placeholder,
  busiest: Placeholder,
  rhythm: Placeholder,
  languages: Placeholder,
  projects: Placeholder,
  community: Placeholder,
  engineering: Placeholder,
  archetype: Placeholder,
  versus: Placeholder,
  letter: Placeholder,
  closing: Placeholder,
};
