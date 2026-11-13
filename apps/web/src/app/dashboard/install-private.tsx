import { button } from "@/components/ui";

/**
 * Optional step to count private repositories you own (ADR-0008). Sign-in asks for no repository
 * permissions, so your private contributions are already counted but the repositories themselves
 * are not. Installing the GitHub App with Metadata: read on chosen repositories or organisations
 * adds them, and unlocks stars gained. Hidden until GITHUB_APP_SLUG is set, so the button never
 * points at an app that isn't configured for it (R-26).
 */
export function InstallPrivate() {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) return null;
  const href = `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`;
  return (
    <section aria-labelledby="private-title" className="rounded-md border border-line bg-surface">
      <h2 id="private-title" className="border-b border-line px-4 py-3 text-sm font-semibold">
        Count your private repositories
      </h2>
      <div className="space-y-3 px-4 py-4 text-sm text-muted">
        <p>
          Private contributions are already in your total. To also count the private repositories
          you own, and the stars yours gained this year, install WrapYourGit on your account or an
          organisation. It asks for Metadata: read only, never your code.
        </p>
        <p>When you are back, press Sync again.</p>
        <a href={href} className={button.secondary}>
          Choose repositories on GitHub
        </a>
      </div>
    </section>
  );
}
