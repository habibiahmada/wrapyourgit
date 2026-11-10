import type { RecapData } from "@wyg/schema";
import { formatCount } from "../../theme";

export type SkyModel = {
  /** The number on the brightest star and the words after it. */
  stars: { value: number; label: string; estimated: boolean };
  /** The number on the forks sign and the words after it. */
  forks: { value: number; label: string; estimated: boolean };
  /** Small stars to draw: one per star, up to MAX_STARS. */
  drawn: number;
};

export const MAX_STARS = 80;

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Gains when GitHub gave them, else the running totals under a label that says so: the picture
 * must never present a total as this year's gain. Zero stars draws no small stars at all (the scene
 * keeps one faint one) and says so in words rather than showing a bare 0.
 */
export function skyModel(data: RecapData): SkyModel {
  const { totalStars, starsGained, totalForks, forksGained } = data.community;

  const starsOk = starsGained.status === "ok";
  const starValue = starsGained.status === "ok" ? starsGained.value : totalStars;
  const stars = {
    value: starValue,
    label:
      starValue === 0
        ? starsOk
          ? "No stars this year"
          : "No stars yet"
        : starsOk
          ? `${plural(starValue, "star", "stars")} earned this year`
          : `${plural(starValue, "star", "stars")} on your repositories`,
    estimated: starsGained.status === "ok" && starsGained.estimated,
  };

  const forkValue = forksGained.status === "ok" ? forksGained.value : totalForks;
  const forks = {
    value: forkValue,
    label:
      forksGained.status === "ok"
        ? `${plural(forkValue, "fork", "forks")} this year`
        : `${plural(forkValue, "fork", "forks")} in total`,
    estimated: forksGained.status === "ok" && forksGained.estimated,
  };

  return { stars, forks, drawn: Math.min(MAX_STARS, starValue) };
}

/** The number as shown: "about 12.9k" when it is an estimate, so the picture never overstates. */
export const countText = (value: number, estimated: boolean) =>
  `${estimated ? "about " : ""}${formatCount(value)}`;
