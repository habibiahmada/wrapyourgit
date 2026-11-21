import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "@wyg/video/copy";
import { heatLevels } from "@wyg/video/heat";
import { LOGO_CELLS } from "../components/site/logo-mark";
import { ARCHETYPE_ART, type BadgeImage } from "./archetype-art";
import { textWidth } from "./text-width";

/*
 * README badges, the README card and the archetype card (ADR-0035). Plain SVG strings: a README image is an <img>
 * behind GitHub's proxy, so it can load no font, script or stylesheet. Callers pass the PUBLIC
 * recap (loadPublicRecap) or null, and null draws the neutral image, the same for a hidden,
 * unknown or not-yet-fetched account so the badge never tells them apart.
 */

// The site's warm ink (DESIGN.md "Web"). Contrast measured with antislop's checker: fg 16.5:1 on
// HEAD and 14.5:1 on SURFACE, muted 7.3:1 and 6.4:1, green 8.0:1 on SURFACE.
const HEAD = "#0b0a08";
const SURFACE = "#1b1a16";
const FG = "#eeeae0";
const MUTED = "#a29d90";
const GREEN = "#4cc764";
// inkSoft: the darkest edge still visible on GitHub's dark README background (2.7:1 on #0d1117).
const EDGE = "#5c584e";
// GitHub's contribution greens, as on the site; level 0 is SURFACE.
const HEAT = [SURFACE, "#0e4429", "#006d32", "#26a641", "#39d353"];
const FONT = "Mona Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

export const BADGE_SHOWS = ["contributions", "streak", "days", "language", "archetype"] as const;
export type BadgeShow = (typeof BADGE_SHOWS)[number];

/** The `?show=` value, or the default for anything else. */
export function badgeShow(value: string | null | undefined): BadgeShow {
  return BADGE_SHOWS.find((show) => show === value) ?? "contributions";
}

interface Run {
  text: string;
  color: string;
  bold?: boolean;
}

interface Content {
  runs: Run[];
  /** A colour dot before the value: the language's own colour. */
  swatch?: string;
  /** A small picture before the value: the archetype's character. */
  image?: BadgeImage;
  /** The value in words, for the image's accessible name. */
  words: string;
}

const count = (n: number) => new Intl.NumberFormat("en-US").format(n);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * What the right half of a badge says, or null when this recap has nothing honest to show for
 * `show` (no top language, no archetype): the caller draws the neutral badge then.
 */
export function badgeContent(recap: RecapData, show: BadgeShow): Content | null {
  const soFar: Run[] = recap.meta.isFinal ? [] : [{ text: "so far", color: MUTED }];
  const tail = recap.meta.isFinal ? "" : " so far";
  const { contributions } = recap;
  switch (show) {
    case "contributions": {
      const n = contributions.total;
      const noun = plural(n, "contribution", "contributions");
      return {
        runs: [{ text: count(n), color: GREEN, bold: true }, { text: noun, color: FG }, ...soFar],
        words: `${count(n)} ${noun}${tail}`,
      };
    }
    case "streak": {
      // "longest streak 0 days" reads where "0-day longest streak" would not.
      const n = contributions.longestStreak.days;
      const noun = plural(n, "day", "days");
      return {
        runs: [
          { text: "longest streak", color: FG },
          { text: count(n), color: GREEN, bold: true },
          { text: noun, color: FG },
          ...soFar,
        ],
        words: `longest streak ${count(n)} ${noun}${tail}`,
      };
    }
    case "days": {
      const n = contributions.activeDays;
      const noun = plural(n, "active day", "active days");
      return {
        runs: [{ text: count(n), color: GREEN, bold: true }, { text: noun, color: FG }, ...soFar],
        words: `${count(n)} ${noun}${tail}`,
      };
    }
    case "language": {
      const top = recap.languages.top[0];
      if (!top) return null;
      return {
        swatch: top.color ?? MUTED,
        runs: [
          { text: top.name, color: FG, bold: true },
          { text: "top language", color: MUTED },
          ...soFar,
        ],
        words: `top language ${top.name}${tail}`,
      };
    }
    case "archetype": {
      const id = recap.identity.archetype;
      if (!id) return null;
      const label = ARCHETYPE_LABELS[id];
      return {
        image: ARCHETYPE_ART[id].character,
        runs: [
          { text: label, color: FG, bold: true },
          { text: "archetype", color: MUTED },
          ...soFar,
        ],
        words: `${label} archetype${tail}`,
      };
    }
  }
}

