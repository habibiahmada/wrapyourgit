# Story as one world: design

Date: 2026-11-06. Status: draft, awaiting the maintainer's approval.

## Intent

The story should feel like one continuous video, the way GitHub Unwrapped does, not like slides. Today each chapter plays as its own clip in the Player and stops, so the story feels choppy: the cut between chapters, the separate "before we start" screens and the Back/Next buttons all break it up.

The new story is **one world with a moving camera**. The camera travels, pans and zooms between fixed **stops**. Each stop is a "slide": the camera rests there and waits for a tap. The picture at each stop is also what the PNG/PDF exports contain. The data does not sit on top of the pictures as text: it lives inside the illustration (a building's height, a tree's size, a star in the sky), always readable and labelled.

This is the first of several projects the maintainer asked for on 2026-11-06. The others are listed under Non-goals and get their own designs.

## Goals

1. **One world.** The year's contribution graph is the world: an isometric city with one building per day. Every chapter lives inside a day's building, and the camera dives into it.
2. **Every stop is a new picture.** Nothing the viewer has already seen at one stop appears again at another. The whole city is visible at one stop only.
3. **Data in the illustration.** Each chapter turns its numbers into objects in a scene. The numbers stay exact, labelled and legible at the stop.
4. **A full-screen player.** No site navbar and no Back/Next buttons. A thin segmented progress bar sits at the top, and a copyright line sits at the bottom of every frame. Tapping the right side goes forward, the left side goes back, and going back plays the camera move in reverse.
5. **Sound.** The soundtrack loops continuously, including while the camera waits. Every tap makes a short sound, and every camera move has a transition sound that fits where the camera is going.
6. **Exports rendered in the user's browser.** MP4, slide PNGs, ZIP and PDF are rendered client-side with a loading state and progress. Lambda, the Bun slide worker and headless Chrome are no longer needed.
7. **One implementation.** The web story, the MP4 and the slides come from the same composition, so they can never differ (ADR-0002).

## Non-goals

These are separate projects, designed later and in this order unless the maintainer reorders them:

- Recap from a GitHub username without signing in (username → loading → story → dashboard).
- Sign-in with organisation access, and the signed-in flow (sign in → loading → story → dashboard).
- Tidying the site's URLs.
- Head-only Cell variants on the loading screen and the landing page. The head-only Cell used at the story's first stop is in scope here.

Also out of scope: new metrics, changes to the analytics or the schema, and the dashboard's design.

## Anti-goals (a failure even if it works)

- A wrong, unlabelled or unreadable number at a stop, or an estimated value shown without its label (AGENTS.md rules 1 and 2).
- A picture repeated across stops (goal 2).
- Choppy motion: dropped frames on a mid-range phone, a visible jump where the camera rests, or a stop frame caught mid-transition.
- The web story and the MP4 or slides showing different things.
- A private repository's name in any exported file (rule 6).
- Non-deterministic scenes (rule 3).

## Constraints

- AGENTS.md rules, in particular 1-6. Scenes animate only from the frame number (`useCurrentFrame`, `interpolate`, `spring`, seeded `random`).
- Four export formats (`VIDEO_FORMATS`: 9:16, 4:5, 1:1, 16:9) and three layout families. The camera framing at each stop is chosen per layout family. Sizes are relative to `width` and `height`, never fixed pixels (rule 4).
- Cell is drawn from the baked art (ADR-0013): sprite sheets and animated WebP, no WebGL.
- `@remotion/web-renderer` supports only a subset of the browser:
  - No `z-index`: elements draw in DOM order.
  - No 3D CSS transforms.
  - No SVG `url()` clip paths or filters.
  - No `object-position`.
  - Filters are not supported in Safari.
  - Fonts must be `@remotion/fonts`/`@remotion/google-fonts` used in SVG text.
  - Rendering is single-threaded, and the tab should stay visible while it renders.

  Every scene must be built inside these limits, so it renders the same in the Player and in the export.
- WCAG 2.2 AA, `prefers-reduced-motion`, keyboard use, and the antislop Hard Gate rules (R-39 to R-41) for the player UI.

## Approaches

**A'. One Remotion composition, rendered in the browser (chosen).** The world, camera and chapters are one composition. On the web, the Player plays forward from stop to stop; going back steps the frame backward on each animation frame, so the move plays truly in reverse. Exports use `@remotion/web-renderer` (stable since 4.0.491; the project is on 4.0.540) to render MP4 and stills in the user's browser.
- Pros: one source for web, MP4 and slides. Most of the foundation exists already: the Player, baked sprites, sounds and layout families. It removes Lambda and the slide worker.
- Cons: animation is written in Remotion's frame-based style, and reverse playback needs our own controller.

**B'. One GSAP timeline driving an SVG world, with our own export pipeline.** Bang-motion's style: a GSAP timeline seeked to time (deterministic), `reverse()` for going back. MP4 via our own SVG → canvas → WebCodecs pipeline and audio mix.
- Pros: the most comfortable animation authoring.
- Cons: we would build the encoder, audio mix and slide export ourselves, throw away the Remotion scenes, and supersede ADR-0002 and rule 3.

