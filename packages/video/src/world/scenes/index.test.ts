import { expect, test } from "bun:test";
import { STOP_KINDS } from "../stops";
import { SCENES } from "./index";

test("SCENES has a scene for every stop kind", () => {
  for (const kind of STOP_KINDS) expect(typeof SCENES[kind]).toBe("function");
  expect(Object.keys(SCENES).sort()).toEqual([...STOP_KINDS].sort());
});
