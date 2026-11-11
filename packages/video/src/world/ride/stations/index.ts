import type { StopKind } from "../../stops";
import { city } from "./city";
import { closing } from "./closing";
import { hello } from "./hello";
import type { Station } from "./kit";
import { languages } from "./languages";
import { projects } from "./projects";

/** The hero each stop builds. Phase 2 of the story ride adds the rest. */
export const STATIONS: Partial<Record<StopKind, Station>> = {
  hello,
  city,
  languages,
  projects,
  closing,
};
