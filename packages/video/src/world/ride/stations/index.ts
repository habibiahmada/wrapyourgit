import type { StopKind } from "../../stops";
import { busiest } from "./busiest";
import { city } from "./city";
import { closing } from "./closing";
import { community } from "./community";
import { engineering } from "./engineering";
import { firstDay } from "./firstDay";
import { hello } from "./hello";
import type { Station } from "./kit";
import { languages } from "./languages";
import { privateVault } from "./private";
import { projects } from "./projects";
import { rhythm } from "./rhythm";

/** The hero each stop builds. Phase 2 of the story ride adds the rest, one at a time. */
export const STATIONS: Partial<Record<StopKind, Station>> = {
  hello,
  "first-day": firstDay,
  private: privateVault,
  city,
  busiest,
  rhythm,
  languages,
  projects,
  community,
  engineering,
  closing,
};
