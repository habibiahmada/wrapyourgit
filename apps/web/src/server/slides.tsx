import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toPublicRecap } from "@wyg/analytics";
import { EDITION_YEAR, type RecapData } from "@wyg/schema";
import { ARCHETYPE_LABELS, NO_ARCHETYPE } from "@wyg/video/copy";
import { calendarGrid, heatLevels } from "@wyg/video/heat";
import { congratsLetter } from "@wyg/video/letter";
import { and, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import { cardFonts } from "./card";
import { db, recaps } from "./db";

/*
 * The story as ten still slides (4:5, Instagram feed size) for the PNG and PDF exports. Each slide
 * mirrors one story chapter in the same poster language; 3D characters come from the baked PNGs in
 * public/art. Callers pass the PUBLIC projection: these files are made to be shared.
 * Plain <img> is correct here (Satori renders the JSX, not a browser); biome.json turns off
 * noImgElement for this file.
 */

export const SLIDE_SIZE = { width: 1080, height: 1350 } as const;
export const SLIDE_TITLES = [
  "Intro",
  "Contributions",
  "Rhythm",
  "Languages",
  "Projects",
  "Community",
  "Engineering",
  "Archetype",
  "Summary",
  "Letter",
] as const;

const INK = "#14130F";
const PAPER = "#F4EFE3";
const INK_SOFT = "#5C584E";
const PERSIMMON = "#E4572E";
const COBALT = "#2B39C8";
const GREEN = "#39D353";
const HEAT = ["#9BE9A8", "#40C463", "#30A14E", "#216E39"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const n = (value: number) => value.toLocaleString("en-US");
const artCache = new Map<string, Promise<string>>();
/** A baked 3D illustration as a data URL (Satori can't fetch relative paths). */
function art(id: string): Promise<string> {
  let cached = artCache.get(id);
  if (!cached) {
    cached = readFile(join(process.cwd(), "public/art", `${id}.png`)).then(
      (bytes) => `data:image/png;base64,${bytes.toString("base64")}`,
    );
    artCache.set(id, cached);
  }
  return cached;
}

function Frame({
  field,
  color,
  children,
  data,
  index,
}: {
  field: string;
  color: string;
  children: ReactNode;
  data: RecapData;
  index: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: field,
        color,
        padding: "80px 84px",
        fontFamily: "Bricolage",
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700 }}
      >
        <span>
          @{data.profile.login} · {data.meta.year}
        </span>
        <span>
          {index + 1}/{SLIDE_TITLES.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>WrapYourGit</div>
    </div>
  );
}

const Big = ({ children, size = 220 }: { children: ReactNode; size?: number }) => (
  <span style={{ fontSize: size, fontWeight: 800, lineHeight: 0.92, letterSpacing: -6 }}>
    {children}
  </span>
);
const Label = ({ children, color }: { children: ReactNode; color?: string }) => (
  <span style={{ fontSize: 44, fontWeight: 700, marginTop: 18, color }}>{children}</span>
);
const Chip = ({
  children,
  field,
  color,
}: {
  children: ReactNode;
  field: string;
  color: string;
}) => (
  <span
    style={{
      display: "flex",
      background: field,
      color,
      fontSize: 40,
      fontWeight: 700,
      padding: "18px 30px",
      borderRadius: 12,
      marginTop: 18,
    }}
  >
    {children}
  </span>
);

function Graph({ data, cell = 16 }: { data: RecapData; cell?: number }) {
  const levels = heatLevels(data.contributions.calendar);
  const { cells, weeks } = calendarGrid(data.contributions.calendar);
  return (
    <div style={{ display: "flex", position: "relative", width: weeks * cell, height: 7 * cell }}>
      {cells.map(({ week, weekday }, i) => {
        const level = levels[i] ?? 0;
        return (
          <div
            key={data.contributions.calendar[i]?.date}
            style={{
              position: "absolute",
              left: week * cell,
              top: weekday * cell,
              width: cell - 3,
              height: cell - 3,
              borderRadius: 3,
              background: level > 0 ? (HEAT[level - 1] ?? GREEN) : "rgba(20,19,15,0.08)",
            }}
          />
        );
      })}
    </div>
  );
}

async function slide(data: RecapData, index: number): Promise<ReactElement> {
  const { contributions, languages, repositories, community, engineering, identity, meta } = data;
  const frame = (field: string, color: string, children: ReactNode) => (
    <Frame field={field} color={color} data={data} index={index}>
      {children}
    </Frame>
  );
  const soFar = meta.isFinal ? "" : " so far";

  switch (index) {
    case 0:
      return frame(
        INK,
        PAPER,
        <div style={{ display: "flex", flexDirection: "column" }}>
          <img
            src={await art("hero-cast")}
            width={912}
            height={684}
            style={{ borderRadius: 24 }}
            alt=""
          />
          <span style={{ fontSize: 120, fontWeight: 800, lineHeight: 0.95, marginTop: 40 }}>
            Every green square has a story.
          </span>
        </div>,
      );
    case 1:
      return frame(
        PERSIMMON,
        INK,
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Big size={contributions.total >= 10_000 ? 190 : 240}>{n(contributions.total)}</Big>
          <Label>{`contributions${soFar} in ${meta.year}`}</Label>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
            {contributions.activeDays > 0 && (
              <Chip field={INK} color={PAPER}>{`${n(contributions.activeDays)} active days`}</Chip>
            )}
            {contributions.longestStreak.days > 0 && (
              <Chip
                field={INK}
                color={PAPER}
              >{`${n(contributions.longestStreak.days)}-day longest streak`}</Chip>
            )}
          </div>
        </div>,
      );
    case 2: {
      const max = Math.max(...contributions.weekday);
      return frame(
        PAPER,
        INK,
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Graph data={data} cell={17} />
          {contributions.busiestMonth && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 70 }}>
              <Big size={150}>{MONTHS[contributions.busiestMonth.month - 1]}</Big>
              <Label
                color={INK_SOFT}
              >{`busiest month · ${n(contributions.busiestMonth.count)} contributions`}</Label>
            </div>
          )}
          {max > 0 && (
            <Label
              color={INK_SOFT}
            >{`most active on ${WEEKDAYS[contributions.weekday.indexOf(max)]}s`}</Label>
          )}
        </div>,
      );
    }
    case 3:
      return frame(
        COBALT,
        PAPER,
        languages.top[0] ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label>your top language</Label>
            <Big size={languages.top[0].name.length > 10 ? 120 : 170}>{languages.top[0].name}</Big>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
              {languages.top.map((language, i) => (
                <div
                  key={language.name}
                  style={{ display: "flex", flexDirection: "column", marginTop: 26 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 38,
                      fontWeight: 700,
                    }}
                  >
                    <span>{language.name}</span>
                    <span>
                      {language.share < 0.01 ? "<1%" : `${Math.round(language.share * 100)}%`}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      height: 18,
                      marginTop: 10,
                      background: "rgba(244,239,227,0.18)",
                      borderRadius: 9,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: `${Math.max(2, language.share * 100)}%`,
                        background: i === 0 ? GREEN : PAPER,
                        borderRadius: 9,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Big size={110}>No language data yet.</Big>
        ),
      );
    case 4: {
      const [lead, ...rest] = repositories.top;
      return frame(
        PAPER,
        INK,
        lead ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label>your top repository</Label>
            <Big size={lead.nameWithOwner.length > 28 ? 90 : 130}>
              {lead.nameWithOwner.split("/")[1] ?? lead.nameWithOwner}
            </Big>
            <Label color={INK_SOFT}>{`${n(lead.commits)} commits`}</Label>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 50 }}>
              {rest.map((repo) => (
                <div
                  key={repo.nameWithOwner}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 38,
                    fontWeight: 700,
                    marginTop: 16,
                  }}
                >
                  <span>{repo.nameWithOwner.split("/")[1]}</span>
                  <span>{n(repo.commits)}</span>
                </div>
              ))}
            </div>
            {repositories.createdThisYear > 0 && (
              <Label
                color={INK_SOFT}
              >{`${n(repositories.createdThisYear)} new repositories this year`}</Label>
            )}
          </div>
        ) : (
          <Big size={110}>No repository commits yet.</Big>
        ),
      );
    }
    case 5: {
      const gained = community.starsGained.status === "ok" && community.starsGained.value > 0;
      const value =
        gained && community.starsGained.status === "ok"
          ? community.starsGained.value
          : community.totalStars;
      return frame(
        COBALT,
        PAPER,
        value > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Big>{`${gained && community.starsGained.status === "ok" && community.starsGained.estimated ? "~" : ""}${n(value)}`}</Big>
            <Label>{gained ? `stars gained in ${meta.year}` : "stars across your projects"}</Label>
            {community.mostStarred && (
              <Chip
                field={PAPER}
                color={INK}
              >{`most starred: ${community.mostStarred.nameWithOwner.split("/")[1]} · ${n(community.mostStarred.stars)}`}</Chip>
            )}
          </div>
        ) : (
          <Big size={110}>No stars on your projects yet.</Big>
        ),
      );
    }
    case 6: {
      const counters = [
        { label: "pull requests", value: engineering.prsOpened, green: false },
        engineering.prsMerged.status === "ok"
          ? { label: "merged", value: engineering.prsMerged.value, green: true }
          : null,
        { label: "reviews", value: engineering.reviews, green: false },
        { label: "issues opened", value: engineering.issuesOpened, green: false },
        { label: "repos you don't own", value: engineering.externalRepos, green: false },
      ].filter((c) => c !== null && c.value > 0) as {
        label: string;
        value: number;
        green: boolean;
      }[];
      return frame(
        INK,
        PAPER,
        counters.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label>your engineering footprint</Label>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 30 }}>
              {counters.map((c) => (
                <div
                  key={c.label}
                  style={{ display: "flex", flexDirection: "column", width: "50%", marginTop: 40 }}
                >
                  <span
                    style={{
                      fontSize: 130,
                      fontWeight: 800,
                      color: c.green ? GREEN : PAPER,
                      lineHeight: 1,
                    }}
                  >
                    {n(c.value)}
                  </span>
                  <span style={{ fontSize: 38, fontWeight: 700 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Big size={110}>No pull requests or issues this year.</Big>
        ),
      );
    }
    case 7:
      return frame(
        PERSIMMON,
        INK,
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Label>{`your ${meta.year} archetype`}</Label>
          {identity.archetype ? (
            <>
              <Big size={150}>{ARCHETYPE_LABELS[identity.archetype]}</Big>
              <img
                src={await art(identity.archetype)}
                width={912}
                height={684}
                style={{ borderRadius: 24, marginTop: 30 }}
                alt=""
              />
              {identity.reasons.slice(0, 2).map((reason) => (
                <Chip key={reason} field={INK} color={PAPER}>
                  {reason}
                </Chip>
              ))}
            </>
          ) : (
            <Big size={120}>{NO_ARCHETYPE}</Big>
          )}
        </div>,
      );
    case 8:
      return frame(
        INK,
        PAPER,
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            [meta.isFinal ? "contributions" : "contributions so far", n(contributions.total)],
            ["active days", n(contributions.activeDays)],
            ["top language", languages.top[0]?.name ?? "n/a"],
            [
              "archetype",
              identity.archetype ? ARCHETYPE_LABELS[identity.archetype] : "just beginning",
            ],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
              <span style={{ fontSize: 34, fontWeight: 700 }}>{label}</span>
              <span style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{value}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              marginTop: 60,
              background: PAPER,
              padding: 18,
              borderRadius: 16,
            }}
          >
            <Graph data={data} cell={16} />
          </div>
        </div>,
      );
    default: {
      const letter = congratsLetter(data);
      return frame(
        PAPER,
        INK,
        <div style={{ display: "flex", flexDirection: "column" }}>
          <img
            src={await art("cutout-cell-proud")}
            width={280}
            height={210}
            style={{ alignSelf: "flex-end", flexShrink: 0 }}
            alt=""
          />
          {/* flexShrink 0: Satori squeezes flex children instead of overflowing, which stacks them. */}
          <span style={{ fontSize: 44, fontWeight: 800, flexShrink: 0 }}>{letter.greeting}</span>
          {letter.paragraphs.map((paragraph) => (
            <span
              key={paragraph}
              style={{ fontSize: 24, lineHeight: 1.42, marginTop: 12, flexShrink: 0 }}
            >
              {paragraph}
            </span>
          ))}
          <span style={{ fontSize: 28, fontWeight: 700, marginTop: 22, flexShrink: 0 }}>
            {letter.signOff}
          </span>
        </div>,
      );
    }
  }
}

