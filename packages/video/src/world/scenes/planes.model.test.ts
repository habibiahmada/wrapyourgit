import { expect, test } from "bun:test";
import type { RecapData } from "@wyg/schema";
import { emptyRecap } from "../../fixtures/edge-recaps";
import { sampleRecap } from "../../fixtures/sample-recap";
import { MAX_PLANES, planesModel } from "./planes.model";

const withEng = (e: Partial<RecapData["engineering"]>): RecapData => ({
  ...sampleRecap,
  engineering: { ...sampleRecap.engineering, ...e },
});

test("planesModel: sample has 13 in flight and 51 landed, both capped at 12", () => {
  const m = planesModel(sampleRecap);
  expect(m.sent).toBe(64);
  expect(m.merged).toBe(51);
  expect(m.reviews).toBe(40);
  expect(m.inFlight).toBe(13);
  expect(m.drawnFlying).toBe(MAX_PLANES);
  expect(m.drawnLanded).toBe(MAX_PLANES);
  expect(m.empty).toBe(false);
  expect(m.rows).toEqual([
    { label: "pull requests sent", value: "64" },
    { label: "landed (merged)", value: "51" },
    { label: "reviews given", value: "40" },
  ]);
});

test("planesModel: small counts are drawn one for one", () => {
  const m = planesModel(
    withEng({ prsOpened: 5, prsMerged: { status: "ok", value: 3, estimated: false } }),
  );
  expect(m.inFlight).toBe(2);
  expect(m.drawnFlying).toBe(2);
  expect(m.drawnLanded).toBe(3);
});

test("planesModel: merged unavailable says so and lands nothing", () => {
  const m = planesModel(withEng({ prsMerged: { status: "unavailable", reason: "x" } }));
  expect(m.merged).toBeNull();
  expect(m.drawnLanded).toBe(0);
  expect(m.rows[1]).toEqual({ label: "merged: couldn't be read", value: null });
});

test("planesModel: estimated merged says about", () => {
  const m = planesModel(
    withEng({ prsMerged: { status: "ok", value: 1_011, estimated: true }, prsOpened: 1_204 }),
  );
  expect(m.rows[1]).toEqual({ label: "landed (merged)", value: "about 1,011" });
  expect(m.drawnFlying).toBe(MAX_PLANES);
});

test("planesModel: all zero is an empty runway", () => {
  const m = planesModel(emptyRecap);
  expect(m.empty).toBe(true);
  expect(m.drawnFlying).toBe(0);
  expect(m.drawnLanded).toBe(0);
  expect(m.rows[0]).toEqual({ label: "pull requests sent", value: "0" });
});

test("planesModel: singular wording", () => {
  const m = planesModel(
    withEng({ prsOpened: 1, prsMerged: { status: "ok", value: 1, estimated: false }, reviews: 1 }),
  );
  expect(m.rows[0]?.label).toBe("pull request sent");
  expect(m.rows[2]?.label).toBe("review given");
  expect(m.inFlight).toBe(0);
  expect(m.drawnLanded).toBe(1);
});

test("planesModel: more merged than opened never goes negative", () => {
  const m = planesModel(
    withEng({ prsOpened: 2, prsMerged: { status: "ok", value: 9, estimated: false } }),
  );
  expect(m.inFlight).toBe(0);
  expect(m.drawnFlying).toBe(0);
});

test("planesModel: merged unavailable claims nothing in flight and nothing parked (R6)", () => {
  const m = planesModel(withEng({ prsMerged: { status: "unavailable", reason: "x" } }));
  expect(m.inFlight).toBeNull();
  expect(m.drawnFlying).toBe(MAX_PLANES);
  expect(m.drawnLanded).toBe(0);
  expect(m.picture).toBe("64 paper planes sent; merged couldn't be read");
  expect(m.picture).not.toContain("parked");
  expect(m.picture).not.toContain("in the air");
});

test("planesModel: the picture's words when merged is known", () => {
  expect(planesModel(sampleRecap).picture).toBe(
    "12 paper planes in the air, 12 parked on the runway",
  );
  expect(planesModel(emptyRecap).picture).toBe(
    "No paper planes in the air, 0 parked on the runway",
  );
  const one = planesModel(
    withEng({ prsOpened: 1, prsMerged: { status: "unavailable", reason: "x" } }),
  );
  expect(one.picture).toBe("1 paper plane sent; merged couldn't be read");
});
