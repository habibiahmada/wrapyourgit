import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { languageIcon, languageInitials } from "./languages";

describe("languageIcon", () => {
  test("maps GitHub names to files that exist", () => {
    for (const name of ["TypeScript", "C++", "C#", "Shell", "Jupyter Notebook", "HCL"]) {
      const icon = languageIcon(name);
      expect(icon).not.toBeNull();
      expect(existsSync(join(import.meta.dir, "../public", icon ?? ""))).toBe(true);
    }
  });

  test("returns null for languages without a logo", () => {
    expect(languageIcon("Brainfuck")).toBeNull();
  });
});

describe("languageInitials", () => {
  test("uses the first letters of each word, or the first two letters", () => {
    expect(languageInitials("Jupyter Notebook")).toBe("JN");
    expect(languageInitials("Go")).toBe("Go");
    expect(languageInitials("Mojo")).toBe("Mo");
  });
});
