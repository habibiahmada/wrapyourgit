import { recapPath } from "@/server/routes";
import type { BadgeShow, CardLayout, CardSide } from "./options";

/*
 * What the dashboard hands an owner to paste into a README (ADR-0035): the image's address with
 * the options they picked, linked to their recap. Only options that differ from an image's
 * defaults go in the query, so the common snippet stays short.
 */

export type ReadmeChoice =
  | { kind: "badge"; shows: readonly BadgeShow[] }
  | {
      kind: "card";
      layout: CardLayout;
      side: CardSide;
      archetype: boolean;
      name: boolean;
      stats: boolean;
      graph: boolean;
      /** Offer the compact card on narrow screens with <picture>, on the wide layout only. */
      phoneSwitch: boolean;
    }
  | { kind: "snake" };

type CardChoice = Extract<ReadmeChoice, { kind: "card" }>;

/** Next to the recap, so a renamed or reserved login follows the same rule as its page. */
function imageBase(login: string, kind: ReadmeChoice["kind"]): string {
  return `${recapPath(login)}/${kind}.svg`;
}

function cardQuery(choice: CardChoice, layout: CardLayout): string {
  const params: string[] = [];
  if (layout === "compact") params.push("layout=compact");
  else if (choice.side === "right" && choice.archetype) params.push("archetype=right");
  const hide = [
    !choice.archetype && "archetype",
    choice.archetype && !choice.name && "name",
    !choice.stats && "stats",
  ].filter(Boolean);
  if (hide.length) params.push(`hide=${hide.join(",")}`);
  if (choice.graph) params.push("show=graph");
  return params.length ? `?${params.join("&")}` : "";
}

/** The image's path and query on this site, for the preview and the snippet. */
export function imagePath(login: string, choice: ReadmeChoice, layout?: CardLayout): string {
  const base = imageBase(login, choice.kind);
  if (choice.kind === "badge") {
    const plain = choice.shows.length === 1 && choice.shows[0] === "contributions";
    return choice.shows.length && !plain ? `${base}?show=${choice.shows.join(",")}` : base;
  }
  if (choice.kind === "card") return base + cardQuery(choice, layout ?? choice.layout);
  return base;
}

/** The image's alternative text: a README image is read out by this, not by its SVG title. */
export function imageAlt(login: string, year: number, kind: ReadmeChoice["kind"]): string {
  return kind === "snake"
    ? `${login}'s ${year} contribution graph, eaten by a snake, on WrapYourGit`
    : `${login}'s ${year} on WrapYourGit`;
}

const html = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The snippet to paste: Markdown, or for a wide card that switches to the compact one on phones,
 * HTML with <picture> (GitHub keeps <picture> for its light and dark themes; whether it keeps a
 * width media query is not yet checked, and where it does not, the wide card shows).
 */
export function readmeSnippet(
  site: string,
  login: string,
  year: number,
  choice: ReadmeChoice,
): { format: "markdown" | "html"; text: string } {
  const recap = `${site}${recapPath(login)}`;
  const alt = imageAlt(login, year, choice.kind);
  if (choice.kind === "card" && choice.layout === "wide" && choice.phoneSwitch) {
    const wide = `${site}${imagePath(login, choice, "wide")}`;
    const compact = `${site}${imagePath(login, choice, "compact")}`;
    return {
      format: "html",
      text: [
        `<a href="${html(recap)}">`,
        "  <picture>",
        `    <source media="(max-width: 600px)" srcset="${html(compact)}">`,
        `    <img src="${html(wide)}" alt="${html(alt)}">`,
        "  </picture>",
        "</a>",
      ].join("\n"),
    };
  }
  return {
    format: "markdown",
    text: `[![${alt.replace(/[[\]]/g, "")}](${site}${imagePath(login, choice)})](${recap})`,
  };
}
