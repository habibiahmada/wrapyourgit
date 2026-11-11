import type { RecapData } from "@wyg/schema";

export type HelloModel = {
  login: string;
  year: number;
  publicOnly: boolean;
  /** Shown under the greeting when the recap holds public data only; null otherwise. */
  scopeLine: string | null;
};

export const PUBLIC_ONLY_LINE = "Public GitHub activity only";

export function helloModel(data: RecapData): HelloModel {
  const publicOnly = data.meta.scope === "public";
  return {
    login: data.profile.login,
    year: data.meta.year,
    publicOnly,
    scopeLine: publicOnly ? PUBLIC_ONLY_LINE : null,
  };
}
