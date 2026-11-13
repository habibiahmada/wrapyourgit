import type { ReactNode } from "react";
import { Art } from "@/components/art";
import { PageTransition } from "./page-transition";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * The layout the privacy policy and the terms share: a title band with a block of Cell's city, a
 * table of contents that stays in view on wide screens, and the sections in reading width.
 */
export function LegalPage({
  title,
  lead,
  updated,
  art,
  sections,
}: {
  title: string;
  lead: string;
  updated: string;
  art: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader base="/" />
      <PageTransition>
        <main id="main" className="flex flex-1 flex-col">
          <section className="relative overflow-hidden border-b border-line">
            <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-14 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <h1 className="reveal text-6xl leading-[0.92] font-extrabold tracking-tight sm:text-8xl">
                  {title}
                </h1>
                <p className="mt-6 max-w-xl text-lg sm:text-xl">{lead}</p>
                <p className="mt-4 text-base">Last updated {updated}</p>
              </div>
              <Art id={art} alt="" priority className="h-auto w-full" />
            </div>
          </section>
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[16rem_1fr]">
            <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
              <ul className="space-y-1">
                {sections.map(({ id, title: label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <article className="max-w-3xl">
              {sections.map(({ id, title: heading, body }) => (
                <section
                  key={id}
                  id={id}
                  aria-labelledby={`${id}-title`}
                  className="border-t border-line py-8 text-lg text-muted [&_a]:font-semibold [&_a]:text-blue [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-fg [&_li]:mt-2 [&_p+p]:mt-4 [&_p+ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul+p]:mt-4"
                >
                  <h2 id={`${id}-title`} className="text-2xl font-bold text-fg">
                    {heading}
                  </h2>
                  <div className="mt-4">{body}</div>
                </section>
              ))}
            </article>
          </div>
        </main>
        <SiteFooter base="/" />
      </PageTransition>
    </>
  );
}
