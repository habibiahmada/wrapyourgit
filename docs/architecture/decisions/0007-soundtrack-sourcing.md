# 0007. Soundtrack: CC0 / royalty-free tracks first, generated later

- Status: Accepted for MVP (2026-11-04): original synthesised track, see Outcome
- Date: 2026-11-04

## Context

Videos are downloaded and re-posted to Instagram/TikTok/YouTube, so the music licence must allow redistribution inside user-generated videos, with no attribution burden on the user and no Content ID claims. Beat-synced transitions need a known BPM.

## Decision (proposed)

1. **MVP: one track.** Prefer **CC0** (public domain) music, or a licence that explicitly allows use in videos distributed by end users without attribution. Record source URL, licence and author for every file in `packages/video/public/audio/LICENSES.md`. Avoid tracks registered with Content ID.
2. **SFX:** CC0 sound effects (whooshes, ticks, risers), same licence record.
3. **Later (P1):** generate original tracks (AI music tool whose terms grant commercial rights, or procedural synthesis) for the four moods.
4. Each track gets a metadata file: BPM, beat offset, section markers (intro / build / drop / outro). Scene durations snap to beats.

## Consequences

Music must be chosen before scene timing is locked (M4). Until then a synthesised CC0 placeholder (`scripts/synth-placeholder-track.ts`, 120 BPM) is used to test beat sync, with the same metadata shape the real track will use (`packages/video/src/audio/track.ts`).

## Outcome (M4)

The maintainer chose an original synthesised track for the MVP over a third-party CC0 track. `scripts/synth-track.ts` builds it deterministically from `TRACK` metadata (120 BPM, 132 beats, sections on scene cuts), so it is ours under CC0 with no Content ID or attribution risk, and the music can't drift from the scenes. The trade-off is sound quality: it is minimal electronic, not a studio production. Point 3 (more moods, generated or licensed) stays P1.
