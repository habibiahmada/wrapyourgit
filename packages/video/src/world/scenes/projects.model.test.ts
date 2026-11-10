import { expect, test } from "bun:test";
import { PRIVATE_REPO_NAME, type RecapData } from "@wyg/schema";
import { busyRecap, emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { labelWidth } from "./fit";
import { commitsText, projectsModel, truncateLabel } from "./projects.model";

const trailmix = sampleRecap.repositories.top[0];
if (!trailmix) throw new Error("fixture needs a first repo");

const withRepos = (
  commits: number[],
  created = sampleRecap.repositories.createdThisYear,
): RecapData => ({
  ...sampleRecap,
  repositories: {
    ...sampleRecap.repositories,
    createdThisYear: created,
    top: commits.map((c, i) => ({ ...trailmix, nameWithOwner: `o/repo-${i}`, commits: c })),
  },
});

test("projectsModel: sample takes four stacks, unit 50, ceil crates, names as given", () => {
  const m = projectsModel(sampleRecap);
  expect(m.unit).toBe(50);
  expect(m.created).toBe(6);
  expect(m.stacks.map((s) => [s.label, s.commits, s.crates])).toEqual([
    ["trailmix", 312, 7],
    ["client-portal", 188, 4],
    ["dotfiles", 96, 2],
    ["design-tokens", 41, 1],
  ]);
  expect(m.empty).toBe(false);
  expect(m.title).toBe("Where your commits went");
  expect(m.subtitle).toBe("6 new repositories this year");
  expect(m.legend).toBe("one crate ≈ 50 commits");
});

test("projectsModel: unit is the smallest step that keeps the tallest stack at 8 crates or fewer", () => {
  expect(projectsModel(withRepos([80])).unit).toBe(10);
  expect(projectsModel(withRepos([81])).unit).toBe(25); // ceil(81/10) = 9
  expect(projectsModel(withRepos([200])).unit).toBe(25);
  expect(projectsModel(withRepos([201])).unit).toBe(50);
  expect(projectsModel(withRepos([400])).unit).toBe(50);
  expect(projectsModel(withRepos([401])).unit).toBe(100);
  expect(projectsModel(withRepos([800])).unit).toBe(100);
  expect(projectsModel(withRepos([801])).unit).toBe(250);
  expect(projectsModel(withRepos([2000])).unit).toBe(250);
  expect(projectsModel(withRepos([2001])).unit).toBe(500);
  expect(projectsModel(withRepos([4000])).unit).toBe(500);
});

test("projectsModel: past 8 crates at the largest unit the unit stays 500 and the stack grows", () => {
  const m = projectsModel(busyRecap);
  expect(m.unit).toBe(500);
  expect(m.stacks[0]?.crates).toBe(10);
});

test("projectsModel: crates round up, so any commits make at least one", () => {
  const m = projectsModel(withRepos([1, 10, 11]));
  expect(m.unit).toBe(10);
  expect(m.stacks.map((s) => s.crates)).toEqual([2, 1, 1]);
});

test("projectsModel: skips repositories without commits and keeps the four largest", () => {
  const m = projectsModel(withRepos([0, 30, 20, 0, 10, 5, 4]));
  expect(m.stacks.map((s) => s.commits)).toEqual([30, 20, 10, 5]);
});

test("projectsModel: the headline is fixed; the subtitle counts new repositories", () => {
  expect(projectsModel(withRepos([10], 1)).subtitle).toBe("1 new repository this year");
  expect(projectsModel(withRepos([10], 0)).subtitle).toBeNull();
  expect(projectsModel(withRepos([10], 2)).subtitle).toBe("2 new repositories this year");
  expect(projectsModel(withRepos([10], 1234)).subtitle).toBe("1,234 new repositories this year");
  for (const c of [0, 1, 5]) {
    expect(projectsModel(withRepos([10], c)).title).toBe("Where your commits went");
  }
});

test("projectsModel: stacks are the four largest by commits, whatever the input order", () => {
  const m = projectsModel(withRepos([5, 40, 0, 20, 30, 10]));
  expect(m.stacks.map((s) => s.commits)).toEqual([40, 30, 20, 10]);
});

test("projectsModel: no repository commits is an empty shelf with its own copy", () => {
  for (const data of [emptyRecap, withRepos([0, 0])]) {
    const m = projectsModel(data);
    expect(m.stacks).toEqual([]);
    expect(m.empty).toBe(true);
    expect(m.title).toBe("No repository commits yet");
    expect(m.subtitle).toBeNull();
    expect(m.legend).toBeNull();
  }
});

test("commitsText is singular for one", () => {
  expect(commitsText(1)).toBe("1 commit");
  expect(commitsText(312)).toBe("312 commits");
  expect(commitsText(4812)).toBe("4,812 commits");
});

test("truncateLabel leaves a name that fits at the given size alone", () => {
  const w = labelWidth("Private repository", 15, 800);
  expect(truncateLabel("Private repository", 15, 800, w + 1)).toBe("Private repository");
});

test("truncateLabel keeps text that fits and ends a longer one with an ellipsis that fits", () => {
  expect(truncateLabel("trailmix", 30, 800, 400)).toBe("trailmix");
  const long = "an-extremely-long-repository-name-for-testing";
  const out = truncateLabel(long, 30, 800, 200);
  expect(out.endsWith("…")).toBe(true);
  expect(out.length).toBeLessThan(long.length);
  expect(out.length).toBeGreaterThan(1);
  expect(long.startsWith(out.slice(0, -1))).toBe(true);
});

test("projectsModel: two or more unnamed private stacks are numbered in shelf order", () => {
  const data = withRepos([300, 200, 100, 50]);
  data.repositories.top = data.repositories.top.map((r, i) =>
    i === 0 ? r : { ...r, isPrivate: true, nameWithOwner: PRIVATE_REPO_NAME },
  );
  expect(projectsModel(data).stacks.map((s) => s.label)).toEqual([
    "repo-0",
    "Private repository 1",
    "Private repository 2",
    "Private repository 3",
  ]);
});

test("projectsModel: a single unnamed private stack keeps its plain label", () => {
  const data = withRepos([300, 200]);
  data.repositories.top = data.repositories.top.map((r, i) =>
    i === 1 ? { ...r, isPrivate: true, nameWithOwner: PRIVATE_REPO_NAME } : r,
  );
  expect(projectsModel(data).stacks.map((s) => s.label)).toEqual(["repo-0", "Private repository"]);
});
