import type { AwsRegion } from "@remotion/lambda";

export const REGION = (process.env.AWS_REGION ?? "ap-southeast-1") as AwsRegion;
export const SITE_NAME = "wrapyourgit";

// Starting point; tune after measuring real renders (docs/architecture/decisions/0004-*.md).
export const LAMBDA = {
  memorySizeInMb: 2048,
  diskSizeInMb: 2048,
  timeoutInSeconds: 240,
} as const;
