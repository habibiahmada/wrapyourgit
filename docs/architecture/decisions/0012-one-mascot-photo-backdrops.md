# 0012. One mascot in every scene, in front of real photos

- Status: Accepted
- Date: 2026-11-05
- Supersedes: point 3 of [0010](0010-live-3d-cast.md) ("A cast, not a mascot")

## Context

ADR-0010 gave every scene a different live 3D character. Reviewing the result, the maintainer did not want a different mascot on every slide: the story should keep one mascot, as before, with designs that vary and scenes that don't feel empty. Three more points came with it:

- The six archetype characters all used the same pose (`celebrate`) and the same green, so they looked alike.
- The 3D props behind the characters (contribution-block cities, a moon, a desk, floating cubes) looked worse than the characters themselves.
- Better backgrounds should come from real images, found online and cropped.

## Decision

1. **Cell hosts every scene.** `src/cast.ts` keeps one `Role` per scene, all of them Cell (green, squircle head, lit-cell eyes, sprout). Scenes differ in motion, gear and place: waving at a desk, cheering under fireworks, running on a track, thinking in a library with glasses, hammering in a workshop, celebrating in a community garden, grooving among gears with a headset, proud with a crown at sunset. `cast.test.ts` keeps Cell's colour in every scene and every motion and photo distinct.
2. **Every archetype has its own colour, pose and place** (`archetypeRole`, `ARCHETYPE_COLORS`): Builder orange, hammering in a workshop; Consistent green, running on a track; Explorer sky blue, waving from the mountains; Collaborator pink, handing work on over a shared map; Night owl lavender, grooving over a city at night; Open sourcer teal, cheering by a community mural.
3. **Backdrops are photos, not 3D props.** `PhotoCard` prints a photo with a paper border, a slight tilt and a slow push-in driven by the frame; Cell stands in front with its feet over the bottom edge. `LiveAccent` draws it inside the same box as the character, so tuned positions keep their footprint. The 3D city, moon, desk and floating cubes are deleted (`three/skins.tsx`, most of `three/World.tsx`, `three/Effects.tsx`, and `@react-three/postprocessing`).
4. **Only public-domain photos.** Twelve photos (CC0 1.0 or the Public Domain Mark) found through Openverse, centre-cropped to 960 × 720 in `packages/video/public/photos`, listed in `src/photos.ts` with credits in `public/photos/CREDITS.md`. The web serves them through the `apps/web/public/photos` link, like `art` and `audio`.
5. **Baked stills catch each motion at its peak.** On the beat itself every motion passes its neutral pose, so `ArtStill` renders each motion at its own peak time and turns Cell three-quarters so arms and legs read beside the big head.

## Alternatives

- **Keep the guest characters and add photos:** fixes the empty scenes but keeps a different mascot per slide, which the maintainer rejected.
- **Photos with any licence that allows reuse (CC BY, CC BY-SA):** a wider choice, but every export and video would need a visible credit, and BY-SA asks for share-alike on the derived image. Public domain needs neither.
- **Stock photo sites with their own licences (Unsplash, Pexels):** good photos, but their APIs need a key, and their licences forbid some uses; public domain has no conditions to track.

## Consequences

- One mascot across the story, the pages and the exports; colour changes only for the archetype.
- Each scene adds one image decode; the photos are about 70-230 KB each.
- A new photo must be public domain: check the source page, add it to `photos.ts` and `CREDITS.md`.
- After moving a scene's layout, re-render stills of all three layout families: the photo card makes the accent's footprint visible, so an overlap with text shows at once.
