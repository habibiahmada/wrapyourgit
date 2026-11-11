import { expect, test } from "bun:test";
import { withoutPrivateNames } from "@wyg/analytics";
import type { RecapData } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../../../fixtures/edge-recaps";
import { sampleRecap } from "../../../fixtures/sample-recap";
import { formatCount } from "../../../theme";
import { buildCity } from "../../city";
import { cityModel } from "../../scenes/city.model";
import { closingModel } from "../../scenes/closing.model";
import { gardenModel } from "../../scenes/garden.model";
import { commitsText, projectsModel } from "../../scenes/projects.model";
import type { StopKind } from "../../stops";
import type { Box, Solid } from "../prims";
import { rideStops } from "../stops";
import { STATIONS } from "./index";
import { clip, stationContext } from "./kit";

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

test("the five stations of this phase exist", () => {
  expect(Object.keys(STATIONS).sort()).toEqual([
    "city",
    "closing",
    "hello",
    "languages",
    "projects",
  ]);
});

test("languages: every tree's label and name are printed, in the model's words", () => {
  const model = gardenModel(sampleRecap);
  const text = printed(build("languages", sampleRecap));
  for (const tree of model.trees) {
    expect(text).toContain(tree.label);
    expect(text).toContain(clip(tree.name, 12));
  }
  expect(text).toContain("Top languages");
  expect(text).toContain(model.title);
  if (model.otherNote) expect(text).toContain(model.otherNote);
});

test("languages: a block is as tall as its share says, at rest", () => {
  const model = gardenModel(sampleRecap);
  const blocks = boxes(build("languages", sampleRecap), "language");
  expect(blocks).toHaveLength(model.trees.length);
  const first = blocks.find((b) => b.texts?.some((t) => t.text === model.trees[0]?.label));
  expect(first?.size[2]).toBeCloseTo(3.0 + (model.trees[0]?.share ?? 0) * 4.6);
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

test("languages: five languages fit on the plaza without touching", () => {
  const blocks = boxes(build("languages", busyRecap), "language");
  const spans = blocks
    .map((b) => [b.at[0], b.at[0] + b.size[0]] as const)
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++)
    expect(spans[i]?.[0] ?? 0).toBeGreaterThanOrEqual(spans[i - 1]?.[1] ?? 0);
  const width = (spans.at(-1)?.[1] ?? 0) - (spans[0]?.[0] ?? 0);
  expect(width).toBeLessThanOrEqual(9.6);
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
    expect(rest).toContain(clip(stack.label, 16));
    expect(rest).toContain(commitsText(stack.commits));
  }
  expect(rest).toContain("Repositories");
  expect(rest).toContain(model.title);
  const first = model.stacks[0];
  if (first)
    expect(printed(build("projects", sampleRecap, 0.3))).not.toContain(commitsText(first.commits));
});

test("projects: a tower has as many crates as the model says", () => {
  const model = projectsModel(sampleRecap);
  const crates = boxes(build("projects", sampleRecap), "crate");
  expect(crates).toHaveLength(model.stacks.reduce((n, s) => n + s.crates, 0));
});

test("projects: long names are cut, an empty shelf says so", () => {
  const labels = boxes(build("projects", busyRecap), "plaque").flatMap((b) =>
    (b.texts ?? []).map((t) => t.text),
  );
  for (const label of labels) expect(label.length).toBeLessThanOrEqual(16);
  const none = projectsModel(emptyRecap);
  const empty = build("projects", {
    ...emptyRecap,
    repositories: { ...emptyRecap.repositories, top: [] },
  });
  expect(boxes(empty, "crate")).toHaveLength(0);
  expect(printed(empty)).toContain(none.empty ? none.title : "No repository commits yet");
});

test("projects: no station names a repository the data hides", () => {
  const hidden = withoutPrivateNames(sampleRecap);
  const model = projectsModel(hidden);
  const text = boxes(build("projects", hidden), "plaque").flatMap((b) =>
    (b.texts ?? []).map((t) => t.text),
  );
  // A plaque prints on both of its faces, so every name appears twice.
  const names = [...new Set(text.filter((t) => !/commit/.test(t)))].sort();
  expect(names).toEqual(model.stacks.map((s) => clip(s.label, 16)).sort());
});

test("hello prints the year and the login, and the scope line when the recap is public", () => {
  const text = printed(build("hello", sampleRecap));
  expect(text).toContain("2026");
  expect(text).toContain(`@${sampleRecap.profile.login}`);
  const open = printed(
    build("hello", { ...sampleRecap, meta: { ...sampleRecap.meta, scope: "public" } }),
  );
  expect(open).toContain("Public GitHub activity only");
});

test("city prints the model's headline, the exact total and the legend of a year still running", () => {
  const model = cityModel(sampleRecap);
  const text = printed(build("city", sampleRecap));
  expect(text).toContain(model.headline);
  expect(text).toContain(formatCount(model.total));
  const running: RecapData = {
    ...sampleRecap,
    meta: { ...sampleRecap.meta, isFinal: false, periodEnd: "2026-11-09" },
  };
  expect(printed(build("city", running))).toContain(cityModel(running).legend ?? "");
});

test("city's billboard is only there for the overview", () => {
  expect(build("city", sampleRecap, 1, 10, 0)).toEqual([]);
  expect(build("city", sampleRecap, 1, 10, 1).length).toBeGreaterThan(0);
});

test("closing prints the date line, the year and every line of the model", () => {
  const model = closingModel(sampleRecap);
  const text = printed(build("closing", sampleRecap));
  expect(text).toContain(model.date);
  expect(text).toContain(String(model.year));
  for (const line of model.lines) expect(text).toContain(line);
});

test("a station at rest is the same 60 frames later, and still moving in between", () => {
  for (const kind of ["hello", "city", "languages", "projects", "closing"] as const) {
    expect(build(kind, sampleRecap, 1, 10)).toEqual(build(kind, sampleRecap, 1, 70));
  }
  expect(build("closing", sampleRecap, 1, 10)).not.toEqual(build("closing", sampleRecap, 1, 25));
});
