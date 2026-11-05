import { Art } from "@/components/art";

const WEEK = [0, 1, 2, 3, 4, 5, 6];
// GitHub's dark graph ramp, so the loading row looks like a week filling in on your profile.
const RAMP = ["#0e4429", "#006d32", "#26a641", "#39d353", "#26a641", "#006d32", "#0e4429"];

/**
 * An illustrated loading state: the 3D Cell thinking, with a week of contribution cells lighting
 * up one after another underneath, like a graph filling in. Still images and CSS only (no WebGL),
 * so it paints at once. The cells loop because they mean "still working"; under reduced motion
 * they stay lit and the text carries the message.
 */
export function LoadingCell({ label }: { label: string; tone?: "paper" | "ink" }) {
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center"
    >
      <Art
        id="cutout-cell-think"
        alt=""
        priority
        className="h-auto w-64 motion-safe:animate-[bob_1.6s_ease-in-out_infinite] sm:w-80"
      />
      <div aria-hidden className="flex gap-1.5">
        {WEEK.map((i) => (
          <span
            key={i}
            className="size-4 rounded-[3px] motion-safe:animate-[pulse-cell_1.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.12}s`, background: RAMP[i] }}
          />
        ))}
      </div>
      <p className="text-lg font-semibold">{label}</p>
    </div>
  );
}
