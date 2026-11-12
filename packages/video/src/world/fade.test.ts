import { expect, test } from "bun:test";
import {
  contributionsLabel,
  formatDay,
  reachedStop,
  shortDay,
  WEEKDAYS,
  weekdayName,
} from "./fade";

test("formatDay: month and day without the host's locale", () => {
  expect(formatDay("2026-01-03")).toBe("January 3");
  expect(formatDay("2026-12-31")).toBe("December 31");
});

test("reachedStop: a stop counts once its rest frame is reached, in either seek direction", () => {
  const stopFrames = [0, 100, 250];
  expect(reachedStop(0, stopFrames)).toBe(0);
  expect(reachedStop(99, stopFrames)).toBe(0); // the frame just before arrival
  expect(reachedStop(100, stopFrames)).toBe(1); // arrival
  expect(reachedStop(180, stopFrames)).toBe(1); // hold
  expect(reachedStop(249, stopFrames)).toBe(1);
  expect(reachedStop(250, stopFrames)).toBe(2);
  // Same answer whichever order the frames are visited in.
  const forward = [99, 100, 249, 250].map((f) => reachedStop(f, stopFrames));
  const backward = [250, 249, 100, 99].map((f) => reachedStop(f, stopFrames)).reverse();
  expect(backward).toEqual(forward);
});

test("contributionsLabel uses the singular for exactly one", () => {
  expect(contributionsLabel(1, "1")).toBe("1 contribution");
  expect(contributionsLabel(0, "0")).toBe("0 contributions");
  expect(contributionsLabel(1234, "1,234")).toBe("1,234 contributions");
});

test("shortDay and weekdayName: fixed names, read in UTC", () => {
  expect(shortDay("2026-01-03")).toBe("Jan 3");
  expect(shortDay("2026-11-09")).toBe("Nov 9");
  expect(shortDay("2026-09-30")).toBe("Sep 30");
  expect(weekdayName("2026-01-03")).toBe("Saturday");
  expect(weekdayName("2026-11-09")).toBe("Monday");
  expect(WEEKDAYS[0]).toBe("Sunday");
});
