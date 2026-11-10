# 0004. Render MP4 on Remotion Lambda (AWS)

- Status: Superseded by [0016](0016-exports-in-the-browser.md) for the story world. The current story's Lambda path (never deployed) stays in the repository until phase 4 removes it.
- Date: 2026-11-04

## Context

A ~90 s video at 30 fps is ~2,700 frames. Vercel functions cannot run Chromium + FFmpeg renders of that length. Maintainer has >$100 AWS credit expiring 2026-12-31. Licence: Remotion is free for individuals and companies of ≤3 people (this is a personal project). Re-check https://remotion.dev/license before launch and if the project ever becomes a company product.

## Decision

- Use `@remotion/lambda`: one function + one S3 site bundle per deploy (`apps/renderer/src/deploy.ts`), region `ap-southeast-1` (Singapore) unless measurements suggest otherwise.
- Web calls `startRender()` / `getRenderStatus()` from server code only (`@remotion/lambda/client`).
- Output: private S3 objects, signed download URLs, S3 lifecycle rule deletes renders after 7 days.
- Guardrails: max renders per user per day, AWS Budget alert, Lambda concurrency limit.

## Consequences

- Fast, parallel renders; no render server to maintain.
- Spend burns credits now, real money from January (see ADR-0005).
- Site bundle must be redeployed whenever `packages/video` changes (CI step later).

## Local baseline (Spike B, 2026-11-04)

Four scenes, 900 frames (30 s), real RecapData, Remotion CLI on the maintainer's laptop, rendering from one prebuilt bundle: 9:16 85 s, 4:5 58 s, 1:1 42 s, 16:9 62 s. Each MP4 is about 2 MB (H.264 + AAC 48 kHz). A Lambda render is still to be measured.

## To record after Spike B

| Format | Duration | Render time | Est. cost/render |
| ------ | -------- | ----------- | ---------------- |
| 9:16   |          |             |                  |
| 16:9   |          |             |                  |

## Alternatives

Render worker on the AWS VPS (cheap, but slow and serial per box); client-side WebCodecs rendering (browser support and quality vary; possible P1 fallback).
