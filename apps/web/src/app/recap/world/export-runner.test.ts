import { describe, expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video";
import { type ExportEngineModule, exportRunner } from "./export-runner";
import type { ExportAction } from "./export-state";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (e: unknown) => void;
};
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const blob = (text: string) => new Blob([text]);

/** A fake renderer: each MP4 render waits on a deferred the test settles. */
function fakeEngine() {
  const renders: { done: Deferred<Blob>; signal: AbortSignal; onProgress: (p: number) => void }[] =
    [];
  const downloads: string[] = [];
  const engine: ExportEngineModule = {
    renderMp4: (_data, _format, { onProgress, signal }) => {
      const done = deferred<Blob>();
      renders.push({ done, signal, onProgress });
      return done.promise;
    },
    renderSlides: async (_data, { onProgress }) => {
      onProgress(1, 2);
      onProgress(2, 2);
      return [{ name: "a.png", blob: blob("png") }];
    },
    zipSlides: async () => blob("zip"),
    pdfSlides: async () => blob("pdf"),
    download: (_blob, name) => downloads.push(name),
  };
  return { engine, renders, downloads };
}

function setup() {
  const fake = fakeEngine();
  const actions: ExportAction[] = [];
  const warnings: unknown[] = [];
  // The panel hands the runner a ref; a test swaps `source.data` the way a server refresh does.
  const source = { data: sampleRecap };
  const runner = exportRunner(
    fake.engine,
    () => source.data,
    (a) => actions.push(a),
    (...w) => warnings.push(w),
  );
  return { ...fake, actions, warnings, runner, source };
}

const abortError = () => new DOMException("cancelled", "AbortError");

describe("exportRunner", () => {
  test("an MP4 reports progress, downloads under its export name and finishes", async () => {
    const { runner, renders, downloads, actions } = setup();
    const running = runner.run("mp4", "4x5");
    renders[0]?.onProgress(0.5);
    renders[0]?.done.resolve(blob("mp4"));
    await running;
    const file = `wrapyourgit-${sampleRecap.meta.year}-${sampleRecap.profile.login.toLowerCase()}-4x5.mp4`;
    expect(downloads).toEqual([file]);
    expect(actions).toEqual([
      { type: "start", job: "mp4" },
      { type: "progress", value: 0.5 },
      { type: "finish", file },
    ]);
    expect(runner.busy()).toBe(false);
  });

  test("slides fill 90% of the bar, assembly the rest, and end as a ZIP or a PDF", async () => {
    const { runner, downloads, actions } = setup();
    await runner.run("zip", "9x16");
    await runner.run("pdf", "9x16");
    expect(downloads.map((name) => name.split(".").pop())).toEqual(["zip", "pdf"]);
    const steps = [
      { type: "progress", value: 0.45 },
      { type: "progress", value: 0.9 },
      { type: "progress", value: 1 },
    ];
    expect(actions.filter((a) => a.type === "progress")).toEqual([...steps, ...steps]);
  });

  test("the bar stays below full until the ZIP is assembled", async () => {
    const { engine, actions, runner } = setup();
    const zipped = deferred<Blob>();
    engine.zipSlides = () => zipped.promise;
    const running = runner.run("zip", "9x16");
    await Bun.sleep(0);
    expect(actions.at(-1)).toEqual({ type: "progress", value: 0.9 });
    zipped.resolve(blob("zip"));
    await running;
    expect(actions.slice(-2)).toEqual([
      { type: "progress", value: 1 },
      { type: "finish", file: expect.stringMatching(/\.zip$/) },
    ]);
  });

  test("a second run while one is going is ignored, even before any re-render", async () => {
    const { runner, renders, actions } = setup();
    runner.run("mp4", "9x16");
    runner.run("mp4", "16x9");
    expect(renders).toHaveLength(1);
    expect(renders[0]?.signal.aborted).toBe(false);
    expect(actions).toEqual([{ type: "start", job: "mp4" }]);
  });

  test("cancel aborts, reports at once, and a late settle of that render is ignored", async () => {
    const { runner, renders, downloads, actions } = setup();
    const first = runner.run("mp4", "9x16");
    runner.cancel();
    expect(renders[0]?.signal.aborted).toBe(true);
    expect(runner.busy()).toBe(false);

    // A new render starts before the cancelled one settles; the old one must not touch it.
    const second = runner.run("mp4", "1x1");
    renders[0]?.onProgress(0.9);
    renders[0]?.done.resolve(blob("old"));
    await first;
    expect(downloads).toEqual([]);

    renders[1]?.done.resolve(blob("new"));
    await second;
    expect(downloads).toHaveLength(1);
    expect(actions.map((a) => a.type)).toEqual(["start", "cancel", "start", "finish"]);
  });

  test("an AbortError from the renderer is a cancel, anything else a failure", async () => {
    const { runner, renders, actions, warnings } = setup();
    const aborted = runner.run("mp4", "9x16");
    renders[0]?.done.reject(abortError());
    await aborted;
    const failed = runner.run("mp4", "9x16");
    renders[1]?.done.reject(new Error("encoder"));
    await failed;
    expect(actions.map((a) => a.type)).toEqual(["start", "cancel", "start", "fail"]);
    expect(warnings).toHaveLength(1);
  });

  test("new data mid-run neither aborts nor changes that render, and Cancel still works", async () => {
    const { runner, renders, downloads, actions, source } = setup();
    const first = runner.run("mp4", "9x16");
    // The dashboard's refresh() re-sends the public recap as a new object with a new login.
    source.data = { ...sampleRecap, profile: { ...sampleRecap.profile, login: "Renamed" } };
    expect(renders[0]?.signal.aborted).toBe(false);
    expect(runner.busy()).toBe(true);
    renders[0]?.done.resolve(blob("mp4"));
    await first;
    expect(downloads[0]).toContain(sampleRecap.profile.login.toLowerCase());

    const second = runner.run("mp4", "9x16");
    source.data = { ...sampleRecap };
    runner.cancel();
    expect(renders[1]?.signal.aborted).toBe(true);
    renders[1]?.done.reject(abortError());
    await second;
    expect(actions.map((a) => a.type)).toEqual(["start", "finish", "start", "cancel"]);
    expect(runner.busy()).toBe(false);
  });

  test("dispose aborts silently: the screen is gone, nothing is left to tell", async () => {
    const { runner, renders, actions } = setup();
    const running = runner.run("mp4", "9x16");
    runner.dispose();
    expect(renders[0]?.signal.aborted).toBe(true);
    renders[0]?.done.reject(abortError());
    await running;
    expect(actions).toEqual([{ type: "start", job: "mp4" }]);
  });
});
