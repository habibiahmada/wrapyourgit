import { githubGraphql } from "./client";

/** The signed-in user's identity. `databaseId` is stable across login renames. */
export interface Viewer {
  databaseId: number;
  login: string;
  name: string | null;
  avatarUrl: string;
}

export async function fetchViewer(token: string): Promise<Viewer> {
  const data = await githubGraphql<{ viewer: Viewer }>(
    token,
    "query Viewer { viewer { databaseId login name avatarUrl } }",
  );
  return data.viewer;
}
