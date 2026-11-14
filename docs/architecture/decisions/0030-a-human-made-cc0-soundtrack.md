# 0030. The soundtrack is a human-made CC0 track

- Status: Accepted
- Date: 2026-11-14
- Supersedes: the Outcome of [0007](0007-soundtrack-sourcing.md) (an original synthesised track)

## Context

The story world's track was synthesised from sine waves by `scripts/synth-world-track.ts`: mono, no reverb, no melody. ADR-0007 accepted it as a trade-off ("minimal electronic, not a studio production"). The maintainer found it thin; it is what people hear the whole time they ride (#155).

ADR-0007's constraints still hold. People download the MP4 and re-post it, so the licence must allow that with no credit owed by them, and the repository is public, so the file itself is redistributed. That rules out licences that forbid redistributing the file on its own (Mixkit, Pixabay) and ones that require attribution in every video (CC BY). It leaves CC0 or our own work.

## Decision

1. **The track is "Traveling in your mind" by Loyalty Freak Music** (album _To Chill and Stay Awake_, 2017), CC0 1.0 on the Free Music Archive, chosen by the maintainer from a shortlist of CC0 tracks. Its source URL, licence page and SHA-256 are in `packages/video/public/audio/LICENSES.md`. We credit the artist there and in THIRD_PARTY_NOTICES.md, though CC0 does not ask for it.
2. **`scripts/prepare-world-track.ts` builds the file from the published MP3**, deterministically, and checks it. It keeps the music as published except for what looping needs:
   - The loop region is the source's bar 38 to bar 64 (86 BPM), where the bars that follow match closely. The track plays from the top once (about three minutes) before anything repeats.
   - A resample of about 0.01 % and a few milliseconds of silence at the start put both loop points on whole frames at 30 fps, so the MP4's loop has no rounding.
   - The 0.3 s before the loop end are crossfaded into the 0.3 s before the loop start, so the jump back continues the waveform.
   - The file stops one second past the loop end, holding the loop's start again; the outro is not used (the video fades itself).
3. **`WORLD_TRACK` describes the file in frames**, not beats: the loop region and the file's length. Nothing else in the story is timed to the music's beat.

## Alternatives

- **Improve the synthesiser** (stereo, reverb, a melody): keeps the music ours and reproducible from code, but sine synthesis stays thin.
- **AI-generated music**: the free tiers that sound good are not licensed for commercial use, and the paid terms would have to allow redistributing the file in a public repository.
- **Other CC0 artists**: Komiku's CC0 tracks have been claimed on YouTube by a third party, which would land on the people who share their recap.

## Consequences

- CC0 does not stop someone from registering the track with YouTube's Content ID by mistake. If a recap's video is claimed, the owner can dispute it with the licence record; nothing in the product changes.
- The file is stereo AAC at 160 kb/s, 3.7 MB (the synthesised one was 2.4 MB). The web fetches it on the first tap, as before.
- The track's RMS is about 5 dB below the synthesised one's; the effects keep their volumes, so they sit a little higher against the music.
- `scripts/synth-world-track.ts` and `world-90bpm-v1.m4a` are removed.
