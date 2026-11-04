## Summary

<!-- What changed and why. -->

## How to test

<!-- Commands and steps a reviewer can follow. -->

## Checklist

- [ ] `bun run typecheck && bun test && bun run lint` pass locally
- [ ] New or changed metrics are in `packages/schema` and defined in `docs/analytics/metrics.md`, with tests
- [ ] Nothing private (tokens, private repository names, timezone, commit hours) reaches a public page, card, slide or video
- [ ] Docs in the same area are updated (metrics, ADRs, DESIGN.md)
- [ ] UI changes checked at 375 px and on desktop, with keyboard and reduced motion

Closes #
