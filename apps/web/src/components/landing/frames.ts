import type { StaticImageData } from "next/image";
import act1 from "../../../public/landing/act-1.webp";
import act2 from "../../../public/landing/act-2.webp";
import act3 from "../../../public/landing/act-3.webp";
import archetype from "../../../public/landing/ride-archetype.webp";
import busiest from "../../../public/landing/ride-busiest.webp";
import city from "../../../public/landing/ride-city.webp";
import closing from "../../../public/landing/ride-closing.webp";
import community from "../../../public/landing/ride-community.webp";
import engineering from "../../../public/landing/ride-engineering.webp";
import firstDay from "../../../public/landing/ride-first-day.webp";
import hello from "../../../public/landing/ride-hello.webp";
import languages from "../../../public/landing/ride-languages.webp";
import projects from "../../../public/landing/ride-projects.webp";
import rhythm from "../../../public/landing/ride-rhythm.webp";
import versus from "../../../public/landing/ride-versus.webp";

/*
 * The landing page's frames of the story ride, imported and not addressed by path. An import's
 * address is named from the file's contents, so a frame that is rendered again is a new address.
 * Addressed by path (`/landing/ride-closing.webp`), a new picture under the old name kept being
 * served from the image optimizer's cache: the closing stop became a party and the page went on
 * showing the board. The files stay under `public/` because the README shows the same ones.
 *
 * To render them again: `bun scripts/ride-stills.ts <stop> <dir> --fixture public-sample`
 * with `--format 4x5` (then 540 x 675 WebP) for the stops and `--format 16x9` (960 x 540) for
 * the three acts.
 */

/** One picture to an act, in the acts' order: the city, the rhythm, the archetype. */
export const ACT_IMAGES: readonly StaticImageData[] = [act1, act2, act3];

/** The stops the landing page shows, by stop. */
export const RIDE_IMAGES = {
  hello,
  "first-day": firstDay,
  city,
  busiest,
  rhythm,
  languages,
  projects,
  community,
  engineering,
  archetype,
  versus,
  closing,
} satisfies Record<string, StaticImageData>;
