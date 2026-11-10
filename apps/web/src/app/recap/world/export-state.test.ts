import { describe, expect, test } from "bun:test";
import { announcement, type ExportState, exportReducer, IDLE, percent } from "./export-state";

const rendering = (progress = 0): ExportState => ({ status: "rendering", job: "mp4", progress });

describe("exportReducer", () => {
  test("idle starts a job at 0%", () => {
    expect(exportReducer(IDLE, { type: "start", job: "zip" })).toEqual({
      status: "rendering",
      job: "zip",
      progress: 0,
    });
  });

  test("a second start while rendering is ignored: one render at a time", () => {
    const state = rendering(0.4);
    expect(exportReducer(state, { type: "start", job: "pdf" })).toBe(state);
  });

  test("a finished, failed or cancelled job can start again", () => {
    for (const state of [
      { status: "done", job: "mp4", file: "a.mp4" },
      { status: "error", job: "mp4" },
      { status: "cancelled", job: "mp4" },
    ] as ExportState[]) {
      expect(exportReducer(state, { type: "start", job: "mp4" }).status).toBe("rendering");
    }
  });

  test("progress is clamped to 0..1 and never goes back", () => {
    expect(exportReducer(rendering(0.2), { type: "progress", value: 1.7 })).toEqual(rendering(1));
    expect(exportReducer(rendering(0.5), { type: "progress", value: 0.3 })).toEqual(rendering(0.5));
    expect(exportReducer(rendering(0), { type: "progress", value: Number.NaN })).toEqual(
      rendering(0),
    );
  });

  test("progress, finish, fail and cancel only apply while rendering", () => {
    for (const action of [
      { type: "progress", value: 0.5 },
      { type: "finish", file: "a.mp4" },
      { type: "fail" },
      { type: "cancel" },
    ] as const) {
      expect(exportReducer(IDLE, action)).toBe(IDLE);
    }
  });

  test("rendering ends as done (with the file), error or cancelled, keeping the job", () => {
    expect(exportReducer(rendering(0.9), { type: "finish", file: "a.mp4" })).toEqual({
      status: "done",
      job: "mp4",
      file: "a.mp4",
    });
    expect(exportReducer(rendering(0.9), { type: "fail" })).toEqual({
      status: "error",
      job: "mp4",
    });
    expect(exportReducer(rendering(0.9), { type: "cancel" })).toEqual({
      status: "cancelled",
      job: "mp4",
    });
  });
});

test("percent rounds down so 100% only shows once the file is whole", () => {
  expect(percent(rendering(0.999))).toBe(99);
  expect(percent(rendering(1))).toBe(100);
  expect(percent(IDLE)).toBe(0);
});

describe("announcement", () => {
  test("rendering is announced in steps of 10%, not every percent", () => {
    expect(announcement(rendering(0.42))).toBe("Making your video: 40%");
    expect(announcement(rendering(0.49))).toBe("Making your video: 40%");
    expect(announcement({ status: "rendering", job: "zip", progress: 0 })).toBe(
      "Making your slides: 0%",
    );
    expect(announcement({ status: "rendering", job: "pdf", progress: 1 })).toBe(
      "Making your PDF: 100%",
    );
  });

  test("every end state says what happened in words, not only in color", () => {
    expect(announcement(IDLE)).toBe("");
    expect(announcement({ status: "done", job: "mp4", file: "a.mp4" })).toBe(
      "Saved a.mp4. Check your downloads.",
    );
    expect(announcement({ status: "error", job: "mp4" })).toBe(
      "The video couldn't be made in this browser. Try Chrome on a computer.",
    );
    expect(announcement({ status: "error", job: "pdf" })).toBe(
      "The PDF couldn't be made in this browser. Try Chrome on a computer.",
    );
    expect(announcement({ status: "cancelled", job: "zip" })).toBe("Cancelled. Nothing was saved.");
  });
});
