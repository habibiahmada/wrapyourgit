import "server-only";
import type { RecapData } from "@wyg/schema";
import { badgeShows, badgeSvg, cardOptions, cardSvg, snakeSvg } from "@/badge/badge";
import { errorSummary } from "./log";
import { clientKey, loadPublicRecap } from "./public-recaps";
import { isValidLogin } from "./username";

export type ReadmeImage = "badge" | "card" | "snake";

/**
 * Camo and Vercel's edge keep an image an hour, so a badge on a busy profile costs one function
 * call an hour; hiding the public recap reaches an image already cached within that hour
 * (ADR-0035).
 */
const CACHE = "public, max-age=3600, s-maxage=3600";

/**
 * A README image for `login`: the badge, the card or the snake (ADR-0035). Only ever the stored
 * public recap: `human` is false whatever the request, so GitHub's image proxy never makes the
 * server ask GitHub (it could not wait for a fetch, and anyone could spend the shared token by
 * putting usernames in image tags). Every answer but a recap (an invalid name, hidden, missing,
 * organisation, not fetched yet, busy, limited, error) draws the same neutral image with status
 * 200, so an image never tells those apart and camo always has something to show.
 */
export async function readmeImage(
  kind: ReadmeImage,
  login: string,
  request: Request,
): Promise<Response> {
  let recap: RecapData | null = null;
  if (isValidLogin(login)) {
    try {
      const result = await loadPublicRecap(login, clientKey(request.headers), false);
      if (result.kind === "recap") recap = result.data;
    } catch (error) {
      console.warn(`readme image failed: ${errorSummary(error)}`);
    }
  }
  const query = new URL(request.url).searchParams;
  const svg =
    kind === "badge"
      ? badgeSvg(recap, badgeShows(query.get("show")))
      : kind === "card"
        ? cardSvg(
            recap,
            cardOptions({
              layout: query.get("layout"),
              archetype: query.get("archetype"),
              hide: query.get("hide"),
              show: query.get("show"),
            }),
          )
        : snakeSvg(recap);
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": CACHE },
  });
}
