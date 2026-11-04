/**
 * Deploys (or updates) the Remotion Lambda function and the video site bundle to AWS.
 *
 *   bun run --filter @wyg/renderer deploy
 *
 * Requires REMOTION_AWS_ACCESS_KEY_ID / REMOTION_AWS_SECRET_ACCESS_KEY (see docs/development/setup.md).
 * Prints the values to put in REMOTION_LAMBDA_FUNCTION_NAME and REMOTION_SERVE_URL.
 */
import path from "node:path";
import { deployFunction, deploySite, getOrCreateBucket } from "@remotion/lambda";
import { LAMBDA, REGION, SITE_NAME } from "./config";

const { functionName } = await deployFunction({
  region: REGION,
  ...LAMBDA,
  createCloudWatchLogGroup: true,
});

const { bucketName } = await getOrCreateBucket({ region: REGION });

const { serveUrl } = await deploySite({
  region: REGION,
  bucketName,
  siteName: SITE_NAME,
  entryPoint: path.resolve(import.meta.dir, "../../../packages/video/src/remotion-entry.ts"),
});

console.log(`REMOTION_LAMBDA_FUNCTION_NAME=${functionName}`);
console.log(`REMOTION_SERVE_URL=${serveUrl}`);
