import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { isReserved, recapPath } from "@/server/routes";
import { LoadingScreen } from "../../[username]/loading-screen";
import { RecapRoute, recapMetadata } from "../../[username]/recap-route";

/** As on /[username]: a 60 s wait for another fetch, then a fetch. */
export const maxDuration = 120;

export async function generateMetadata({ params }: PageProps<"/u/[login]">): Promise<Metadata> {
  const { login } = await params;
  return recapMetadata(login);
}

/**
 * The recap of an account named like a site route (/u/settings). Every other name gets a 308 to
 * /<login> from proxy.ts before this renders; the redirect below only backs that up.
 */
export default function ReservedNameRecapPage({ params }: PageProps<"/u/[login]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ReservedName params={params} />
    </Suspense>
  );
}

async function ReservedName({ params }: Pick<PageProps<"/u/[login]">, "params">) {
  const { login } = await params;
  if (!isReserved(login)) permanentRedirect(recapPath(login));
  return <RecapRoute name={login} />;
}
