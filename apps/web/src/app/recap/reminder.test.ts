import { describe, expect, test } from "bun:test";
import { PRIVATE_NAMES_REMINDER, showReminder } from "./reminder";

describe("private names reminder", () => {
  test("shows only when the files include a private name", () => {
    expect(showReminder(true)).toBe(true);
    expect(showReminder(false)).toBe(false);
  });

  test("uses the spec's sentence verbatim", () => {
    expect(PRIVATE_NAMES_REMINDER).toBe("These files include your private repository names.");
  });
});