const xml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** "21 Nov 2026" from an ISO date, in UTC like the recap's days. */
function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** One run of text at `x`, held to its estimated width so every system's face fits the layout. */
function text(run: Run, x: number, y: number, size: number, anchor?: "end"): string {
  const width = textWidth(run.text, size, run.bold).toFixed(1);
  return `<text x="${x.toFixed(1)}" y="${y}" fill="${run.color}" font-size="${size}"${
    run.bold ? ' font-weight="700"' : ""
  }${anchor ? ` text-anchor="${anchor}"` : ""} textLength="${width}" lengthAdjust="spacingAndGlyphs">${xml(run.text)}</text>`;
}

/** Runs laid out left to right from `x`, a space apart; returns the SVG and the end x. */
function line(runs: Run[], x: number, y: number, size: number): { svg: string; end: number } {
  let cursor = x;
  const parts = runs.map((run, i) => {
    if (i > 0) cursor += textWidth(" ", size);
    const part = text(run, cursor, y, size);
    cursor += textWidth(run.text, size, run.bold);
    return part;
  });
  return { svg: parts.join(""), end: cursor };
}

/** The six-cell mark (LogoMark), `cell` px squares, top-left at x, y. */
function mark(x: number, y: number, cell: number): string {
  const gap = cell * 0.375;
  return LOGO_CELLS.map((color, i) => {
    const cx = x + (i % 3) * (cell + gap);
    const cy = y + Math.floor(i / 3) * (cell + gap);
    return `<rect x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" width="${cell}" height="${cell}" rx="${(cell * 0.25).toFixed(2)}" fill="${color}"/>`;
  }).join("");
}

/** An embedded raster: a README <img> loads nothing from inside the SVG, so it travels as data. */
function image(source: BadgeImage, x: number, y: number, width: number, height: number): string {
  return `<image href="${source.href}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}"/>`;
}

const markWidth = (cell: number) => cell * 3 + cell * 0.375 * 2;

function svg(width: number, height: number, label: string, body: string): string {
  const w = Math.ceil(width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img" aria-label="${xml(label)}"><title>${xml(label)}</title><g font-family="${FONT}">${body}</g></svg>`;
}

const BADGE_HEIGHT = 28;
const BADGE_SIZE = 12;
const BADGE_PAD = 10;
const BADGE_BASELINE = 18;
const BADGE_CELL = 4;

/**
 * A one-line badge: the mark and "WrapYourGit 2026" on the left, the chosen value on the right.
 * `recap` null, or a recap with nothing for `show`, draws the neutral badge.
 */
export function badgeSvg(recap: RecapData | null, show: BadgeShow): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const content = recap && badgeContent(recap, show);

  const markTop = (BADGE_HEIGHT - markWidth(BADGE_CELL) * (2 / 3)) / 2;
  const left = line(
    [
      { text: "WrapYourGit", color: FG, bold: true },
      { text: String(year), color: MUTED },
    ],
    BADGE_PAD + markWidth(BADGE_CELL) + 7,
    BADGE_BASELINE,
    BADGE_SIZE,
  );
  const split = left.end + BADGE_PAD;

  let valueX = split + BADGE_PAD;
  let swatch = "";
  if (content?.swatch) {
    swatch = `<circle cx="${(valueX + 4).toFixed(1)}" cy="${BADGE_HEIGHT / 2}" r="4" fill="${content.swatch}" stroke="${EDGE}" stroke-width="0.5"/>`;
    valueX += 13;
  }
  let picture = "";
  if (content?.image) {
    const height = 22;
    const width = (content.image.width / content.image.height) * height;
    picture = image(content.image, valueX, (BADGE_HEIGHT - height) / 2, width, height);
    valueX += width + 6;
  }
  const right = line(
    content?.runs ?? [{ text: `See the ${year} recap`, color: FG }],
    valueX,
    BADGE_BASELINE,
    BADGE_SIZE,
  );
  const width = Math.ceil(right.end + BADGE_PAD);

  const label =
    recap && content
      ? `${recap.profile.login}'s ${year} on WrapYourGit: ${content.words}, through ${day(recap.meta.periodEnd)}`
      : `WrapYourGit ${year}: see the recap`;

  const body = [
    `<clipPath id="b"><rect width="${width}" height="${BADGE_HEIGHT}" rx="6"/></clipPath>`,
    `<g clip-path="url(#b)"><rect width="${split.toFixed(1)}" height="${BADGE_HEIGHT}" fill="${HEAD}"/><rect x="${split.toFixed(1)}" width="${(width - split).toFixed(1)}" height="${BADGE_HEIGHT}" fill="${SURFACE}"/></g>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${BADGE_HEIGHT - 1}" rx="5.5" fill="none" stroke="${EDGE}"/>`,
    mark(BADGE_PAD, markTop, BADGE_CELL),
    left.svg,
    swatch,
    picture,
    right.svg,
  ].join("");
  return svg(width, BADGE_HEIGHT, label, body);
}

