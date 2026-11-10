# 0012. One mascot, silhouettes, GitHub motifs, and photos only for archetype art

- Status: Accepted
- Note (phase 4): the scene silhouettes, field motifs (`Backdrop.tsx`) and `CellDash` were removed with the old story ([0016](0016-exports-in-the-browser.md)). One mascot and the archetype looks still hold.
- Date: 2026-11-05
- Supersedes: point 3 of [0010](0010-live-3d-cast.md) ("A cast, not a mascot")

## Context

ADR-0010 gave every scene a different live 3D character. Reviewing the result, the maintainer did not want a different mascot on every slide: the story should keep one mascot, as before, with designs that vary and scenes that don't feel empty. More points followed in review:

- The six archetype characters all used the same pose (`celebrate`) and the same green, so they looked alike.
- The 3D props behind the characters (contribution-block cities, a moon, a desk, floating cubes) looked worse than the characters themselves; better backgrounds should come from real images, found online and cropped.
- A first pass put a photo behind Cell in every story scene. On the slides the maintainer wanted no backdrop behind the mascot, not every slide showing the mascot (some only a big silhouette), backgrounds that are not plain, and livelier cuts, with the mascot walking across.

## Decision

1. **Cell is the only mascot.** `src/cast.ts` keeps one `Role` per scene, all Cell (green, squircle head, lit-cell eyes, sprout), each with its own motion and gear. `cast.test.ts` keeps Cell's colour in every scene and every motion distinct.
2. **Not every scene shows Cell standing.** Intro, contributions, projects, identity and closing show Cell standing and moving (live 3D at first, baked loops since ADR-0013), on the field with no backdrop. Rhythm, tech-dna, community and engineering show it as a giant flat silhouette in the field's text colour at about 8% opacity, bleeding off an edge (`Silhouette` in `components/Backdrop.tsx`).
3. **Fields carry GitHub motifs.** Every scene scatters contribution cells in the frame margin, outside the content box (a few lit in GitHub greens), and six scenes draw a git branch graph along a free edge (`CellScatter`, `BranchLine`). Both use the field's text colour at low opacity, so DESIGN.md's measured text contrast holds.
4. **Cell runs across every cut.** For the first three beats of each scene after a cut (not the archetype flash), `CellDash` runs Cell sideways across the frame in that scene's gear, alternating direction, some cuts in hops, leaving a trail of contribution cells. Live accents that would meet it enter after it has left. The chapter's last frame, where slides come from, never shows it.
5. **Every archetype has its own colour, pose and place** (`archetypeRole`, `ARCHETYPE_COLORS`): Builder orange, hammering in a workshop; Consistent green, running on a track; Explorer sky blue, waving from the mountains; Collaborator pink, handing work on over a shared map; Night owl lavender, grooving over a city at night; Open sourcer teal, cheering by a community mural.
6. **Photos only in the baked web art.** `PhotoCard` prints a public-domain photo behind Cell in `skin-<archetype>` and the landing hero. Eight photos (CC0 1.0 or the Public Domain Mark), found through Openverse, centre-cropped to 960 × 720 in `packages/video/public/photos`, listed in `src/photos.ts` with credits in `public/photos/CREDITS.md`. The 3D city, moon, desk and floating cubes are deleted (`three/skins.tsx`, most of `three/World.tsx`, `three/Effects.tsx`, and `@react-three/postprocessing`).
7. **Baked stills catch each motion at its peak.** On the beat itself every motion passes its neutral pose, so `ArtStill` renders each motion at its own peak time and turns Cell three-quarters so arms and legs read beside the big head.

## Alternatives

- **Keep the guest characters and add photos:** fixes the empty scenes but keeps a different mascot per slide, which the maintainer rejected.
- **A photo behind Cell in every scene:** tried first; the maintainer wanted the mascot on the field with no backdrop.
- **Photos with any licence that allows reuse (CC BY, CC BY-SA):** a wider choice, but every export and video would need a visible credit, and BY-SA asks for share-alike on the derived image. Public domain needs neither.
- **Stock photo sites with their own licences (Unsplash, Pexels):** good photos, but their APIs need a key, and their licences forbid some uses; public domain has no conditions to track.

## Consequences

- One mascot across the story, the pages and the exports; colour changes only for the archetype.
- Each cut adds one more character for three beats (the dash) on top of the scene and its frozen predecessor.
- A new photo must be public domain: check the source page, add it to `photos.ts` and `CREDITS.md`.
- After moving a scene's layout, re-render stills of all three layout families and check that no accent covers a number or label.
