import { Art } from "@/components/art";
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
    <section aria-labelledby="private-title" className="px-4 py-16 sm:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-xl border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 id="private-title" className="text-3xl font-bold sm:text-4xl">
            Count your private repositories too
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Your private contributions are already in your total. To also count the private
            repositories you own, and the stars your repositories gained this year, install
            WrapYourGit on your account or an organisation. You choose which repositories. It asks
            for Metadata: read only, never your code, and organisation owners may need to approve
            it.
          </p>
          <p className="mt-4 text-lg text-muted">When you are back, press Sync again.</p>
          <a href={href} className={`mt-8 ${button.secondary}`}>
            Choose repositories on GitHub
          </a>
        </div>
        <Art id="skin-explorer" alt="" className="h-auto w-full" />
      </div>
    </section>
  );
}
