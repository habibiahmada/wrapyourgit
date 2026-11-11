import "server-only";
import { toPublicRecap } from "@wyg/analytics";
import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS } from "@wyg/video/copy";
import { calendarGrid, heatLevels } from "@wyg/video/heat";
import { and, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { db, recaps } from "./db";

/*
 * The shareable summary card (PRD P0 "PNG summary card"), also used as the public page's OG image.
 * Rendered with next/og, so it needs no browser or Remotion. Callers must pass the PUBLIC
 * projection (toPublicRecap); the card itself only shows aggregates.
 */

export const CARD_SIZE = { width: 1200, height: 630 } as const;

const INK = "#14130F";
const PAPER = "#F4EFE3";
const PERSIMMON = "#E4572E";
const HEAT = ["#9BE9A8", "#40C463", "#30A14E", "#216E39"];

/**
 * Satori needs TTF/OTF, not the woff2 next/font serves. Google Fonts returns TTF to a non-browser
 * user agent. Cached per process; a failed fetch is retried on the next card.
 */
const fontCache = new Map<number, Promise<ArrayBuffer>>();
async function fetchBricolage(weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@${weight}`,
  ).then((response) => response.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("Bricolage Grotesque TTF not found in Google Fonts CSS");
  return fetch(url).then((response) => response.arrayBuffer());
}

function bricolage(weight: 400 | 700 | 800): Promise<ArrayBuffer> {
  const cached = fontCache.get(weight);
  if (cached) return cached;
  const font = fetchBricolage(weight);
  fontCache.set(weight, font);
  font.catch(() => fontCache.delete(weight));
  return font;
}

/** Bricolage Grotesque at the three weights the design uses, for any next/og render. */
export async function cardFonts() {
  const [regular, bold, heavy] = await Promise.all([
    bricolage(400),
    bricolage(700),
    bricolage(800),
  ]);
  return [
    { name: "Bricolage", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Bricolage", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Bricolage", data: heavy, weight: 800 as const, style: "normal" as const },
  ];
}

export async function renderCard(data: RecapData): Promise<ImageResponse> {
  const { contributions, languages, identity, profile, meta } = data;
  const levels = heatLevels(contributions.calendar);
  const { cells, weeks } = calendarGrid(contributions.calendar);
  const cell = 15;
  const facts = [
    { label: "active days", value: contributions.activeDays.toLocaleString("en-US") },
    { label: "longest streak", value: `${contributions.longestStreak.days} days` },
    languages.top[0] ? { label: "top language", value: languages.top[0].name } : null,
    identity.archetype ? { label: "archetype", value: ARCHETYPE_LABELS[identity.archetype] } : null,
  ].filter((fact) => fact !== null);

  const fonts = await cardFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: INK,
        color: PAPER,
        padding: "56px 64px",
        fontFamily: "Bricolage",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}
      >
        <span>
          @{profile.login} · {meta.year}
        </span>
        <span>WrapYourGit</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 56 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 150, fontWeight: 800, lineHeight: 0.9, letterSpacing: -4 }}>
            {contributions.total.toLocaleString("en-US")}
          </span>
          <span style={{ fontSize: 32, fontWeight: 700, marginTop: 12 }}>
            {meta.isFinal
              ? `contributions in ${meta.year}`
              : `contributions so far in ${meta.year}`}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 36px", maxWidth: 520 }}>
          {facts.map((fact) => (
            <div key={fact.label} style={{ display: "flex", flexDirection: "column", width: 240 }}>
              <span style={{ fontSize: 22, fontWeight: 400 }}>{fact.label}</span>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: fact.label === "archetype" ? PERSIMMON : PAPER,
                }}
              >
                {fact.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", position: "relative", width: weeks * cell, height: 7 * cell }}>
        {cells.map(({ week, weekday }, i) => {
          const level = levels[i] ?? 0;
          return (
            <div
              key={contributions.calendar[i]?.date}
              style={{
                position: "absolute",
                left: week * cell,
                top: weekday * cell,
                width: cell - 3,
                height: cell - 3,
                borderRadius: 3,
                background: level > 0 ? (HEAT[level - 1] ?? HEAT[0]) : "rgba(244,239,227,0.1)",
              }}
            />
          );
        })}
      </div>
    </div>,
    {
      ...CARD_SIZE,
      fonts,
    },
  );
}

/**
 * The owner's card as PNG bytes (/api/card), cached per user and sync time. Rendering is the
 * expensive part, so each recap version renders once; a new sync changes `_syncedAtIso` and with
 * it the cache key.
 */
export async function cardPng(
  userId: string,
  // Unused in the body on purpose: as an argument it is part of the cache key.
  _syncedAtIso: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  "use cache";
  cacheLife("days");
  const [row] = await db
    .select({ data: recaps.data })
    .from(recaps)
    .where(and(eq(recaps.userId, userId), eq(recaps.year, EDITION_YEAR)));
  if (!row) return null;
  const card = await renderCard(toPublicRecap(row.data));
  return new Uint8Array(await card.arrayBuffer());
}

/**
 * A public recap's card (loadPublicRecap's data, already public) as PNG bytes. The data is the
 * cache key: a refetch that changes nothing renders nothing, and a changed recap renders once.
 */
export async function publicCardPng(data: RecapData): Promise<Uint8Array<ArrayBuffer>> {
  "use cache";
  cacheLife("days");
  const card = await renderCard(data);
  return new Uint8Array(await card.arrayBuffer());
}
