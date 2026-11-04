import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { button } from "@/components/ui";

/** Unknown pages and recaps that aren't shared (their owner may have taken them down). */
export default function NotFound() {
  return (
    <>
      <SiteHeader base="/" />
      <main id="main" className="flex flex-1 flex-col">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <h1 className="text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl">
              Nothing here.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
              This page doesn't exist, or the recap you followed isn't shared any more. Its owner
              can publish it again from their dashboard.
            </p>
            <Link href="/" className={`${button.primary} mt-10`}>
              Back to WrapYourGit
            </Link>
          </div>
          <Image
            src="/art/cutout-cell-sleep.png"
            alt="Cell, the WrapYourGit mascot, asleep"
            width={1200}
            height={900}
            preload
            sizes="(min-width: 1024px) 45vw, 90vw"
            className="h-auto w-full"
          />
        </div>
      </main>
      <SiteFooter base="/" />
    </>
  );
}
