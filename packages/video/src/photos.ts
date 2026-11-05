/**
 * Backdrop photos behind Cell (public/photos, credits in public/photos/CREDITS.md). Real places
 * instead of 3D props: each scene and each archetype gets its own, so no two look alike. All are
 * public domain, 960 × 720 centre crops.
 */
export const PHOTO_IDS = [
  "desk",
  "fireworks",
  "track",
  "library",
  "workshop",
  "garden",
  "gears",
  "sunset",
  "mountains",
  "map",
  "skyline",
  "mural",
] as const;

export type PhotoId = (typeof PHOTO_IDS)[number];

/** Path under the public folder, for `staticFile()` in Remotion or `/photos/...` on the web. */
export const photoPath = (id: PhotoId) => `photos/${id}.jpg`;
