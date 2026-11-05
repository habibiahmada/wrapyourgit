import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { SITE } from "@/site";
import { NAV_LINKS } from "./nav-links";

/** One row of the same links as the header: the site has one page of sections, not four groups. */
export function SiteFooter({ base = "" }: { base?: "" | "/" }) {
  return (
    <footer className="border-t border-line bg-[#010409]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center text-xl font-bold">
            WrapYourGit {EDITION_YEAR}
          </Link>
          <p className="max-w-md text-sm text-muted">
            An independent project, built on the GitHub API.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-2">
            {NAV_LINKS.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`${base}#${id}`}
                  className="inline-flex min-h-11 items-center px-2 text-sm text-muted hover:text-blue hover:underline"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center px-2 text-sm text-muted hover:text-blue hover:underline"
              >
                Privacy policy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-sm text-muted sm:px-8">
          {/* The edition year, not new Date(): reading the clock would make every page dynamic. */}
          © {EDITION_YEAR} WrapYourGit. Made by{" "}
          <a
            href={SITE.author.url}
            rel="author"
            className="inline-flex min-h-11 items-center font-semibold text-fg underline underline-offset-4 hover:text-blue"
          >
            {SITE.author.handle}
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
