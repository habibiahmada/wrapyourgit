/**
 * Every link points at a section that exists on the landing page (R-24). Kept out of the client
 * nav module so server components (the footer) get the array, not a client reference.
 */
export const NAV_LINKS = [
  { id: "story", label: "The story" },
  { id: "archetypes", label: "Archetypes" },
  { id: "keep", label: "What you keep" },
  { id: "privacy", label: "Privacy" },
  { id: "faq", label: "FAQ" },
] as const;
