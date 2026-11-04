import type { ArchetypeId } from "@wyg/schema";

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
