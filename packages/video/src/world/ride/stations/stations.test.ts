import { expect, test } from "bun:test";
import { withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../../../fixtures/edge-recaps";
import { sampleRecap } from "../../../fixtures/sample-recap";
import { formatCount } from "../../../theme";
import { buildCity } from "../../city";
import { busiestModel } from "../../scenes/busiest.model";
import { cityModel } from "../../scenes/city.model";
import { closingModel } from "../../scenes/closing.model";
import { firstDayModel } from "../../scenes/firstDay.model";
import { gardenModel } from "../../scenes/garden.model";
import { commitsText, projectsModel } from "../../scenes/projects.model";
import type { StopKind } from "../../stops";
import type { Box, Solid } from "../prims";
import { rideStops } from "../stops";
import { STATIONS } from "./index";
import { clip, stationContext } from "./kit";
import { blockHeight, blockName } from "./languages";

const oneLanguage: RecapData = {
  ...sampleRecap,
  languages: { top: [{ name: "Rust", color: "#dea584", share: 1 }], distinctCount: 1 },
};

function build(
  kind: StopKind,
  data: RecapData,
  progress = 1,
  frame = 10,
  overview = kind === "city" ? 1 : 0,
): Solid[] {
  const city = buildCity(data);
  const stop = rideStops(data, city).find((s) => s.kind === kind);
  const station = STATIONS[kind];
  if (!stop || !station) throw new Error(`no station for ${kind}`);
  return station(stationContext(data, city, stop, progress, frame, overview));
}
const boxes = (solids: Solid[], tag: string) =>
  solids.filter((s): s is Box => s.kind === "box" && s.tag === tag);
const printed = (solids: Solid[]) =>
  solids.flatMap((s) => (s.kind === "box" ? (s.texts ?? []).map((t) => t.text) : []));

test("the stations built so far exist", () => {
  expect(Object.keys(STATIONS).sort()).toEqual([
    "busiest",
    "city",
    "closing",
    "first-day",
    "hello",
    "languages",
    "private",
    "projects",
  ]);
});

test("languages: every tree's label and name are printed, in the model's words", () => {
  const model = gardenModel(sampleRecap);
  const text = printed(build("languages", sampleRecap));
  for (const tree of model.trees) {
    expect(text).toContain(tree.label);
    expect(text).toContain(blockName(tree.name));
  }
  expect(text).toContain(model.title);
  if (model.otherNote) expect(text).toContain(model.otherNote);
});

test("languages: a block is as tall as its share says, at rest", () => {
  const model = gardenModel(sampleRecap);
  const blocks = boxes(build("languages", sampleRecap), "language");
  expect(blocks).toHaveLength(model.trees.length);
  const first = blocks.find((b) => b.texts?.some((t) => t.text === model.trees[0]?.label));
  expect(first?.size[2]).toBeCloseTo(blockHeight(model.trees[0]?.share ?? 0, "landscape"));
  // A bigger share stands taller, in every layout.
  for (const layout of ["portrait", "compact", "landscape"] as const) {
    expect(blockHeight(0.6, layout)).toBeGreaterThan(blockHeight(0.2, layout));
  }
  expect(first?.at[2]).toBeCloseTo(0.47);
});

test("languages: the share is printed on all four sides, under the logo", () => {
  const block = boxes(build("languages", sampleRecap), "language")[0];
  expect(block?.logo).toContain("lang/");
  const share = block?.texts?.find((t) => /%$/.test(t.text));
  expect(share?.on).toBe("all");
});

test("languages: text is dark on a light block and white on a dark one", () => {
  const data: RecapData = {
    ...sampleRecap,
    languages: {
      top: [
        { name: "JavaScript", color: "#f1e05a", share: 0.6 },
        { name: "TypeScript", color: "#3178c6", share: 0.4 },
      ],
      distinctCount: 2,
    },
  };
  const blocks = boxes(build("languages", data), "language");
  const ink = (name: string) =>
    blocks.find((b) => b.texts?.some((t) => t.text === name))?.texts?.[0]?.fill;
  expect(ink("JavaScript")).toBe("#0d1117");
  expect(ink("TypeScript")).toBe("#ffffff");
});

test("languages: a language without a logo gets its initials on a badge", () => {
  const data: RecapData = {
    ...sampleRecap,
    languages: { top: [{ name: "Brainfuck", color: "#2f2530", share: 1 }], distinctCount: 1 },
  };
  const block = boxes(build("languages", data), "language")[0];
  expect(block?.logo).toBeUndefined();
  expect(printed([block as Box])).toContain("Br");
});

test("languages: one language builds one block, none builds none and says so", () => {
  expect(boxes(build("languages", oneLanguage), "language")).toHaveLength(1);
  const empty = build("languages", emptyRecap);
  const none = gardenModel(emptyRecap);
  if (none.empty) {
    expect(boxes(empty, "language")).toHaveLength(0);
    expect(printed(empty)).toContain(none.title);
    expect(boxes(empty, "covered").length).toBeGreaterThan(0);
  }
});

test("languages: five languages stand on two tiers, none touching, all on the plaza", () => {
  const city = buildCity(busyRecap);
  const stop = rideStops(busyRecap, city).find((x) => x.kind === "languages");
  if (!stop) throw new Error("no stop");
  const station = STATIONS.languages as NonNullable<typeof STATIONS.languages>;
  const all = station(stationContext(busyRecap, city, stop, 1, 0, 0, "portrait"));
  const blocks = boxes(all, "language");
  expect(blocks).toHaveLength(5);
  // Three on the raised tier behind, two in front of it.
  expect(blocks.filter((b) => b.at[2] > 1.5).length).toBe(3);
  expect(boxes(all, "tier")).toHaveLength(1);
  const overlap = (a: Box, b: Box) =>
    a.at[0] < b.at[0] + b.size[0] &&
    b.at[0] < a.at[0] + a.size[0] &&
    a.at[1] < b.at[1] + b.size[1] &&
    b.at[1] < a.at[1] + a.size[1];
  blocks.forEach((a, i) => {
    for (const b of blocks.slice(i + 1)) expect(overlap(a, b)).toBe(false);
  });
  const slab = boxes(all, "plaza")[0] as Box;
  for (const b of blocks) {
    expect(b.at[0]).toBeGreaterThanOrEqual(slab.at[0]);
    expect(b.at[0] + b.size[0]).toBeLessThanOrEqual(slab.at[0] + slab.size[0]);
    expect(b.at[1]).toBeGreaterThanOrEqual(slab.at[1]);
    expect(b.at[1] + b.size[1]).toBeLessThanOrEqual(slab.at[1] + slab.size[1]);
  }
  expect(slab.size[0]).toBeLessThanOrEqual(14);
});

test("languages: a wide frame keeps five languages in one row", () => {
  const all = build("languages", busyRecap);
  expect(boxes(all, "tier")).toHaveLength(0);
  expect(boxes(all, "language")).toHaveLength(5);
});

test("languages: up to three languages stand in one row on the plaza", () => {
  const all = build("languages", sampleRecap);
  expect(boxes(all, "tier")).toHaveLength(0);
  expect(new Set(boxes(all, "language").map((b) => b.at[2].toFixed(3))).size).toBe(1);
});

test("projects: one container per repository, stacked with the first at the bottom", () => {
  const stacks = projectsModel(sampleRecap).stacks;
  for (const layout of ["portrait", "compact", "landscape"] as const) {
    const city = buildCity(sampleRecap);
    const stop = rideStops(sampleRecap, city).find((x) => x.kind === "projects");
    if (!stop) throw new Error("no stop");
    const station = STATIONS.projects as NonNullable<typeof STATIONS.projects>;
    const containers = boxes(
      station(stationContext(sampleRecap, city, stop, 1, 0, 0, layout)),
      "container",
    );
    expect(containers).toHaveLength(stacks.length);
    // Each stands on the one before it: nothing floats and nothing shares space.
    containers.forEach((box, i) => {
      const below = containers[i - 1];
      if (below) expect(box.at[2]).toBeCloseTo(below.at[2] + below.size[2]);
    });
    expect(printed([containers[0] as Box])).toContain(clip(stacks[0]?.label ?? "", 14));
  }
});

test("projects: a container's lit band is as long as its share of the largest repository", () => {
  const stacks = projectsModel(sampleRecap).stacks;
  const most = Math.max(...stacks.map((stack) => stack.commits));
  boxes(build("projects", sampleRecap), "container").forEach((box, i) => {
    const band = (box.decals ?? []).find((d) => d.on === "sides" && d.rect[0] === 0);
    expect(band?.rect[2] ?? 0).toBeCloseTo((stacks[i]?.commits ?? 0) / most);
  });
});

test("languages: blocks drop in before the stop and none is in the air at rest", () => {
  const early = boxes(build("languages", sampleRecap, 0.3), "language");
  const rest = boxes(build("languages", sampleRecap, 1), "language");
  expect(early.length).toBeLessThanOrEqual(rest.length);
  expect(Math.max(...early.map((b) => b.at[2]), 0.47)).toBeGreaterThan(0.47);
  for (const b of rest) expect(b.at[2]).toBeCloseTo(0.47);
});

test("projects: every stack's label and exact commits are printed at rest, and count up before", () => {
  const model = projectsModel(sampleRecap);
  const rest = printed(build("projects", sampleRecap));
  for (const stack of model.stacks) {
    // The model's figure, with its unit beside it.
    expect(rest).toContain(clip(stack.label, 14));
    expect(rest).toContain(commitsText(stack.commits));
  }
  expect(rest).toContain(model.title);
  const figure = commitsText(model.stacks[0]?.commits ?? 0);
  expect(printed(build("projects", sampleRecap, 0.3))).not.toContain(figure);
});

test("projects: no container is there before it lands, and none ever reads zero", () => {
  expect(boxes(build("projects", sampleRecap, 0), "container")).toHaveLength(0);
  for (const progress of [0.05, 0.2, 0.5, 0.8]) {
    for (const text of printed(boxes(build("projects", sampleRecap, progress), "container"))) {
      expect(text).not.toBe("0");
    }
  }
});

test("projects: long names are cut, an empty shelf says so", () => {
  const labels = boxes(build("projects", busyRecap), "container").flatMap((b) =>
    (b.texts ?? []).map((t) => t.text),
  );
  for (const label of labels.filter((text) => !/ commits?$/.test(text)))
    expect(label.length).toBeLessThanOrEqual(14);
  const none = projectsModel(emptyRecap);
  const empty = build("projects", {
    ...emptyRecap,
    repositories: { ...emptyRecap.repositories, top: [] },
  });
  expect(boxes(empty, "container")).toHaveLength(0);
  // The sign may break a long title over two rows.
  expect(printed(empty).join(" ")).toContain(none.empty ? none.title : "No repository commits yet");
});

test("projects: no station names a repository the data hides", () => {
  const hidden = withoutPrivateNames(sampleRecap);
  const model = projectsModel(hidden);
  const text = printed(boxes(build("projects", hidden), "container"));
  // A container prints on both of its long sides, so every name appears twice; the commits are not names.
  const names = [...new Set(text.filter((t) => !/ commits?$/.test(t)))].sort();
  expect(names).toEqual(model.stacks.map((stack) => clip(stack.label, 14)).sort());
});

test("hello prints the year and the login, and the scope line when the recap is public", () => {
  const text = printed(build("hello", sampleRecap));
  expect(text).toContain("2026");
  expect(text).toContain(`@${sampleRecap.profile.login}`);
  const open = printed(
    build("hello", { ...sampleRecap, meta: { ...sampleRecap.meta, scope: "public" } }),
  );
  expect(open.join(" ")).toContain("Public GitHub activity only");
});

test("hello breaks a long login over rows instead of printing it small", () => {
  const login = `@${busyRecap.profile.login}`;
  const text = [...new Set(printed(build("hello", busyRecap)))];
  const rows = text.filter((line) => line !== String(busyRecap.meta.year));
  expect(rows.length).toBeGreaterThan(1);
  expect(rows.join("")).toBe(login);
  for (const row of rows) expect(row.length).toBeLessThanOrEqual(20);
});

test("city prints the model's headline, the exact total and the legend of a year still running", () => {
  const model = cityModel(sampleRecap);
  const text = printed(build("city", sampleRecap));
  // The billboard may break a long line over two rows.
  expect(text.join(" ")).toContain(model.headline);
  expect(text).toContain(formatCount(model.total));
  const running: RecapData = {
    ...sampleRecap,
    meta: { ...sampleRecap.meta, isFinal: false, periodEnd: "2026-11-09" },
  };
  expect(printed(build("city", running)).join(" ")).toContain(cityModel(running).legend ?? "");
});

test("city's billboard is only there for the overview", () => {
  expect(build("city", sampleRecap, 1, 10, 0)).toEqual([]);
  expect(build("city", sampleRecap, 1, 10, 1).length).toBeGreaterThan(0);
});

test("city's billboard is lowered in as the overview settles, not put there all at once", () => {
  const foot = (overview: number) =>
    Math.min(...boxes(build("city", sampleRecap, 1, 10, overview), "board").map((b) => b.at[2]));
  // While the camera is still near the train there is nothing: a billboard that size would fill the frame.
  expect(build("city", sampleRecap, 1, 10, 0.3)).toEqual([]);
  expect(foot(0.6)).toBeGreaterThan(foot(1) + 10);
  expect(foot(0.95)).toBeGreaterThan(foot(1));
});

test("closing prints the date line, the year and every line of the model", () => {
  const model = closingModel(sampleRecap);
  const text = printed(build("closing", sampleRecap));
  expect(text).toContain(model.date);
  expect(text).toContain(String(model.year));
  for (const line of model.lines) expect(text).toContain(line);
});

test("a station at rest is the same 60 frames later, and still moving in between", () => {
  for (const kind of [
    "hello",
    "first-day",
    "private",
    "city",
    "busiest",
    "languages",
    "projects",
    "closing",
  ] as const) {
    expect(build(kind, sampleRecap, 1, 10)).toEqual(build(kind, sampleRecap, 1, 70));
  }
  expect(build("closing", sampleRecap, 1, 10)).not.toEqual(build("closing", sampleRecap, 1, 25));
});

test("first-day: the flag carries the date and the weekday, the sign the title", () => {
  const model = firstDayModel(sampleRecap);
  if (!model) throw new Error("the sample has a first day");
  const all = build("first-day", sampleRecap);
  expect(printed(boxes(all, "flag"))).toEqual(expect.arrayContaining([model.date, model.weekday]));
  expect(printed(all)).toContain("First square");
  expect(boxes(all, "first-square")).toHaveLength(1);
});

test("first-day: the sprout grows on the way in and the flag is raised with it", () => {
  const tall = (progress: number) =>
    Math.max(
      0,
      ...boxes(build("first-day", sampleRecap, progress), "sprout").map((b) => b.at[2] + b.size[2]),
    );
  expect(tall(0.3)).toBeLessThan(tall(1));
  expect(boxes(build("first-day", sampleRecap, 0), "flag")).toHaveLength(0);
  expect(boxes(build("first-day", sampleRecap, 1), "flag")).toHaveLength(1);
});

test("first-day: a year with no contributions has no flag and no date, and says so", () => {
  const all = build("first-day", emptyRecap);
  expect(firstDayModel(emptyRecap)).toBeNull();
  expect(boxes(all, "flag")).toHaveLength(0);
  expect(boxes(all, "sprout")).toHaveLength(0);
  expect(printed(all).join(" ")).toContain("A blank graph: no contributions this year");
});

const withPrivate = (privateCount: RecapData["contributions"]["privateCount"]): RecapData => ({
  ...sampleRecap,
  contributions: { ...sampleRecap.contributions, privateCount },
});

test("private: the vault carries the count, the sign the model's phrase, and nothing is named", () => {
  const all = build("private", sampleRecap);
  expect(printed(boxes(all, "vault"))).toContain("210");
  expect(printed(all).join(" ")).toContain("private contributions, counted");
  const text = printed(all).join(" ");
  for (const repo of sampleRecap.repositories.top) {
    for (const part of repo.nameWithOwner.split("/")) expect(text).not.toContain(part);
  }
});

test("private: an estimated count says about", () => {
  const all = build("private", withPrivate({ status: "ok", value: 1500, estimated: true }));
  expect(printed(boxes(all, "vault"))).toContain("about 1,500");
});

test("private: none and unavailable print their own words and no figure, never a zero", () => {
  const none = printed(build("private", withPrivate({ status: "ok", value: 0, estimated: false })));
  expect(none.join(" ")).toContain("Nothing private this year");
  const unread = printed(
    build("private", withPrivate({ status: "unavailable", reason: "not granted" })),
  );
  expect(unread.join(" ")).toContain("Private contributions couldn't be read");
  for (const text of [...none, ...unread]) expect(text).not.toMatch(/\d/);
});

test("private: the count rises as the vault lands and never reads zero", () => {
  for (const progress of [0.1, 0.4, 0.8]) {
    const texts = printed(boxes(build("private", sampleRecap, progress), "vault"));
    expect(texts).not.toContain("0");
    expect(texts).not.toContain("210");
  }
  expect(boxes(build("private", sampleRecap, 0), "vault")).toHaveLength(0);
});

test("busiest: the lighthouse's base carries the count, the sign the day", () => {
  const model = busiestModel(sampleRecap);
  if (!model) throw new Error("the sample has a busiest day");
  const all = build("busiest", sampleRecap);
  const base = printed(boxes(all, "lighthouse-base"));
  expect(base).toContain(formatCount(model.count));
  expect(base).toContain("contributions");
  const text = printed(all);
  expect(text).toContain(model.headline);
  expect(text).toContain(`${model.weekday}, ${model.date}`);
});

test("busiest: one contribution is said in the singular", () => {
  const one: RecapData = {
    ...sampleRecap,
    contributions: {
      ...sampleRecap.contributions,
      busiestDay: { date: "2026-03-04", count: 1 },
    },
  };
  expect(printed(boxes(build("busiest", one), "lighthouse-base"))).toContain("contribution");
});

test("busiest: the tower goes up on the way in, the count rises with it and never reads zero", () => {
  const model = busiestModel(sampleRecap);
  expect(boxes(build("busiest", sampleRecap, 0), "lighthouse")).toHaveLength(0);
  const half = boxes(build("busiest", sampleRecap, 0.5), "lighthouse").length;
  expect(half).toBeLessThan(boxes(build("busiest", sampleRecap, 1), "lighthouse").length);
  for (const progress of [0.1, 0.5, 0.9]) {
    const base = printed(boxes(build("busiest", sampleRecap, progress), "lighthouse-base"));
    expect(base).not.toContain("0");
    expect(base).not.toContain(formatCount(model?.count ?? 0));
  }
});

test("busiest: the lamp's beam turns, and is back where it was after 60 frames", () => {
  const beam = (frame: number) => boxes(build("busiest", sampleRecap, 1, frame), "beam")[0]?.yaw;
  expect(beam(10)).not.toBe(beam(25));
  expect(beam(70)).toBeCloseTo(beam(10) ?? 0);
});
