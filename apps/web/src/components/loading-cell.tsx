import Image from "next/image";

/**
 * An illustrated loading state: Cell thinking, bobbing gently (motion-safe only). A still image,
 * not WebGL, so it paints immediately and costs nothing while the real content loads.
 */
export function LoadingCell({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-12 text-center">
      <Image
        src="/art/cell-think.png"
        alt=""
        width={1200}
        height={900}
        className="h-auto w-56 rounded-[var(--radius-control)] motion-safe:animate-[bob_1.6s_ease-in-out_infinite]"
      />
      <p className="text-lg font-bold">{label}</p>
    </div>
  );
}
