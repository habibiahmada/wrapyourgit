<!--
Title: a Conventional Commit subject, e.g. "feat(video): add the weekday scene".
Branch: <type>/<issue>-<slug>, from `gh issue develop`. The Policy check verifies both.
-->

## Summary

<!-- What changed and why. -->

## How to test

<!-- Commands and steps a reviewer can follow. -->

## Checklist

- [ ] Branch `<type>/<issue>-<slug>` from an issue; commits are Conventional Commits, one logical change each
- [ ] `bun run typecheck && bun test && bun run lint` pass locally
- [ ] New or changed metrics are in `packages/schema` and defined in `docs/analytics/metrics.md`, with tests
- [ ] Nothing private (tokens, private repository names, timezone, commit hours) reaches a public page, card, slide or video
- [ ] Docs in the same area are updated (metrics, ADRs, DESIGN.md, CHANGELOG.md)
- [ ] UI changes checked at 375 px and on desktop, with keyboard and reduced motion
- [ ] A review comment on this PR says what was tested

Closes #
