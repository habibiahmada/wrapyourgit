import type { Metadata } from "next";
import { Bench } from "./Bench";

/* Spike (#147, never merged): a hidden page to measure a faster export on a phone. */
export const metadata: Metadata = {
  title: "Export bench",
  robots: { index: false, follow: false },
};

export default function ExportBenchPage() {
  return <Bench />;
}
