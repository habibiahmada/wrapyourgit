import { EDITION_YEAR } from "@wyg/schema";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm uppercase tracking-widest opacity-60">
        WrapYourGit · {EDITION_YEAR}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Your year in code.
        <br />
        Your story in motion.
      </h1>
      <p className="max-w-md opacity-70">Under construction.</p>
    </main>
  );
}
