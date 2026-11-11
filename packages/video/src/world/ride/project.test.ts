import { expect, test } from "bun:test";
import { projector, projectPoint, type RideCamera } from "./project";

const cam: RideCamera = { pos: [0, -10, 0], look: [0, 0, 0], fov: 90 };
const frame = { width: 200, height: 100 };

test("the look point lands in the centre at its distance", () => {
  const p = projectPoint([0, 0, 0], cam, frame);
  expect(p?.[0]).toBeCloseTo(100);
  expect(p?.[1]).toBeCloseTo(50);
  expect(p?.[2]).toBeCloseTo(10);
});

test("x runs right and z runs up on screen", () => {
  expect(projectPoint([1, 0, 0], cam, frame)?.[0]).toBeCloseTo(105);
  expect(projectPoint([0, 0, 1], cam, frame)?.[1]).toBeCloseTo(45);
});

test("a point behind the near plane is null", () => {
  expect(projectPoint([0, -10.1, 0], cam, frame)).toBeNull();
});

test("the lens reports pixels per unit at depth 1 and the view's heading", () => {
  const p = projector(cam, frame);
  expect(p.focal).toBeCloseTo(50);
  expect(p.yaw).toBeCloseTo(Math.PI / 2);
});
