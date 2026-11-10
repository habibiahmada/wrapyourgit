import { expect, test } from "bun:test";
import { emptyRecap, provisionalRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { closingModel } from "./closing.model";

test("closingModel: a final year says Dec 31, was, the year and the headline numbers", () => {
  const m = closingModel(sampleRecap);
  expect(m.final).toBe(true);
  expect(m.date).toBe("Dec 31. That was your");
  expect(m.year).toBe(2026);
  expect(m.lines[0]).toBe(
    `${sampleRecap.contributions.total.toLocaleString("en-US")} contributions`,
  );
  expect(m.lines[1]).toBe(`${sampleRecap.contributions.activeDays} active days`);
  expect(m.lines[2]).toBe("Builder");
  expect(m.lines).toHaveLength(3);
});

test("closingModel: a provisional year names the last day and says so far", () => {
  const m = closingModel(provisionalRecap);
  expect(m.final).toBe(false);
  expect(m.date).toBe("Nov 9, so far. That's your");
});

test("closingModel: singular nouns for one", () => {
  const one = {
    ...sampleRecap,
    identity: { ...sampleRecap.identity, archetype: null },
    contributions: { ...sampleRecap.contributions, total: 1, activeDays: 1 },
  };
  expect(closingModel(one).lines).toEqual(["1 contribution", "1 active day"]);
});

test("closingModel: no archetype leaves its line out", () => {
  const none = { ...sampleRecap, identity: { ...sampleRecap.identity, archetype: null } };
  expect(closingModel(none).lines).toHaveLength(2);
});

test("closingModel: an empty year is still said honestly", () => {
  const m = closingModel(emptyRecap);
  expect(m.lines[0]).toBe("0 contributions");
  expect(m.lines[1]).toBe("0 active days");
});
