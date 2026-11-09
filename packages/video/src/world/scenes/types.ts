import type { LayoutFamily, RecapData } from "@wyg/schema";
import type { ReactNode } from "react";
import type { City } from "../city";
import type { Stop } from "../stops";

export type SceneProps = {
  data: RecapData;
  stop: Stop;
  city: City;
  /** The frame's size: a scene draws frame-sized, StopLayer moves and scales it with the camera. */
  size: { width: number; height: number };
  layout: LayoutFamily;
  /** 0 when the move into this stop starts, eased to 1 at the rest frame, 1 from then on. */
  enter: number;
  /** Composition frame, for idle loops. Entrances animate from `enter`, not from this. */
  frame: number;
};

export type Scene = (props: SceneProps) => ReactNode;
