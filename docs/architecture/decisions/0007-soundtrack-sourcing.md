# 0007. Soundtrack: CC0 / royalty-free tracks first, generated later

- Status: Proposed
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
