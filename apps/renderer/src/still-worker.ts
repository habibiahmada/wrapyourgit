/**
 * A long-lived worker that renders story frames for the slide exports (ADR-0011). Started by
 * still-client.ts as a separate Bun process, so Next never bundles Remotion or Chrome.
 *
 * Protocol, one JSON object per line: in `{ id, data, composition, frame }`, out
 * `{ id, png }` (base64) or `{ id, error }`.
 */
import type { RecapData } from "@wyg/schema";
import { renderSceneStill } from "./still";

type Job = { id: number; data: RecapData; composition: string; frame: number };

const send = (message: object) => process.stdout.write(`${JSON.stringify(message)}\n`);

let buffered = "";
for await (const chunk of process.stdin) {
  buffered += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
  for (let end = buffered.indexOf("\n"); end >= 0; end = buffered.indexOf("\n")) {
    const line = buffered.slice(0, end);
    buffered = buffered.slice(end + 1);
    if (!line.trim()) continue;
    const job = JSON.parse(line) as Job;
    renderSceneStill(job.data, job.composition, job.frame).then(
      (png) => send({ id: job.id, png: Buffer.from(png).toString("base64") }),
      (error: unknown) =>
        send({ id: job.id, error: error instanceof Error ? error.message : String(error) }),
    );
  }
}
