/**
 * Photos behind Cell in the baked archetype art and the landing hero (public/photos, credits in
 * public/photos/CREDITS.md): real places instead of 3D props, one per archetype. All are public
 * domain, 960 × 720 centre crops. The story itself keeps Cell on the field, without a photo.
 */
export const PHOTO_IDS = [
  "desk",
  "fireworks",
  "track",
  "workshop",
  "mountains",
  "map",
  "skyline",
  "mural",
] as const;

export type PhotoId = (typeof PHOTO_IDS)[number];

/** Path under the public folder, for `staticFile()` in Remotion or `/photos/...` on the web. */
export const photoPath = (id: PhotoId) => `photos/${id}.jpg`;