const CARD_WIDTH = 500;
const CARD_HEIGHT = 186;
const CARD_PAD = 18;
const GRID_TOP = 50;
const STEP = (CARD_WIDTH - CARD_PAD * 2) / 53;
const CELL = 7;

/** Every day of `year`, in order, as ISO dates (UTC). */
function yearDays(year: number): string[] {
  const days: string[] = [];
  for (let t = Date.UTC(year, 0, 1); t < Date.UTC(year + 1, 0, 1); t += 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/**
 * The year as GitHub draws it, a column a week: days with a count in their heat level, days not
 * yet reached as outlines, so a recap before December reads as a year still being written.
 */
function grid(recap: RecapData | null, year: number): string {
  const days = yearDays(year);
  const offset = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const levels = new Map<string, number>();
  if (recap) {
    const heat = heatLevels(recap.contributions.calendar);
    recap.contributions.calendar.forEach((d, i) => {
      levels.set(d.date, heat[i] ?? 0);
    });
  }
  const end = recap?.meta.periodEnd;
  return days
    .map((date, i) => {
      const index = i + offset;
      const x = CARD_PAD + Math.floor(index / 7) * STEP;
      const y = GRID_TOP + (index % 7) * STEP;
      const at = `x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${CELL}" height="${CELL}" rx="1.5"`;
      if (!recap || (end && date > end)) {
        return `<rect ${at} fill="none" stroke="${SURFACE}"/>`;
      }
      return `<rect ${at} fill="${HEAT[levels.get(date) ?? 0]}"/>`;
    })
    .join("");
}

/**
 * The README card: the login, the year's calendar, and three numbers. `recap` null draws the
 * neutral card: an empty year and a line pointing at the recap.
 */
export function cardSvg(recap: RecapData | null): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const gridBottom = GRID_TOP + 6 * STEP + CELL;
  const valueY = gridBottom + 34;
  const captionY = valueY + 18;

  const head = recap
    ? text({ text: `@${recap.profile.login}`, color: FG, bold: true }, CARD_PAD, 34, 16)
    : line(
        [
          { text: "WrapYourGit", color: FG, bold: true },
          { text: String(year), color: MUTED },
        ],
        CARD_PAD,
        34,
        16,
      ).svg;
  const yearText = recap
    ? text(
        { text: recap.meta.isFinal ? String(year) : `${year} so far`, color: MUTED },
        CARD_WIDTH - CARD_PAD,
        34,
        12,
        "end",
      )
    : "";

  let stats: string;
  let label: string;
  if (recap) {
    const { total, longestStreak } = recap.contributions;
    const top = recap.languages.top[0];
    const column = CARD_PAD + 128;
    const third = CARD_PAD + 256;
    const languageValue = top
      ? `<circle cx="${third + 5}" cy="${valueY - 6}" r="5" fill="${top.color ?? MUTED}" stroke="${EDGE}" stroke-width="0.5"/>${text({ text: top.name, color: FG, bold: true }, third + 15, valueY, 16)}`
      : text({ text: "None yet", color: MUTED }, third, valueY, 16);
    stats = [
      text({ text: count(total), color: GREEN, bold: true }, CARD_PAD, valueY, 20),
      text(
        { text: plural(total, "contribution", "contributions"), color: MUTED },
        CARD_PAD,
        captionY,
        11,
      ),
      text({ text: count(longestStreak.days), color: GREEN, bold: true }, column, valueY, 20),
      text({ text: "longest streak (days)", color: MUTED }, column, captionY, 11),
      languageValue,
      text({ text: "top language", color: MUTED }, third, captionY, 11),
    ].join("");
    label = `${recap.profile.login}'s ${year} on WrapYourGit${recap.meta.isFinal ? "" : " so far"}: ${count(total)} ${plural(total, "contribution", "contributions")}, longest streak ${count(longestStreak.days)} ${plural(longestStreak.days, "day", "days")}${top ? `, top language ${top.name}` : ""}, through ${day(recap.meta.periodEnd)}`;
  } else {
    stats = text({ text: `See the ${year} recap`, color: FG }, CARD_PAD, valueY, 14);
    label = `WrapYourGit ${year}: see the recap`;
  }

  const site = { text: "wrapyourgit.com", color: MUTED };
  const siteWidth = textWidth(site.text, 11);
  const brand = recap
    ? `${mark(CARD_WIDTH - CARD_PAD - siteWidth - markWidth(3) - 6, captionY - 7, 3)}${text(site, CARD_WIDTH - CARD_PAD, captionY, 11, "end")}`
    : mark(CARD_WIDTH - CARD_PAD - markWidth(5), 22, 5);

  const body = [
    `<rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${CARD_HEIGHT - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>`,
    head,
    yearText,
    grid(recap, year),
    stats,
    brand,
  ].join("");
  return svg(CARD_WIDTH, CARD_HEIGHT, label, body);
}

const ARCHETYPE_WIDTH = 420;
const ARCHETYPE_HEIGHT = 200;
const DIORAMA_BOX = { x: 14, y: 14, width: 192, height: ARCHETYPE_HEIGHT - 28 };
const ARCHETYPE_TEXT_X = 222;

/**
 * The archetype card: the archetype's diorama from the landing page beside its name. `recap`
 * null, or one with no archetype, draws the neutral card: the mark and a line pointing at the
 * recap, never a diorama for an archetype the user does not have.
 */
export function archetypeCardSvg(recap: RecapData | null): string {
  const year = recap?.meta.year ?? EDITION_YEAR;
  const id = recap?.identity.archetype ?? null;
  const textWidthLeft = ARCHETYPE_WIDTH - ARCHETYPE_TEXT_X - CARD_PAD;

  let picture: string;
  let words: string;
  let label: string;
  if (recap && id) {
    const art = ARCHETYPE_ART[id].diorama;
    // Fit the diorama inside its box, keeping its shape, centred.
    const scale = Math.min(DIORAMA_BOX.width / art.width, DIORAMA_BOX.height / art.height);
    const width = art.width * scale;
    const height = art.height * scale;
    picture = image(
      art,
      DIORAMA_BOX.x + (DIORAMA_BOX.width - width) / 2,
      DIORAMA_BOX.y + (DIORAMA_BOX.height - height) / 2,
      width,
      height,
    );
    const name = ARCHETYPE_LABELS[id];
    // The longest name ("Collaborator") still fits on one line: the size gives way, not the text.
    const size = Math.min(28, textWidthLeft / textWidth(name, 1, true));
    words = [
      text({ text: "Archetype", color: MUTED }, ARCHETYPE_TEXT_X, 74, 12),
      text({ text: name, color: FG, bold: true }, ARCHETYPE_TEXT_X, 108, Math.floor(size)),
      text(
        {
          text: `@${recap.profile.login} · ${recap.meta.isFinal ? year : `${year} so far`}`,
          color: MUTED,
        },
        ARCHETYPE_TEXT_X,
        132,
        12,
      ),
    ].join("");
    label = `${recap.profile.login}'s ${year} archetype on WrapYourGit${recap.meta.isFinal ? "" : " so far"}: ${name}, through ${day(recap.meta.periodEnd)}`;
  } else {
    const cell = 14;
    picture = mark(
      DIORAMA_BOX.x + (DIORAMA_BOX.width - markWidth(cell)) / 2,
      ARCHETYPE_HEIGHT / 2 - (cell * 2 + cell * 0.375) / 2,
      cell,
    );
    words = line(
      [
        { text: "WrapYourGit", color: FG, bold: true },
        { text: String(year), color: MUTED },
      ],
      ARCHETYPE_TEXT_X,
      96,
      16,
    ).svg.concat(text({ text: `See the ${year} recap`, color: FG }, ARCHETYPE_TEXT_X, 122, 13));
    label = `WrapYourGit ${year}: see the recap`;
  }

  const site = { text: "wrapyourgit.com", color: MUTED };
  const brand = recap && id ? `${mark(ARCHETYPE_TEXT_X, 168, 3)}${text(site, ARCHETYPE_TEXT_X + markWidth(3) + 6, 175, 11)}` : "";

  const body = [
    `<rect x="0.5" y="0.5" width="${ARCHETYPE_WIDTH - 1}" height="${ARCHETYPE_HEIGHT - 1}" rx="11.5" fill="${HEAD}" stroke="${EDGE}"/>`,
    picture,
    words,
    brand,
  ].join("");
  return svg(ARCHETYPE_WIDTH, ARCHETYPE_HEIGHT, label, body);
}
