import { expect, test } from "bun:test";
import { withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../../../fixtures/edge-recaps";
import { sampleRecap } from "../../../fixtures/sample-recap";
import { formatCount } from "../../../theme";
import { buildCity } from "../../city";
import { ARCHETYPE_NONE, archetypeModel } from "../../scenes/archetype.model";
import { busiestModel } from "../../scenes/busiest.model";
import { cityModel } from "../../scenes/city.model";
import { closingModel } from "../../scenes/closing.model";
import { firstDayModel } from "../../scenes/firstDay.model";
import { gardenModel } from "../../scenes/garden.model";
import { planesModel } from "../../scenes/planes.model";
import { commitsText, projectsModel } from "../../scenes/projects.model";
import { rhythmModel } from "../../scenes/rhythm.model";
import { seesawModel } from "../../scenes/seesaw.model";
import { countText, skyModel } from "../../scenes/sky.model";
import type { StopKind } from "../../stops";
import type { Box, Solid } from "../prims";
import { rideStops } from "../stops";
import { archetype, archetypeFigures } from "./archetype";
import { firstWeeks } from "./firstDay";
import { STATIONS } from "./index";
import { clip, flow, stationContext } from "./kit";
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
    "archetype",
    "busiest",
    "city",
    "closing",
    "community",
    "engineering",
    "first-day",
    "hello",
    "languages",
    "private",
    "projects",
    "rhythm",
    "versus",
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
  // The billboard may break a long line over rows, and prints each row on both of its faces.
  const rows = (lines: string[]) => [...new Set(lines)].join(" ");
  expect(rows(text)).toContain(model.headline);
  expect(text).toContain(formatCount(model.total));
  const running: RecapData = {
    ...sampleRecap,
    meta: { ...sampleRecap.meta, isFinal: false, periodEnd: "2026-11-09" },
  };
  expect(rows(printed(build("city", running)))).toContain(cityModel(running).legend ?? "");
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
    "rhythm",
    "languages",
    "projects",
    "community",
    "engineering",
    "archetype",
    "versus",
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

test("first-day: the wall shows the year's first weeks: empty before the first day, that day lit, the rest dim", () => {
  const cells = firstWeeks(sampleRecap);
  const first = cells.filter((cell) => cell.state === "first");
  expect(first).toHaveLength(1);
  // The sample's first contribution is on its first calendar day with a count: every day before
  // it is empty and none after it is claimed.
  const days = sampleRecap.contributions.calendar;
  const index = days.findIndex((day) => day.count > 0);
  const offset = new Date(`${days[0]?.date}T00:00:00Z`).getUTCDay();
  expect(first[0]).toMatchObject({
    col: Math.floor((index + offset) / 7),
    row: (index + offset) % 7,
  });
  expect(cells.filter((cell) => cell.state === "empty")).toHaveLength(index);
  expect(
    cells.every((cell) => cell.col >= 0 && cell.col < 12 && cell.row >= 0 && cell.row < 7),
  ).toBe(true);
  // On the wall the lit cell is the only green one, and it lights as the train comes to rest.
  const green = (progress: number) =>
    (boxes(build("first-day", sampleRecap, progress), "graph-wall")[0]?.decals ?? []).filter(
      (d) => d.fill === "#39d353" && d.rect[3] - d.rect[1] > 0.05,
    ).length;
  expect(green(0.5)).toBe(0);
  expect(green(1)).toBe(2);
  // The flag is raised with the build.
  expect(boxes(build("first-day", sampleRecap, 0), "flag")).toHaveLength(0);
  expect(boxes(build("first-day", sampleRecap, 1), "flag")).toHaveLength(1);
});

test("first-day: a first contribution late in the year is shown from four weeks before it", () => {
  const late: RecapData = {
    ...sampleRecap,
    contributions: {
      ...sampleRecap.contributions,
      calendar: sampleRecap.contributions.calendar.map((day, i) => ({
        ...day,
        count: i < 200 ? 0 : day.count || 1,
      })),
    },
  };
  const cells = firstWeeks(late);
  const first = cells.find((cell) => cell.state === "first");
  expect(first?.col).toBe(4);
  expect(cells.filter((cell) => cell.col < 4).every((cell) => cell.state === "empty")).toBe(true);
});

test("first-day: a year with no contributions has a wall of empty days, no flag and no date, and says so", () => {
  const all = build("first-day", emptyRecap);
  expect(firstDayModel(emptyRecap)).toBeNull();
  expect(boxes(all, "flag")).toHaveLength(0);
  expect(boxes(all, "belt-load")).toHaveLength(0);
  expect(firstWeeks(emptyRecap).every((cell) => cell.state === "empty")).toBe(true);
  expect(printed(all).join(" ")).toContain("A blank graph: no contributions this year");
});

test("belt: loads ride from one shed to the other once the stop is whole, and the loop closes", () => {
  const loads = (progress: number, frame: number) =>
    boxes(build("first-day", sampleRecap, progress, frame), "belt-load").map(
      (b) => b.at[0] + b.size[0] / 2,
    );
  expect(loads(1, 0)).toHaveLength(6);
  // They travel one way, a good way, and are back in place after 60 frames.
  loads(1, 5).forEach((x, i) => {
    expect(x).toBeGreaterThan(loads(1, 0)[i] ?? 0);
  });
  const sorted = (frame: number) => loads(1, frame).sort((x, y) => x - y);
  sorted(60).forEach((x, i) => {
    expect(x).toBeCloseTo(sorted(0)[i] ?? 0);
  });
  // None before the stop has begun to build, and none travelling until it is whole.
  expect(loads(0.3, 20)).toHaveLength(0);
  expect(loads(0.9, 20)).toEqual(loads(0.9, 0));
  // The busiest day's belt carries a load for each contribution of that day, up to ten.
  const day = busiestModel(sampleRecap);
  expect(boxes(build("busiest", sampleRecap), "belt-load")).toHaveLength(
    Math.min(10, day?.count ?? 0),
  );
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

test("busiest: the base carries the count, the sign the day, the calendar its month and number", () => {
  const model = busiestModel(sampleRecap);
  if (!model) throw new Error("the sample has a busiest day");
  const all = build("busiest", sampleRecap);
  const base = printed(boxes(all, "record-base"));
  expect(base).toContain(formatCount(model.count));
  expect(base).toContain("contributions");
  const text = printed(all);
  expect(text).toContain(model.headline);
  expect(text).toContain(`${model.weekday}, ${model.date}`);
  // The page says the same day as the sign: its month in capitals, its number large.
  const [month = "", day = ""] = model.date.split(" ");
  const page = printed(boxes(all, "calendar"));
  expect(page).toContain(month.toUpperCase());
  expect(page).toContain(day);
});

test("busiest: one contribution is said in the singular", () => {
  const one: RecapData = {
    ...sampleRecap,
    contributions: {
      ...sampleRecap.contributions,
      busiestDay: { date: "2026-03-04", count: 1 },
    },
  };
  expect(printed(boxes(build("busiest", one), "record-base"))).toContain("contribution");
});

test("busiest: the tower goes up on the way in, the count rises with it and never reads zero", () => {
  const model = busiestModel(sampleRecap);
  expect(boxes(build("busiest", sampleRecap, 0), "record-tower")).toHaveLength(0);
  const half = boxes(build("busiest", sampleRecap, 0.5), "record-tower").length;
  expect(half).toBeLessThan(boxes(build("busiest", sampleRecap, 1), "record-tower").length);
  for (const progress of [0.1, 0.5, 0.9]) {
    const base = printed(boxes(build("busiest", sampleRecap, progress), "record-base"));
    expect(base).not.toContain("0");
    expect(base).not.toContain(formatCount(model?.count ?? 0));
  }
});

test("busiest: the plate on the tower turns about the tower, and is back after 60 frames", () => {
  const plate = (frame: number) => boxes(build("busiest", sampleRecap, 1, frame), "medal")[0];
  expect(plate(10)?.yaw).not.toBe(plate(25)?.yaw);
  expect(plate(70)?.yaw).toBeCloseTo(plate(10)?.yaw ?? 0);
  // It stands over the tower's top tier: same middle on the ground, and above it.
  const tiers = boxes(build("busiest", sampleRecap, 1, 10), "record-tower");
  const highest = tiers.reduce((a, b) => (b.size[0] > 0.5 && b.at[2] > a.at[2] ? b : a));
  const medal = plate(10);
  if (!medal) throw new Error("no plate");
  expect(medal.at[2]).toBeGreaterThan(highest.at[2] + highest.size[2]);
  expect(printed([medal])).toContain("#1");
});

test("rhythm: seven wagons, Sunday to Saturday, each with its day and its count", () => {
  const model = rhythmModel(sampleRecap);
  const wagons = boxes(build("rhythm", sampleRecap), "wagon");
  expect(wagons).toHaveLength(7);
  wagons.forEach((wagon, i) => {
    const car = model.cars[i];
    expect(printed([wagon])).toEqual(
      expect.arrayContaining([car?.day ?? "", formatCount(car?.count ?? 0)]),
    );
  });
  // The sign may break the title over two rows.
  expect(printed(build("rhythm", sampleRecap)).join(" ")).toContain(model.title);
});

test("rhythm: cargo is as tall as the weekday's share of the busiest, and a day with nothing has none", () => {
  const quiet: RecapData = {
    ...sampleRecap,
    contributions: { ...sampleRecap.contributions, weekday: [0, 220, 240, 230, 210, 190, 104] },
  };
  const model = rhythmModel(quiet);
  const cargo = boxes(build("rhythm", quiet), "cargo");
  // Sunday has nothing to carry.
  expect(cargo).toHaveLength(6);
  const tallest = Math.max(...cargo.map((box) => box.size[2]));
  const fills = model.cars.filter((car) => car.count > 0).map((car) => car.fill);
  cargo.forEach((box, i) => {
    expect(box.size[2] / tallest).toBeCloseTo(fills[i] ?? 0);
  });
});

test("rhythm: a narrow frame stands four wagons behind and three in front; a wide one keeps a row", () => {
  const city = buildCity(sampleRecap);
  const stop = rideStops(sampleRecap, city).find((x) => x.kind === "rhythm");
  if (!stop) throw new Error("no stop");
  const station = STATIONS.rhythm as NonNullable<typeof STATIONS.rhythm>;
  const rows = (layout: "portrait" | "compact" | "landscape") =>
    new Set(
      boxes(station(stationContext(sampleRecap, city, stop, 1, 0, 0, layout)), "wagon").map((b) =>
        b.at[2].toFixed(2),
      ),
    ).size;
  expect(rows("landscape")).toBe(1);
  expect(rows("portrait")).toBe(2);
  expect(rows("compact")).toBe(2);
});

test("rhythm: counts rise as the wagons land, and a year with nothing says so", () => {
  const model = rhythmModel(sampleRecap);
  const top = formatCount(model.busiest?.count ?? 0);
  expect(boxes(build("rhythm", sampleRecap, 0), "wagon")).toHaveLength(0);
  expect(printed(build("rhythm", sampleRecap, 0.6))).not.toContain(top);
  const none = rhythmModel(emptyRecap);
  const empty = build("rhythm", emptyRecap);
  expect(boxes(empty, "wagon")).toHaveLength(7);
  expect(boxes(empty, "cargo")).toHaveLength(0);
  expect(printed(empty).join(" ")).toContain(none.caption);
});

const withCommunity = (community: Partial<RecapData["community"]>): RecapData => ({
  ...sampleRecap,
  community: { ...sampleRecap.community, ...community },
});

test("community: the observatory carries the stars, the sign says what they are and the forks", () => {
  const model = skyModel(sampleRecap);
  const all = build("community", sampleRecap);
  expect(printed(boxes(all, "observatory"))).toContain(countText(model.stars.value, false));
  const text = printed(all).join(" ");
  expect(text).toContain(model.stars.label);
  expect(text).toContain(`${countText(model.forks.value, false)} ${model.forks.label}`);
});

test("community: one small star per star earned, up to a sky that still reads", () => {
  expect(boxes(build("community", sampleRecap), "star")).toHaveLength(28);
  const few = withCommunity({ starsGained: { status: "ok", value: 5, estimated: false } });
  expect(boxes(build("community", few), "star")).toHaveLength(5);
});

test("community: no stars is said in words, with no figure on the observatory and no small stars", () => {
  const none = withCommunity({ starsGained: { status: "ok", value: 0, estimated: false } });
  const all = build("community", none);
  expect(printed(boxes(all, "observatory"))).toEqual([]);
  expect(boxes(all, "star")).toHaveLength(0);
  expect(printed(all).join(" ")).toContain("No stars this year");
});

test("community: a total is never passed off as this year's gain, and an estimate says about", () => {
  const totals = withCommunity({ starsGained: { status: "unavailable", reason: "no history" } });
  expect(printed(build("community", totals)).join(" ")).toContain("stars on your repositories");
  const rough = withCommunity({ starsGained: { status: "ok", value: 12_900, estimated: true } });
  expect(printed(boxes(build("community", rough), "observatory"))).toContain(
    countText(12_900, true),
  );
});

test("engineering: the board carries the model's three rows", () => {
  const model = planesModel(sampleRecap);
  const text = printed(boxes(build("engineering", sampleRecap), "pr-board"));
  for (const row of model.rows) {
    expect(text).toContain(row.label);
    if (row.value) expect(text).toContain(row.value);
  }
});

test("engineering: a wagon on the main line for each pull request merged, one on a branch for each open", () => {
  const model = planesModel(sampleRecap);
  const all = build("engineering", sampleRecap);
  const merged = boxes(all, "pr-merged");
  const open = boxes(all, "pr-open");
  expect(merged).toHaveLength(model.drawnLanded);
  expect(open).toHaveLength(model.drawnFlying);
  // The merged stand in one row along the main line; the open ones are askew, on the branches.
  const main = boxes(all, "main-line")[0] as Box;
  const across = main.at[1] + main.size[1] / 2;
  for (const wagon of merged) {
    expect(wagon.at[1] + wagon.size[1] / 2).toBeCloseTo(across);
    expect(wagon.yaw).toBe(main.yaw);
  }
  for (const wagon of open) expect(wagon.yaw).not.toBe(main.yaw);
  // Three branches come in to the main line. A wagon comes out of a shed and goes into one:
  // two on the main line, and on each branch a shed at its far end and a cabin before the main line.
  expect(boxes(all, "branch")).toHaveLength(3);
  expect(boxes(all, "shed")).toHaveLength(5);
  expect(boxes(all, "cabin")).toHaveLength(3);
  // The lines are there before anything is built: a junction from the first frame.
  const bare = build("engineering", sampleRecap, 0);
  expect(boxes(bare, "main-line")).toHaveLength(1);
  expect(boxes(bare, "branch")).toHaveLength(3);
  expect(boxes(bare, "pr-board")).toHaveLength(0);
});

test("engineering: a signal stands at each end of the board, and their lights change over", () => {
  const all = build("engineering", sampleRecap, 1, 10);
  const board = boxes(all, "pr-board")[0] as Box;
  const signals = boxes(all, "signal");
  expect(signals).toHaveLength(4);
  for (const signal of signals) {
    const mid = signal.at[0] + signal.size[0] / 2;
    expect(mid < board.at[0] || mid > board.at[0] + board.size[0]).toBe(true);
  }
  const lit = (frame: number) =>
    boxes(build("engineering", sampleRecap, 1, frame), "signal")
      .flatMap((b) => b.decals ?? [])
      .map((d) => d.fill)
      .join();
  expect(lit(10)).not.toBe(lit(40));
  expect(lit(70)).toBe(lit(10));
});

test("engineering: merged unknown puts no wagon on the main line and says so in words, with no figure", () => {
  const unknown: RecapData = {
    ...sampleRecap,
    engineering: {
      ...sampleRecap.engineering,
      prsMerged: { status: "unavailable", reason: "not counted" },
    },
  };
  const all = build("engineering", unknown);
  expect(boxes(all, "pr-merged")).toHaveLength(0);
  const text = printed(boxes(all, "pr-board"));
  expect(text).toContain("merged: couldn't be read");
  // Two rows have figures; the third is a sentence.
  expect(text.filter((line) => /^[\d,.k]+$/.test(line))).toHaveLength(2);
});

test("engineering: the wagons travel: out of one shed, along the line, into the other, and the loop closes", () => {
  const model = planesModel(sampleRecap);
  const main = boxes(build("engineering", sampleRecap), "main-line")[0] as Box;
  const mids = (frame: number, tag: string) =>
    boxes(build("engineering", sampleRecap, 1, frame), tag).map((b) => b.at[0] + b.size[0] / 2);
  // Every merged wagon moves the same way along the main line, and a good way: not a nudge.
  const start = mids(0, "pr-merged");
  const soon = mids(4, "pr-merged");
  start.forEach((x, i) => {
    expect((soon[i] ?? 0) - x).toBeGreaterThan(0.05);
  });
  // By half a loop one has gone into the far shed and come out of the near one.
  const half = mids(30, "pr-merged");
  expect(half.some((x, i) => x < (start[i] ?? 0))).toBe(true);
  // As many wagons on the line at every moment as there are pull requests merged, each inside
  // the stretch between the sheds; and after 60 frames the line is as it was.
  for (const frame of [0, 7, 15, 22, 31, 45, 59]) {
    const all = build("engineering", sampleRecap, 1, frame);
    expect(boxes(all, "pr-merged")).toHaveLength(model.drawnLanded);
    expect(boxes(all, "pr-open")).toHaveLength(model.drawnFlying);
    for (const box of [...boxes(all, "pr-merged"), ...boxes(all, "pr-merged-part")]) {
      expect(box.at[0]).toBeGreaterThanOrEqual(main.at[0] + 0.9 - 1e-6);
      expect(box.at[0] + box.size[0]).toBeLessThanOrEqual(main.at[0] + main.size[0] - 0.9 + 1e-6);
    }
  }
  const sorted = (frame: number, tag: string) => mids(frame, tag).sort((x, y) => x - y);
  sorted(60, "pr-merged").forEach((x, i) => {
    expect(x).toBeCloseTo(sorted(0, "pr-merged")[i] ?? 0);
  });
  // While it is still being built nothing travels: a wagon is set down where it will stand.
  expect(
    boxes(build("engineering", sampleRecap, 0.95, 20), "pr-merged").map((b) => b.at[0]),
  ).toEqual(boxes(build("engineering", sampleRecap, 0.95, 0), "pr-merged").map((b) => b.at[0]));
});

const WAGON = { long: 0.6, pitch: 0.68, travel: 2.1 };

test("flow: wagons are spaced evenly, wrap from one end to the other, and never crowd a short line", () => {
  // Twelve asked for on a line with room for five: five, never overlapping.
  expect(flow(12, 0, 3.5, 0, WAGON)).toHaveLength(5);
  expect(flow(0, 0, 3.5, 0, WAGON)).toHaveLength(0);
  // At the loop's start every wagon is whole; mid-loop one is in two parts, at the two ends.
  expect(flow(5, 0, 3.5, 0, WAGON).every((parts) => parts.length === 1 && parts[0]?.whole)).toBe(
    true,
  );
  const total = (loop: number) =>
    flow(5, 0, 3.5, loop, WAGON).reduce(
      (sum, parts) => sum + parts.reduce((n, p) => n + p.long, 0),
      0,
    );
  // Whatever the moment, the wagons on the line add up to five whole ones.
  for (const loop of [0, 0.13, 0.37, 0.5, 0.81]) expect(total(loop)).toBeCloseTo(5 * 0.6);
  // After a whole loop each wagon stands where another stood: the same line, wagon for wagon.
  const places = (loop: number) =>
    flow(5, 0, 3.5, loop, WAGON)
      .map((parts) => parts[0]?.mid ?? 0)
      .sort((x, y) => x - y);
  places(1).forEach((x, i) => {
    expect(x).toBeCloseTo(places(0)[i] ?? 0);
  });
});

test("engineering: the wagons on the branches travel too, and the figures rise as the board lands", () => {
  const where = (frame: number) =>
    boxes(build("engineering", sampleRecap, 1, frame), "pr-open").map((b) => b.pivot?.[0]);
  expect(where(10)).not.toEqual(where(25));
  expect(where(70)).toEqual(where(10));
  const sent = planesModel(sampleRecap).rows[0].value ?? "";
  expect(boxes(build("engineering", sampleRecap, 0), "pr-board")).toHaveLength(0);
  expect(printed(build("engineering", sampleRecap, 0.5))).not.toContain(sent);
  expect(printed(build("engineering", sampleRecap, 0.5))).not.toContain("0");
});

test("archetype: the picture is the station: Cell in costume with what floats round it, large on the stage", () => {
  const model = archetypeModel(sampleRecap);
  if (!model) throw new Error("the sample has an archetype");
  const all = build("archetype", sampleRecap, 1, 0);
  const figures = all.filter((solid) => solid.kind === "picture");
  expect(figures).toHaveLength(1);
  const figure = figures[0];
  if (figure?.kind !== "picture") throw new Error("no figure");
  // The first frame of the landing page's loop for this archetype.
  expect(figure.href).toContain(`art/skin-${model.id}/00.webp`);
  // It stands on the stage. Apart from its title board, which the next test places, nothing
  // rises anywhere near it: it reaches twice as high as any other box.
  const stage = boxes(all, "stage")[0];
  expect(figure.c[2]).toBeCloseTo((stage?.at[2] ?? 0) + (stage?.size[2] ?? 0));
  const boxTops = all.flatMap((solid) =>
    solid.kind === "box" && !["board", "board-post"].includes(solid.tag ?? "")
      ? [solid.at[2] + solid.size[2]]
      : [],
  );
  expect(figure.reach).toBeGreaterThan(5);
  expect(Math.max(...boxTops)).toBeLessThan((figure.reach ?? 0) / 2);
  // The block is wider than its stage: the picture itself tells the camera how far it reaches.
  expect(figure.spread).toBeGreaterThan((stage?.size[0] ?? 0) / 2);
});

test("archetype: the figure moves: its loop plays through every frame and repeats every 60", () => {
  const href = (frame: number) => {
    const figure = build("archetype", sampleRecap, 1, frame).find((s) => s.kind === "picture");
    return figure?.kind === "picture" ? figure.href : "";
  };
  const seen = new Set(Array.from({ length: 60 }, (_, frame) => href(frame)));
  expect(seen.size).toBe(30);
  expect(href(60)).toBe(href(0));
  expect(href(1)).toBe(href(0));
  expect(href(2)).not.toBe(href(0));
  // The canvas loads exactly the files the station can draw.
  const listed = archetypeFigures(sampleRecap);
  expect(listed).toHaveLength(30);
  for (const one of seen) expect(listed.some((file) => one.endsWith(file))).toBe(true);
  expect(archetypeFigures(emptyRecap)).toEqual(["art/cutout-cell-think.png"]);
});

test("archetype: the title board stands behind the picture, never between it and the rail", () => {
  const city = buildCity(sampleRecap);
  const stop = rideStops(sampleRecap, city).find((s) => s.kind === "archetype");
  if (!stop) throw new Error("no archetype stop");
  for (const layout of ["portrait", "compact", "landscape"] as const) {
    const ctx = stationContext(sampleRecap, city, stop, 1, 0, 0, layout);
    const all = archetype(ctx);
    const board = boxes(all, "board")[0];
    const figure = all.find((solid) => solid.kind === "picture");
    if (!board || figure?.kind !== "picture") throw new Error("no board or no figure");
    // A part is placed across the rail from the plaza's middle, and the rail is on `stop.side`.
    const across = board.at[1] + board.size[1] / 2 - (board.pivot?.[1] ?? 0);
    expect({ layout, behind: across * stop.side < 0 }).toEqual({ layout, behind: true });
    // Its foot is at the roofs where the frame is narrow; lower, beside the towers, where it is wide.
    const under = figure.c[2] + (figure.reach ?? 0) - board.at[2];
    const atRoofs = under < 1;
    expect({ layout, atRoofs }).toEqual({ layout, atRoofs: layout !== "landscape" });
  }
});

test("archetype: the board carries the intro and the title, and nothing else", () => {
  const model = archetypeModel(sampleRecap);
  if (!model) throw new Error("the sample has an archetype");
  const lines = [...new Set(printed(boxes(build("archetype", sampleRecap), "board")))];
  expect(lines).toEqual([model.intro, model.title]);
  // The reasons are not printed at this stop: the picture carries it.
  for (const reason of model.reasons)
    expect(printed(build("archetype", sampleRecap))).not.toContain(reason);
});

test("archetype: with no style to name the board says so, and Cell stands there thinking", () => {
  const all = build("archetype", emptyRecap);
  expect(archetypeModel(emptyRecap)).toBeNull();
  expect([...new Set(printed(boxes(all, "board")))].join(" ")).toContain(ARCHETYPE_NONE);
  const figures = all.filter((solid) => solid.kind === "picture");
  expect(figures).toHaveLength(1);
  expect(figures[0]?.kind === "picture" ? figures[0].href : "").toContain(
    "art/cutout-cell-think.png",
  );
});

test("archetype: the board's bulbs chase, the board is always there, and the figure steps on as the train pulls in", () => {
  const bulbs = (frame: number) =>
    (boxes(build("archetype", sampleRecap, 1, frame), "board")[0]?.decals ?? []).map((d) => d.fill);
  expect(bulbs(10)).not.toEqual(bulbs(25));
  expect(bulbs(70)).toEqual(bulbs(10));
  const before = build("archetype", sampleRecap, 0);
  expect(boxes(before, "board")).toHaveLength(1);
  expect(before.filter((solid) => solid.kind === "picture")).toHaveLength(0);
});

const withLastYear = (contributions: number): RecapData => {
  const prev = sampleRecap.previousYear;
  if (prev.status !== "ok") throw new Error("the sample has a last year");
  return {
    ...sampleRecap,
    previousYear: {
      ...prev,
      value: { ...prev.value, sameSpan: { ...prev.value.sameSpan, contributions } },
    },
  };
};
const noLastYear: RecapData = {
  ...sampleRecap,
  previousYear: { status: "unavailable", reason: "not fetched" },
};

test("versus: each weight carries its year and its exact value, the sign the change and the span", () => {
  const model = seesawModel(sampleRecap);
  if ("unavailable" in model) throw new Error("the sample has a last year");
  const all = build("versus", sampleRecap);
  const weights = boxes(all, "weight");
  expect(weights).toHaveLength(2);
  expect(printed(weights)).toEqual(
    expect.arrayContaining([
      String(model.last.year),
      formatCount(model.last.value),
      String(model.current.year),
      formatCount(model.current.value),
    ]),
  );
  const sign = printed(all).join(" ");
  expect(printed(all)).toContain("Contributions, year over year");
  // One row each, so the sign stays lower than the beam.
  expect(printed(all)).toContain(model.span);
  expect(sign).toContain(model.change);
  for (const piece of model.span.split(" ")) expect(sign).toContain(piece);
});

test("versus: the heavier year's pan hangs lower and its weight is taller", () => {
  const pans = (data: RecapData) => {
    const all = build("versus", data);
    const model = seesawModel(data);
    if ("unavailable" in model) throw new Error("has a last year");
    const of = (year: number) => {
      const weight = boxes(all, "weight").find((b) =>
        b.texts?.some((t) => t.text === String(year)),
      );
      if (!weight) throw new Error("no weight");
      return { foot: weight.at[2], tall: weight.size[2] };
    };
    return { last: of(model.last.year), current: of(model.current.year) };
  };
  const up = pans(withLastYear(400));
  expect(up.current.foot).toBeLessThan(up.last.foot);
  expect(up.current.tall).toBeGreaterThan(up.last.tall);
  const down = pans(withLastYear(5000));
  expect(down.current.foot).toBeGreaterThan(down.last.foot);
  expect(down.current.tall).toBeLessThan(down.last.tall);
  const level = pans(withLastYear(sampleRecap.contributions.total));
  expect(level.current.foot).toBeCloseTo(level.last.foot);
});

test("versus: last year unread is a covered weight with no figure, never a zero", () => {
  const all = build("versus", noLastYear);
  const model = seesawModel(noLastYear);
  expect(boxes(all, "weight")).toHaveLength(1);
  expect(boxes(all, "covered")).toHaveLength(1);
  expect(printed(boxes(all, "covered"))).toEqual([]);
  expect(printed(boxes(all, "weight"))).toEqual(
    expect.arrayContaining([String(model.current.year), formatCount(model.current.value)]),
  );
  // The sign may break the line over two rows, and prints each row on both of its faces.
  expect([...new Set(printed(all))].join(" ")).toContain("Last year couldn't be read from GitHub");
  expect(printed(all)).not.toContain("0");
  // Nothing to weigh against: the beam stays level.
  const beam = boxes(all, "beam").map((b) => b.at[2]);
  expect(Math.max(...beam) - Math.min(...beam)).toBeCloseTo(0);
});

test("versus: the weights are lowered on as the train comes in, and the figures are exact at rest", () => {
  expect(boxes(build("versus", sampleRecap, 0), "weight")).toHaveLength(0);
  const model = seesawModel(sampleRecap);
  const midway = printed(boxes(build("versus", sampleRecap, 0.5), "weight"));
  expect(midway).not.toContain(formatCount(model.current.value));
  expect(midway).not.toContain("0");
});
