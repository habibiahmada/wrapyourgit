"use client";

import { Player } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { VIDEO_FORMATS, VIDEO_FPS, type VideoFormatId } from "@wyg/schema";
import { RideStory, WorldStory } from "@wyg/video";
import { rideDuration } from "@wyg/video/ride";
import { sampleRecap } from "@wyg/video/sample";
import { worldDuration } from "@wyg/video/world";
import { useEffect, useId, useState } from "react";

/** Remotion's Free License, as in recap/exports.ts (ADR-0016). */
const LICENSE_KEY = "free-license";
const FORMAT_IDS = Object.keys(VIDEO_FORMATS) as VideoFormatId[];
const PROPS = { data: sampleRecap, mode: "video" as const, music: false };

type Story = "ride" | "world";
type Result = { story: Story; format: VideoFormatId; seconds: number; url: string };

const NAMES: Record<Story, string> = { ride: "the ride", world: "today's story" };

export function RideGate() {
  const [format, setFormat] = useState<VideoFormatId>("16x9");
  const [busy, setBusy] = useState<Story | null>(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [failure, setFailure] = useState("");
  const formatId = useId();
  // The Player draws only in the browser: the server's floating point differs from the browser's in
  // the last digit, which would not match on hydration, and the Player reads the clock.
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);
  const size = VIDEO_FORMATS[format];
  const frames = {
    ride: rideDuration(sampleRecap, size, "video"),
    world: worldDuration(sampleRecap, size, "video"),
  };

  async function render(story: Story) {
    setBusy(story);
    setFailure("");
    setProgress("starting");
    const started = performance.now();
    try {
      const options = {
        container: "mp4" as const,
        videoCodec: "h264" as const,
        audioCodec: "aac" as const,
        licenseKey: LICENSE_KEY,
        inputProps: PROPS,
        onProgress: ({ renderedFrames }: { renderedFrames: number }) =>
          setProgress(`${renderedFrames} of ${frames[story]} frames`),
      };
      const composition = {
        id: `${story}-${format}`,
        width: size.width,
        height: size.height,
        fps: VIDEO_FPS,
        durationInFrames: frames[story],
        defaultProps: PROPS,
      };
      // Two calls, not one with a union: the renderer's types tie a composition to its component.
      const output =
        story === "ride"
          ? await renderMediaOnWeb({
              ...options,
              composition: { ...composition, component: RideStory },
            })
          : await renderMediaOnWeb({
              ...options,
              composition: { ...composition, component: WorldStory },
            });
      const blob = await output.getBlob();
      const seconds = (performance.now() - started) / 1000;
      setResults((all) => [...all, { story, format, seconds, url: URL.createObjectURL(blob) }]);
    } catch (error) {
      setFailure(
        `Rendering ${NAMES[story]} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">Story ride: render gate</h1>
      <p className="max-w-prose text-muted">
        Development only. Play the ride, then render today's story and the ride in the same format
        and compare the seconds. Keep this tab visible while a render runs.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={formatId} className="text-sm font-semibold">
            Format
          </label>
          <select
            id={formatId}
            value={format}
            disabled={busy !== null}
            onChange={(event) => setFormat(event.target.value as VideoFormatId)}
            className="min-h-11 rounded-md border border-line bg-surface px-3 text-fg"
          >
            {FORMAT_IDS.map((id) => (
              <option key={id} value={id}>
                {id} ({VIDEO_FORMATS[id].width} × {VIDEO_FORMATS[id].height})
              </option>
            ))}
          </select>
        </div>
        {(["world", "ride"] as const).map((story) => (
          <button
            key={story}
            type="button"
            disabled={busy !== null}
            onClick={() => render(story)}
            className="min-h-11 rounded-md border border-line bg-overlay px-4 font-semibold text-fg hover:bg-surface active:translate-y-px disabled:opacity-50"
          >
            Render {NAMES[story]} as MP4
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {busy ? `Rendering ${NAMES[busy]} (${format}): ${progress}` : ""}
        {failure}
      </div>

      {inBrowser ? (
        <Player
          key={format}
          component={RideStory}
          inputProps={PROPS}
          durationInFrames={frames.ride}
          fps={VIDEO_FPS}
          compositionWidth={size.width}
          compositionHeight={size.height}
          controls
          style={{
            width: "100%",
            maxHeight: "70vh",
            aspectRatio: `${size.width} / ${size.height}`,
          }}
        />
      ) : (
        <p className="text-muted">Loading the player.</p>
      )}

      <table className="w-full border-collapse text-left text-sm">
        <caption className="pb-2 text-left font-semibold">Renders so far</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-2 pr-4">
              Story
            </th>
            <th scope="col" className="py-2 pr-4">
              Format
            </th>
            <th scope="col" className="py-2 pr-4">
              Seconds
            </th>
            <th scope="col" className="py-2">
              File
            </th>
          </tr>
        </thead>
        <tbody>
          {results.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-muted">
                Nothing rendered yet.
              </td>
            </tr>
          ) : (
            results.map((result) => (
              <tr key={result.url} className="border-b border-line">
                <td className="py-2 pr-4">{NAMES[result.story]}</td>
                <td className="py-2 pr-4">{result.format}</td>
                <td className="py-2 pr-4 tabular-nums">{result.seconds.toFixed(1)}</td>
                <td className="py-2">
                  <a
                    href={result.url}
                    download={`${result.story}-${result.format}.mp4`}
                    className="text-blue underline"
                  >
                    Save the MP4
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
