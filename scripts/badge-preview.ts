/**
 * Every README badge and card variant on GitHub's light and dark README backgrounds, served at
 * http://localhost:3002 for review (issue #193). Each image goes in as an <img> from a data URL,
 * the way camo serves it in a README, so no page font or style reaches it.
 *
 *   bun scripts/badge-preview.ts
 */
import { archetypeIdSchema, type RecapData } from "@wyg/schema";
import { archetypeCardSvg, BADGE_SHOWS, badgeSvg, cardSvg } from "../apps/web/src/badge/badge";
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
    note: 'provisionalRecap, isFinal false: every value says "so far"',
    recap: { ...provisionalRecap, identity: sampleRecap.identity },
  },
  { title: "Long values", note: "busyRecap: five-digit total, long names", recap: busyRecap },
  {
    title: "Quiet year",
    note: "emptyRecap: no language and no archetype fall back to the neutral badge",
    recap: emptyRecap,
  },
  {
    title: "No stored recap",
    note: "hidden, unknown or not fetched yet: one neutral image for all",
    recap: null,
  },
];

const dataUrl = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function images(recap: RecapData | null): string {
  const login = recap?.profile.login ?? "username";
  const badges = BADGE_SHOWS.map((show) => {
    const query = show === "contributions" ? "" : `?show=${show}`;
    const alt = `${login}'s 2026 on WrapYourGit`;
    return `<figure><img src="${dataUrl(badgeSvg(recap, show))}" alt="${esc(alt)}"><figcaption><code>${esc(`/${login}/badge.svg${query}`)}</code></figcaption></figure>`;
  }).join("");
  const card = `<figure><img src="${dataUrl(cardSvg(recap))}" alt="${esc(`${login}'s 2026 on WrapYourGit`)}" width="500" height="186"><figcaption><code>${esc(`/${login}/card.svg`)}</code></figcaption></figure>`;
  const archetype = `<figure><img src="${dataUrl(archetypeCardSvg(recap))}" alt="${esc(`${login}'s 2026 archetype on WrapYourGit`)}" width="420" height="200"><figcaption><code>${esc(`/${login}/archetype.svg`)}</code></figcaption></figure>`;
  return `<div class="badges">${badges}</div><div class="cards">${card}${archetype}</div>`;
}

/** Each archetype's badge and card, on GitHub dark, to check every diorama and character. */
function archetypes(theme: "light" | "dark"): string {
  return archetypeIdSchema.options
    .map((id) => {
      const recap = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: id } };
      return `<figure class="stack"><img src="${dataUrl(badgeSvg(recap, "archetype"))}" alt="${esc(`${id} archetype badge`)}"><img src="${dataUrl(archetypeCardSvg(recap))}" alt="${esc(`${id} archetype card`)}" width="420" height="200"></figure>`;
    })
    .join("")
    .replace(
      /^/,
      `<div class="readme ${theme}"><p class="theme">GitHub ${theme}</p><div class="cards">`,
    )
    .concat("</div></div>");
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
  const everyArchetype = `
    <section aria-labelledby="archetypes">
      <h2 id="archetypes">Every archetype</h2>
      <p class="note">sampleRecap with each archetype in turn: the character badge and the diorama card</p>
      <div class="themes">${archetypes("light")}${archetypes("dark")}</div>
    </section>`;
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
  header, main { max-width: 1160px; margin: 0 auto; padding: 24px 16px; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  h2 { margin: 0; font-size: 18px; }
  header p, .note { margin: 0; color: var(--muted); }
  section { padding-block: 28px; border-top: 1px solid var(--line); }
  .note { margin-bottom: 14px; }
  .themes { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 540px), 1fr)); }
  .readme { border-radius: 6px; padding: 20px 16px; overflow-x: auto; }
  .light { background: #ffffff; color: #1f2328; border: 1px solid #d1d9e0; }
  .dark { background: #0d1117; color: #f0f6fc; border: 1px solid #3d444d; }
  .theme { margin: 0 0 12px; font-size: 12px; font-weight: 600; }
  .badges { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  figure { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
  figcaption code { font-size: 12px; opacity: 0.8; }
  .cards { display: flex; flex-direction: column; gap: 20px; }
  .stack { flex-direction: column; align-items: flex-start; gap: 8px; }
  img { display: block; max-width: 100%; height: auto; }
</style>
</head>
<body>
<header>
  <h1>README badge preview</h1>
  <p>Sample data from the story's test fixtures, not a real account. Issue #193, ADR-0035.</p>
</header>
<main>${sections}${everyArchetype}
</main>
</body>
</html>`;
}

Bun.serve({
  port: PORT,
  fetch: () => new Response(page(), { headers: { "Content-Type": "text/html; charset=utf-8" } }),
});
console.log(`badge preview on http://localhost:${PORT}`);
