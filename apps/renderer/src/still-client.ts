/**
 * The web server's side of the slide renderer (ADR-0011): sends frame jobs to the still worker, a
 * separate Bun process that owns Remotion and headless Chrome, and waits for the PNG. Keeping
 * Remotion out of the Next process avoids bundling it there (Turbopack cannot resolve its
 * externals under Bun's isolated installs) and keeps Chrome's memory away from the web server.
 * The worker starts on the first request and stays up; if it exits, the next request starts a
 * new one.
 */
import { type ChildProcessByStdio, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Readable, Writable } from "node:stream";
import type { RecapData } from "@wyg/schema";

type Pending = { resolve: (png: Uint8Array) => void; reject: (error: Error) => void };

let worker: ChildProcessByStdio<Writable, Readable, null> | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

/** apps/renderer/src/still-worker.ts, found by walking up from the working directory. */
function workerScript(): string {
  let dir = process.cwd();
  for (;;) {
    const candidate = join(dir, "apps/renderer/src/still-worker.ts");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`still worker not found above ${process.cwd()}`);
    dir = parent;
  }
}

function startWorker(): ChildProcessByStdio<Writable, Readable, null> {
  const child = spawn(process.env.BUN_BIN ?? "bun", [workerScript()], {
    stdio: ["pipe", "pipe", "inherit"],
    env: process.env,
  });
  let buffered = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffered += chunk;
    for (let end = buffered.indexOf("\n"); end >= 0; end = buffered.indexOf("\n")) {
      const line = buffered.slice(0, end);
      buffered = buffered.slice(end + 1);
      let message: { id?: number; png?: string; error?: string };
      try {
        message = JSON.parse(line);
      } catch {
        continue; // a library printing to stdout; only our JSON lines carry results
      }
      const job = message.id === undefined ? undefined : pending.get(message.id);
      if (!job || message.id === undefined) continue;
      pending.delete(message.id);
      if (message.png) job.resolve(new Uint8Array(Buffer.from(message.png, "base64")));
      else job.reject(new Error(message.error ?? "still worker failed"));
    }
  });
  const fail = (reason: string) => {
    worker = null;
    for (const job of pending.values()) job.reject(new Error(reason));
    pending.clear();
  };
  child.on("exit", (code) => fail(`still worker exited (${code})`));
  child.on("error", (error) => fail(`still worker failed to start: ${error.message}`));
  return child;
}

/**
 * One frame of `composition` as PNG bytes, rendered by the still worker. `data` must already be
 * the public projection when the file is meant to be shared.
 */
export function renderSceneStill(
  data: RecapData,
  composition: string,
  frame: number,
): Promise<Uint8Array> {
  worker ??= startWorker();
  const id = nextId++;
  const promise = new Promise<Uint8Array>((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
  worker.stdin.write(`${JSON.stringify({ id, data, composition, frame })}\n`);
  return promise;
}
