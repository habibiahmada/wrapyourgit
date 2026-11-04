import type { ArchetypeId } from "@wyg/schema";
import type { SceneId } from "./timeline";

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

/** Chapter names for the guided story and the landing page's chapter list. */
export const SCENE_TITLES: Record<SceneId, string> = {
  intro: "Hello",
  contributions: "Contributions",
  rhythm: "Your rhythm",
  "tech-dna": "Languages",
  projects: "Projects",
  community: "Community",
  engineering: "Engineering",
  identity: "Your archetype",
  closing: "Summary",
};
