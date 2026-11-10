import type { ArchetypeId } from "@wyg/schema";
import type { StopKind } from "./world/stops";

/**
 * Display names for archetypes, shared by the web dashboard and the identity scene (M4) so both
 * say the same thing. Definitions live in docs/analytics/metrics.md.
 */
export const ARCHETYPE_LABELS: Record<ArchetypeId, string> = {
  builder: "Builder",
  consistent: "Consistent",
  explorer: "Explorer",
  collaborator: "Collaborator",
  "night-owl": "Night owl",
  "open-sourcer": "Open sourcer",
};

/** Shown when no archetype's minimum was met: an honest result, not a forced label. */
export const NO_ARCHETYPE = "Your story is just beginning";

/** What each stop of the story world shows, in story order, for the landing page's list. */
export const STOP_TITLES: Record<StopKind, string> = {
  hello: "Hello",
  "first-day": "Your first day",
  private: "Private work",
  city: "Your year as a city",
  busiest: "Your busiest day",
  rhythm: "Your rhythm",
  languages: "Languages",
  projects: "Projects",
  community: "Community",
  engineering: "Engineering",
  archetype: "Your archetype",
  versus: "Against last year",
  letter: "A letter from Cell",
  closing: "The year in one frame",
};
