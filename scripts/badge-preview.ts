/**
 * Every README badge and card variant on GitHub's light and dark README backgrounds, served at
 * http://localhost:3002 for review (issue #193). Each image goes in as an <img> from a data URL,
 * the way camo serves it in a README, so no page font or style reaches it. Reload to replay the
 * entrance.
 *
 *   bun scripts/badge-preview.ts
 */
import { archetypeIdSchema, type RecapData } from "@wyg/schema";
import {
  BADGE_SHOWS,
  type BadgeShow,
  badgeSvg,
  cardOptions,
  cardSvg,
} from "../apps/web/src/badge/badge";
import {
  busyRecap,
  emptyRecap,
  provisionalRecap,
} from "../packages/video/src/fixtures/edge-recaps";
import { sampleRecap } from "../packages/video/src/fixtures/sample-recap";

const PORT = Number(process.env.PORT ?? 3002);

const CASES: { title: string; note: string; recap: RecapData | null }[] = [
  { title: "Finished year", note: "sampleRecap, isFinal true", recap: sampleRecap },
  {
    title: "Year in progress",
    note: 'provisionalRecap, isFinal false: "so far" once per badge, outlines for days to come',
    recap: { ...provisionalRecap, identity: sampleRecap.identity },
  },
  { title: "Long values", note: "busyRecap: five-digit total, long names", recap: busyRecap },
  {
    title: "Quiet year",
    note: "emptyRecap: no language or archetype, so those values drop out and the card has no diorama",
    recap: emptyRecap,
  },
  {
    title: "No stored recap",
    note: "hidden, unknown or not fetched yet: one neutral image for all",
    recap: null,
  },
];

/** One value each, then the combinations a README would likely use. */
const BADGES: BadgeShow[][] = [
  ...BADGE_SHOWS.map((show) => [show]),
  ["contributions", "streak", "language"],
  ["days", "streak", "archetype"],
];

/** The card as it comes, then each option a README might set. */
const CARDS = [
  "",
  "archetype=right",
  "hide=archetype",
  "hide=graph",
  "hide=stats",
  "hide=graph,stats",
];

const dataUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function figure(svg: string, alt: string, path: string): string {
  const w = /width="(\d+)"/.exec(svg)?.[1];
  const h = /height="(\d+)"/.exec(svg)?.[1];
  return `<figure><img src="${dataUrl(svg)}" alt="${esc(alt)}" width="${w}" height="${h}"><figcaption><code>${esc(path)}</code></figcaption></figure>`;
}

function images(recap: RecapData | null): string {
  const login = recap?.profile.login ?? "username";
  const alt = `${login}'s 2026 on WrapYourGit`;
  const badges = BADGES.map((shows) => {
    const query =
      shows.length === 1 && shows[0] === "contributions" ? "" : `?show=${shows.join(",")}`;
    return figure(badgeSvg(recap, shows), alt, `/${login}/badge.svg${query}`);
  }).join("");
  const cards = CARDS.map((query) => {
    const params = new URLSearchParams(query);
    const options = cardOptions({ archetype: params.get("archetype"), hide: params.get("hide") });
    return figure(cardSvg(recap, options), alt, `/${login}/card.svg${query ? `?${query}` : ""}`);
  }).join("");
  return `<div class="badges">${badges}</div><div class="cards">${cards}</div>`;
}

/** Each archetype's card, to check every diorama. */
function archetypes(theme: "light" | "dark"): string {
  const cards = archetypeIdSchema.options
    .map((id) => {
      const recap = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: id } };
      return figure(cardSvg(recap), `${id} archetype card`, id);
    })
    .join("");
  return `<div class="readme ${theme}"><p class="theme">GitHub ${theme}</p><div class="cards">${cards}</div></div>`;
}

function page(): string {
  const sections = CASES.map(
    ({ title, note, recap }, i) => `
    <section aria-labelledby="case-${i}">
      <h2 id="case-${i}">${esc(title)}</h2>
      <p class="note">${esc(note)}</p>
      <div class="themes">
        <div class="readme light"><p class="theme">GitHub light</p>${images(recap)}</div>
        <div class="readme dark"><p class="theme">GitHub dark</p>${images(recap)}</div>
      </div>
    </section>`,
  ).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>README badge preview · WrapYourGit</title>
<style>
  :root { color-scheme: dark; --canvas: #12110e; --fg: #eeeae0; --muted: #a29d90; --line: #3a372f; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--canvas); color: var(--fg);
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  header, main { max-width: 1600px; margin: 0 auto; padding: 24px 16px; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  h2 { margin: 0; font-size: 18px; }
  header p, .note { margin: 0; color: var(--muted); }
  section { padding-block: 28px; border-top: 1px solid var(--line); }
  .note { margin-bottom: 14px; }
  .themes { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 760px), 1fr)); }
  .readme { border-radius: 6px; padding: 20px 16px; overflow-x: auto; }
  .light { background: #ffffff; color: #1f2328; border: 1px solid #d1d9e0; }
  .dark { background: #0d1117; color: #f0f6fc; border: 1px solid #3d444d; }
  .theme { margin: 0 0 12px; font-size: 12px; font-weight: 600; }
  .badges { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .cards { display: flex; flex-direction: column; gap: 20px; }
  figure { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
  figcaption code { font-size: 12px; opacity: 0.8; }
  img { display: block; max-width: 100%; height: auto; }
</style>
</head>
<body>
<header>
  <h1>README badge preview</h1>
  <p>Sample data from the story's test fixtures, not a real account. Issue #193, ADR-0035. Reload to replay the entrance.</p>
</header>
<main>${sections}
    <section aria-labelledby="archetypes">
      <h2 id="archetypes">Every archetype</h2>
      <p class="note">sampleRecap with each archetype in turn, diorama on the left</p>
      <div class="themes">${archetypes("light")}${archetypes("dark")}</div>
    </section>
</main>
</body>
</html>`;
}

Bun.serve({
  port: PORT,
  fetch: () => new Response(page(), { headers: { "Content-Type": "text/html; charset=utf-8" } }),
});
console.log(`badge preview on http://localhost:${PORT}`);
