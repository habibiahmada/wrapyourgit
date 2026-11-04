import { CellCharacter, HardHat, type Pose } from "./CellCharacter";
import { ContributionCity, cityLevels, DriftingCells, Effects, Stage, StudioLights } from "./World";

/*
 * The hero diorama: Cell standing in front of a contribution city, lit like a product shot.
 * Shared by the landing page, loading states and the story; `t` drives all motion.
 */
export function HeroScene({
  t = 0,
  pose = "wave",
  levels = cityLevels(10),
  grow = 1,
  builder = false,
  effects = true,
}: {
  t?: number;
  pose?: Pose;
  levels?: number[][];
  grow?: number;
  builder?: boolean;
  /** Bloom, depth of field and vignette; off for thumbnails and low-power devices. */
  effects?: boolean;
}) {
  return (
    <>
      <StudioLights />
      <DriftingCells t={t} />
      <Stage />
      {levels.length > 0 ? (
        <>
          <ContributionCity levels={levels} t={t} grow={grow} position={[-0.6, 0, -1.2]} />
          <CellCharacter
            pose={pose}
            t={t}
            position={[2.6, 0, 2.4]}
            scale={1.1}
            hat={builder ? <HardHat /> : undefined}
          />
        </>
      ) : (
        // Cell alone (loading and letter moments): centred and larger.
        <CellCharacter pose={pose} t={t} position={[0, 0, 0.6]} scale={2} />
      )}
      {effects && <Effects />}
    </>
  );
}
