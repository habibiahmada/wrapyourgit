/**
 * Sound effects, synthesised by scripts/synth-sfx.ts (CC0, ADR-0009). WAV rather than AAC: AAC
 * starts with encoder padding, which would make a pop land after the thing it belongs to.
 * Volumes sit under the music; world/sound.ts picks the sound for each stop.
 */
export const SFX = {
  /** A tap or key press that moves the story. */
  tap: { file: "audio/sfx/tap.wav", volume: 0.35, seconds: 0.06 },
  /** Arrival at the first-day plot: a soft rising pluck. */
  sprout: { file: "audio/sfx/sprout.wav", volume: 0.35, seconds: 0.5 },
  /** Arrival at the private-work vault: two metallic clicks. */
  lock: { file: "audio/sfx/lock.wav", volume: 0.35, seconds: 0.35 },
  /** Arrival at the busiest day: a flap of cloth. */
  flag: { file: "audio/sfx/flag.wav", volume: 0.35, seconds: 0.4 },
  /** Arrival at the rhythm scene: two soft train chugs. */
  chug: { file: "audio/sfx/chug.wav", volume: 0.35, seconds: 0.8 },
  /** Arrival at the language garden: an airy rising chime. */
  bloom: { file: "audio/sfx/bloom.wav", volume: 0.35, seconds: 0.6 },
  /** Arrival at the projects: a wooden knock. */
  crate: { file: "audio/sfx/crate.wav", volume: 0.4, seconds: 0.35 },
  /** Arrival under the night sky: a high bell sparkle. */
  twinkle: { file: "audio/sfx/twinkle.wav", volume: 0.3, seconds: 0.8 },
  /** Arrival at the engineering plot: a soft swoosh and a tap. */
  landing: { file: "audio/sfx/landing.wav", volume: 0.4, seconds: 0.6 },
  /** Arrival at the archetype stage: a low warm thump and a shimmer. */
  spotlight: { file: "audio/sfx/spotlight.wav", volume: 0.4, seconds: 0.7 },
  /** Arrival at the versus scene: a wooden creak. */
  seesaw: { file: "audio/sfx/seesaw.wav", volume: 0.35, seconds: 0.6 },
  /** Arrival at a letter page: a paper swish. */
  page: { file: "audio/sfx/page.wav", volume: 0.35, seconds: 0.35 },
  /** Arrival at the closing: a pop and a crackle tail. */
  firework: { file: "audio/sfx/firework.wav", volume: 0.4, seconds: 1.2 },
  /** Arrival at the first stop: a friendly two-note chime. */
  hello: { file: "audio/sfx/hello.wav", volume: 0.35, seconds: 0.4 },
  /**
   * Every move of the ride: the wheels on the rails, a pair of clacks at each joint. A loop of
   * four joints, played for as long as the move lasts: it rolls in as the train pulls away and
   * fades as it pulls in (`RAILS_IN_SECONDS`, `CUT_FADE_SECONDS`).
   */
  rails: { file: "audio/sfx/rails.wav", volume: 0.4, seconds: 1.68, loop: true },
} as const satisfies Record<
  string,
  { file: string; volume: number; seconds: number; loop?: boolean }
>;

export type SfxName = keyof typeof SFX;

/** A sound cut short (the rails, as long as a move) fades out over this, so it ends without a click. */
export const CUT_FADE_SECONDS = 0.35;
/** A looping sound (the rails) comes in over this, as the train pulls away. */
export const RAILS_IN_SECONDS = 0.6;

/** Whether a sound loops for as long as it is played (only the rails do). */
export const loops = (name: SfxName): boolean => "loop" in SFX[name];

/** File of a sound, relative to the public folder. */
export function sfxFile(name: SfxName): string {
  return SFX[name].file;
}
