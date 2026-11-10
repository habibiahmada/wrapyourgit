import { describe, expect, test } from "bun:test";
import { sampleRecap } from "@wyg/video";
import { slideFrames } from "@wyg/video/world";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import { type ExportEngine, exportSupport, pdfSlides, renderSlides, zipSlides } from "./exports";

// A valid 1x1 PNG, enough for pdf-lib to embed and fflate to store.
const PNG_1X1 = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);
const png = () => new Blob([PNG_1X1], { type: "image/png" });
const slides = [
  { name: "wrapyourgit-2026-octocat-01-intro.png", blob: png() },
  { name: "wrapyourgit-2026-octocat-02-letter.png", blob: png() },
];

const canRenderResult = (canRender: boolean, issues: { type: string; message: string }[]) =>
  ({
    canRender,
    issues: issues.map((i) => ({ ...i, severity: "error" })),
    resolvedVideoCodec: canRender ? "h264" : null,
    resolvedAudioCodec: canRender ? "aac" : null,
    resolvedOutputTarget: "arraybuffer",
  }) as unknown as Awaited<ReturnType<ExportEngine["canRender"]>>;

describe("zipSlides", () => {
  test("stores every slide under its name", async () => {
    const zip = await zipSlides(slides);
    const files = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    expect(Object.keys(files).sort()).toEqual(slides.map((s) => s.name).sort());
    expect(files[slides[0]?.name ?? ""]).toEqual(PNG_1X1);
  });
});

describe("pdfSlides", () => {
  test("one 1080 x 1350 page per slide, titled", async () => {
    const pdf = await PDFDocument.load(
      await (await pdfSlides(slides, { title: "WrapYourGit 2026" })).arrayBuffer(),
    );
    expect(pdf.getPageCount()).toBe(2);
    for (const page of pdf.getPages())
      expect(page.getSize()).toEqual({ width: 1080, height: 1350 });
    expect(pdf.getTitle()).toBe("WrapYourGit 2026");
  });
});

describe("exportSupport", () => {
  test("an issue from the renderer turns the MP4 off with a reason", async () => {
    const support = await exportSupport({
      canRender: async () =>
        canRenderResult(false, [{ type: "video-codec-unsupported", message: "no h264" }]),
      stillsAvailable: () => true,
    });
    expect(support.mp4).toBe(false);
    expect(support.stills).toBe(true);
    expect(support.reason).toEqual(expect.any(String));
  });

  test("everything available has no reason", async () => {
    const support = await exportSupport({
      canRender: async () => canRenderResult(true, []),
      stillsAvailable: () => true,
    });
    expect(support).toEqual({ mp4: true, stills: true, reason: null });
  });

  test("a renderer that throws is the same as one that cannot render", async () => {
    const support = await exportSupport({
      canRender: async () => {
        throw new Error("boom");
      },
      stillsAvailable: () => false,
    });
    expect(support.mp4).toBe(false);
    expect(support.stills).toBe(false);
    expect(support.reason).toEqual(expect.any(String));
  });
});

describe("renderSlides", () => {
  test("names every slide 1-based and reports progress", async () => {
    const frames = slideFrames(sampleRecap);
    const progress: [number, number][] = [];
    const out = await renderSlides(
      sampleRecap,
      {
        onProgress: (done, total) => progress.push([done, total]),
        signal: new AbortController().signal,
      },
      { renderStill: async () => png() },
    );
    expect(out).toHaveLength(frames.length);
    expect(out[0]?.name).toEndWith(`-01-${frames[0]?.stopId}.png`);
    expect(progress.at(-1)).toEqual([frames.length, frames.length]);
  });

  test("stops between slides and rejects with an AbortError when the signal aborts", async () => {
    const controller = new AbortController();
    let rendered = 0;
    const run = renderSlides(
      sampleRecap,
      { onProgress: () => {}, signal: controller.signal },
      {
        renderStill: async () => {
          rendered += 1;
          if (rendered === 1) controller.abort();
          return png();
        },
      },
    );
    await expect(run).rejects.toMatchObject({ name: "AbortError" });
    expect(rendered).toBe(1);
  });
});
