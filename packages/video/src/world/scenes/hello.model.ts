import type { RecapData } from "@wyg/schema";

export type HelloModel = { login: string; year: number };

export function helloModel(data: RecapData): HelloModel {
  return { login: data.profile.login, year: data.meta.year };
}
