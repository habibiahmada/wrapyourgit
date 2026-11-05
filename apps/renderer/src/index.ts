/**
 * Server-side entry used by apps/web to start and poll render jobs.
 * Uses the lightweight client entry so the web bundle does not pull in deploy tooling.
 */
import { getRenderProgress, renderMediaOnLambda } from "@remotion/lambda/client";
import type { RecapData, VideoFormatId } from "@wyg/schema";
import { REGION } from "./config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export async function startRender(data: RecapData, format: VideoFormatId) {
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: REGION,
    functionName: requireEnv("REMOTION_LAMBDA_FUNCTION_NAME"),
    serveUrl: requireEnv("REMOTION_SERVE_URL"),
    composition: `wrap-${format}`,
    inputProps: { data },
    codec: "h264",
    audioCodec: "aac",
    privacy: "private",
    downloadBehavior: { type: "download", fileName: `wrapyourgit-${data.meta.year}-${format}.mp4` },
  });
  return { renderId, bucketName };
}

export function getRenderStatus(renderId: string, bucketName: string) {
  return getRenderProgress({
    region: REGION,
    functionName: requireEnv("REMOTION_LAMBDA_FUNCTION_NAME"),
    renderId,
    bucketName,
  });
}
