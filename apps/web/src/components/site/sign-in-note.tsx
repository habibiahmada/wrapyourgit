/**
 * Said where the sign-in is offered, not only in the footer: who runs the site and where the
 * sign-in happens. A page that leads to GitHub's login from another domain should say so plainly
 * (ADR-0029).
 */
export function SignInNote() {
  return (
    <p className="mt-4 max-w-md text-sm text-muted">
      An independent project, not affiliated with GitHub. Signing in happens on github.com and gives
      read-only access.
    </p>
  );
}