**C. Pre-rendered clips per camera move.**
- Cons: needs a per-user render on a server that Vercel doesn't have. It is slow and costs money, and reversed video playback in browsers stutters. Rejected.

The maintainer leaned towards B', then chose **A'** on 2026-11-06. It keeps one implementation with far less to build. Bang-motion's thinking (camera language, easing, connected transitions) still guides how the moves are designed.

## The design, as decided with the maintainer

### World and camera

- **The city.** One isometric building per day of the edition year. Weeks run along one axis and weekdays along the other, so the shape still reads as the contribution graph turned on its side. Building height follows that day's contribution count. A day with no contributions is a flat plot, so the whole year stays countable. The tallest building is the busiest day: its windows are lit, and Cell plants a flag on it with the date and the count.
- **Stops live inside days.** Each chapter is a full-screen scene inside a day's building. The camera dives in through it, and the surrounding city fades away while the camera is close. Long hops between distant days zoom out a little mid-flight, so travel reads as travel. Zoom is interpolated proportionally (in log scale), so zooming in and out feel equally smooth.
- **Stop order:**
  1. Hello (Cell's head fills the screen, and its face screen shows the greeting).
  2. The "before we start" warm-up, now as stops in the same world.
  3. The city (the total and the year).
  4. The busiest day.
  5. The chapters in `TIMELINE` order.
  6. The comparison with the previous year.
  7. The letter.

  After the last stop the story goes to the dashboard summary.
- **Chapter scenes decided so far:**
  - Contributions: the city and the busiest-day flag.
  - Languages: a garden where each tree's size is that language's share, with name and percentage on signs in the ground.
  - Community: a night sky where the stars earned are the stars, the total is the brightest star, and new followers sit on a sign.
  - Closing/summary: inside December 31, Cell waves and the year's summary sits beside it.
- **Rhythm needs a new picture.** The busiest day now lives in the city, and seven towers would repeat it. Rhythm should use another metaphor, such as a clock or a weekly calendar.
- **Cell.** Baked 3D art in a different pose at each stop, including the head-only variant at Hello. Cell's face is a screen, so short text can sit on it (the greeting, a number).

### Player

- Full screen while the story plays: no site navbar or footer.
- A segmented progress bar, a few pixels thick, flush with the top: one segment per stop, filled up to the current stop.
- A copyright line at the bottom of every frame, including in the exports.
- Tap or click the right two thirds to go forward and the left third to go back. The camera moves for about 1-2 s, then rests and waits.
- Going back plays the same move in reverse, Cell's animation included.
- The letter stop can scroll. Leaving it resets the scroll to the top.

### Sound

- The soundtrack plays from the first stop and loops with no audible seam, however long the viewer waits (the existing loop points in `TRACK.loop`).
- A short sound on every tap.
- Each camera move has a transition sound chosen by its destination: wind over the city, leaves into the garden, crickets towards the night sky, a muffled whoosh diving into a building.
- Going back plays the same transition sound, not reversed.
- New sounds are synthesised like the existing ones (`scripts/synth-sfx.ts`, CC0, ADR-0009).

### Exports

- Rendered in the user's browser with `@remotion/web-renderer`, with a loading state and progress.
- **MP4:** the same composition. Each stop holds for about 3 s, then the camera moves on by itself, with the same transition sounds. The soundtrack is mixed in.
- **Slides:** the frame at each stop, as PNG. The ZIP and PDF are assembled in the browser (fflate and pdf-lib are already dependencies).
- The share card (`/api/card`) stays as it is.

## Calls I made (the maintainer can override them)

- Tap zones split one third / two thirds, as in Instagram Stories.
- A minimal mute toggle and a close (exit to dashboard) control stay on screen, visually quiet. A full-screen story without them would trap keyboard and screen-reader users and anyone who needs silence.
- Keyboard: Right arrow, Space and Enter go forward; Left arrow goes back; Escape exits. The two tap zones are real buttons with accessible names ("Next", "Previous").
- `prefers-reduced-motion`: camera moves become short crossfades, and the stops are unchanged.
- If the browser lacks WebCodecs, the export step says so plainly and offers only what still works (the share card), as the Vercel export step does today (#39).
- ADRs: a new ADR supersedes ADR-0004 (Lambda MP4) and ADR-0011 (slides from the Bun worker), and amends ADR-0002 (reverse playback by stepping frames). The Lambda renderer, `apps/renderer`'s still worker and `SLIDE_EXPORTS` are removed once browser export works.

## Left to the builder

- Exact durations, easing curves and camera paths per stop, and framing per layout family.
- Scenes for the chapters not yet drawn (Rhythm, Projects, Engineering, Archetype, the previous-year comparison, the letter), following the principles above. Each gets a mockup for the maintainer to approve before it is built.
- The transition sounds' synthesis, and the tap sound.
- Export UI details: format picker, progress, cancel, and what happens if the tab is hidden.
- A performance budget for mid-range phones (Player frame time, render time per format).
- Order of migration from the current scenes. The old `WrapStory` and the new world must not both ship to users at once.
