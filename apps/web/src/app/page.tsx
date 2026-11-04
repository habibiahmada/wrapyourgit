import { EDITION_YEAR } from "@wyg/schema";
import Link from "next/link";
import { Suspense } from "react";
import { Scene3D } from "@/components/scene3d/scene-3d";
import { button } from "@/components/ui";
import { getCurrentUser } from "@/server/auth";

const NOTICES: Record<string, string> = {
  "signin=cancelled": "Sign-in was cancelled on GitHub. Nothing was saved.",
  "signin=expired": "That sign-in link expired. Start again below.",
  "signin=failed": "GitHub sign-in didn't finish. Try again in a moment.",
  "deleted=1": "Your data is deleted and WrapYourGit's access to GitHub is revoked.",
  "deleted=unrevoked":
    "Your data is deleted. To finish, revoke WrapYourGit in your GitHub settings under Applications.",
};

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <header className="on-dark bg-ink px-4 pt-10 text-paper sm:px-10 sm:pt-14">
        <p className="text-lg font-bold">WrapYourGit · {EDITION_YEAR}</p>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="on-dark bg-ink px-4 pb-16 text-paper sm:px-10 sm:pb-24">
          <Suspense fallback={null}>
            <Notice searchParams={searchParams} />
          </Suspense>
          <div className="mt-10 grid items-center gap-10 sm:mt-14 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h1 className="max-w-4xl text-6xl leading-[0.95] font-extrabold tracking-tight sm:text-8xl">
                Your year in code.
              </h1>
              <p className="mt-6 max-w-xl text-lg sm:text-xl">
                Sign in with GitHub and get your {EDITION_YEAR} as a short animated story: your
                contributions, your streaks, your busiest month and the languages you wrote most.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Suspense fallback={<SignInLink />}>
                  <PrimaryAction />
                </Suspense>
              </div>
            </div>
            <Scene3D
              art="hero"
              priority
              alt="Cell, the WrapYourGit mascot, in a hard hat in front of a 3D contribution graph"
              className="rounded-[var(--radius-control)]"
            />
          </div>
        </section>

        <section className="grid gap-10 px-4 py-14 sm:grid-cols-[1.4fr_1fr] sm:px-10">
          <div>
            <h2 className="text-3xl font-extrabold sm:text-4xl">Read-only, and yours to delete.</h2>
            <p className="mt-4 max-w-xl text-lg">
              WrapYourGit asks GitHub for no repository permissions and never reads your code. It
              counts your contributions, and you can delete everything it stored from your
              dashboard.
            </p>
          </div>
          <ul className="space-y-3 text-lg">
            <li>Contribution counts, streaks and your busiest month</li>
            <li>Languages weighted by the commits you made</li>
            <li>A story that plays in your browser</li>
          </ul>
        </section>
      </main>
      <footer className="border-t-2 border-ink px-4 py-6 text-base sm:px-10">
        WrapYourGit {EDITION_YEAR}. Built on the GitHub API; not affiliated with GitHub.
      </footer>
    </>
  );
}

function SignInLink() {
  return (
    // A plain link: the sign-in route redirects to GitHub, so prefetching it would be wasted.
    <a href="/api/auth/signin" className={button.primary}>
      Sign in with GitHub
    </a>
  );
}

async function PrimaryAction() {
  const user = await getCurrentUser();
  if (!user) return <SignInLink />;
  return (
    <Link href="/dashboard" className={button.primary}>
      Open your {EDITION_YEAR} recap, @{user.login}
    </Link>
  );
}

async function Notice({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = await searchParams;
  const key = Object.entries(params)
    .map(([name, value]) => `${name}=${value}`)
    .find((entry) => entry in NOTICES);
  if (!key) return null;
  return (
    <p
      role="status"
      className="mt-6 max-w-xl rounded-[var(--radius-control)] bg-paper px-4 py-3 text-ink"
    >
      {NOTICES[key]}
    </p>
  );
}