/** Slide `index` (0-based) of the story as a PNG response. */
export async function renderSlide(data: RecapData, index: number): Promise<ImageResponse> {
  return new ImageResponse(await slide(data, index), { ...SLIDE_SIZE, fonts: await cardFonts() });
}

/**
 * Slide PNG bytes, cached per user, sync time and slide. The PDF and ZIP exports reuse them, so a
 * full export renders each slide once per recap version.
 */
export async function slidePng(
  userId: string,
  // Unused in the body on purpose: as an argument it is part of the cache key.
  _syncedAtIso: string,
  index: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  "use cache";
  cacheLife("days");
  const [row] = await db
    .select({ data: recaps.data })
    .from(recaps)
    .where(and(eq(recaps.userId, userId), eq(recaps.year, EDITION_YEAR)));
  if (!row) return null;
  const image = await renderSlide(toPublicRecap(row.data), index);
  return new Uint8Array(await image.arrayBuffer());
}

/** File name for a slide, e.g. wrapyourgit-2026-octo-08-archetype.png. */
export function slideFileName(year: number, login: string, index: number): string {
  const title = (SLIDE_TITLES[index] ?? "slide").toLowerCase();
  return `wrapyourgit-${year}-${login}-${String(index + 1).padStart(2, "0")}-${title}.png`;
}
