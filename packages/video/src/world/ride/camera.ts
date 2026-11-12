/*
 * The ride's camera. Between stations it sits behind Cell and moves into the screen; in a long
 * move it also lifts overhead or drops beside the wheels; at a station it settles on the
 * landing's isometric angle, across the rail from the plaza. Everything is a function of the
 * frame, so the Player, the MP4 and the slides agree.
 */
import { layoutForSize } from "@wyg/schema";
import { easeInOutCubic } from "../timeline";
import { type Frame, projectPoint, type RideCamera, type V3 } from "./project";
import type { RideStop } from "./stops";
import { type RideTimeline, trainAt } from "./timeline";
import {
  at,
  billboardAt,
  FIRST_PLATFORM,
  heading,
  OVERVIEW_THETA,
  PLAZA_AHEAD,
  PLAZA_LATERAL,
} from "./track";

export type Look = "ahead" | "cell" | "train" | "hero";
/**
 * `theta` is the camera's angle round the engine from the direction of travel: 0 in front, π
 * straight behind, positive on the left of the rail.
 */
export type Shot = { theta: number; radius: number; height: number; fov: number; look: Look };

export const SHOTS = {
  /** Behind Cell, into the screen. */
  RIDE: { theta: Math.PI, radius: 4.6, height: 2.4, fov: 56, look: "ahead" },
  /** Overhead at the isometric angle, following the train. */
  OVER: { theta: Math.PI * 0.75, radius: 15, height: 8.7, fov: 34, look: "train" },
  /** Low and close beside the train, wheels at eye level. */
  SIDE: { theta: Math.PI * 0.56, radius: 5.6, height: 1.2, fov: 50, look: "train" },
  /** The landing's angle on a station: 45 degrees round, 30 up, far away through a long lens. */
  // Ahead of the train and to the side, looking back across the rail: Cell faces the camera with
  // the hero over its shoulder, and the camera stands over the station still to come, which has
  // nothing built yet.
  ISO: { theta: Math.PI * 0.25, radius: 19.5, height: 11.3, fov: 22, look: "hero" },
  /** hello: from the front and a little to the side, Cell and the platform board in frame. */
  HELLO: { theta: 1.0, radius: 3.2, height: 1.9, fov: 56, look: "cell" },
} as const satisfies Record<string, Shot>;

/** Where Cell sits on the engine, from its nose. */
const CELL_SEAT = -0.35;
const MIDDLE_MIN_SECONDS = 2.2;
const CITY_FOV = 34;
const CITY_MARGIN = 0.06;
/** The frame height the shots' lenses are written for (16:9). */
const REFERENCE_HEIGHT = 1080;

/** A camera described the way the shots are: round a point on the rail. */
type Pose = {
  /** The point the camera orbits and the heading its angle is measured from. */
  anchor: V3;
  heading: number;
  theta: number;
  radius: number;
  height: number;
  fov: number;
  look: V3;
  /** 1 for the shot behind Cell, where the camera sways with the ride. */
  ride: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V3, b: V3, t: number): V3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const logLerp = (a: number, b: number, t: number) => Math.exp(lerp(Math.log(a), Math.log(b), t));

/** The centre of a stop's hero: its plaza, or for closing the board at the buffers. */
/** The shot a station rests on. */
export function stationShot(_stop: RideStop): Shot {
  return SHOTS.ISO;
}

function heroPoint(stop: RideStop): V3 {
  if (stop.plaza) return at(stop.s + PLAZA_AHEAD, stop.side * PLAZA_LATERAL, 3.4);
  return at(stop.s - 5.6, 0, 4.0);
}

function lookPoint(look: Look, trainS: number, stop: RideStop): V3 {
  switch (look) {
    case "ahead":
      return at(trainS + 7, 0, 1.0);
    case "cell":
      return at(trainS + CELL_SEAT, 0, 1.2);
    case "train":
      return at(trainS - 1, 0, 0.8);
    case "hero":
      return lerpV(at(trainS, 0, 1.2), heroPoint(stop), 0.55);
  }
}

/**
 * The lens for this frame. On the ride the narrower layouts get a wider lens, so the rail ahead
 * fills the frame. At a station every format gets the same focal length in pixels as 16:9, so a
 * printed number is the same size on screen whatever the format (spec "How big printed text must
 * be"); in between the two blend.
 */
function lens(fov: number, frame: Frame): number {
  const station = Math.max(
    0,
    Math.min(1, (SHOTS.RIDE.fov - fov) / (SHOTS.RIDE.fov - SHOTS.ISO.fov)),
  );
  const family = layoutForSize(frame.width, frame.height);
  const ride = fov * (family === "portrait" ? 1.42 : family === "compact" ? 1.15 : 1);
  const tall = frame.height / REFERENCE_HEIGHT;
  const sameFocal = (2 * Math.atan(tall * Math.tan(((fov / 2) * Math.PI) / 180)) * 180) / Math.PI;
  return ride + (sameFocal - ride) * station;
}

/** A shot taken round the train at `trainS`. `side` mirrors it across the rail. */
function shotPose(shot: Shot, trainS: number, stop: RideStop, side: 1 | -1): Pose {
  return {
    anchor: at(trainS),
    heading: heading(trainS),
    // A plaza on the right puts the camera on the left (positive theta), and the other way round.
    theta: shot === SHOTS.RIDE || shot === SHOTS.HELLO ? shot.theta : shot.theta * side,
    radius: shot.radius,
    height: shot.height,
    fov: shot.fov,
    look: lookPoint(shot.look, trainS, stop),
    ride: shot === SHOTS.RIDE ? 1 : 0,
  };
}

function poseCamera(pose: Pose, frame: Frame): RideCamera {
  const a = pose.heading + pose.theta;
  return {
    pos: [
      pose.anchor[0] + Math.cos(a) * pose.radius,
      pose.anchor[1] + Math.sin(a) * pose.radius,
      pose.height,
    ],
    look: pose.look,
    fov: lens(pose.fov, frame),
  };
}

/** The overview: high above the middle of the rail, pulled out until both ends are in frame. */
function cityPose(stops: readonly RideStop[], frame: Frame): Pose {
  const end = (stops.at(-1)?.s ?? FIRST_PLATFORM) + 4;
  const middle = (FIRST_PLATFORM + end) / 2;
  const pose: Pose = {
    anchor: at(middle),
    heading: 0,
    theta: OVERVIEW_THETA[layoutForSize(frame.width, frame.height)],
    radius: 30,
    height: 30 * 0.75,
    fov: CITY_FOV,
    look: at(middle),
    ride: 0,
  };
  const inside = (p: V3) => {
    const s = projectPoint(p, poseCamera(pose, frame), frame);
    if (!s) return false;
    const mx = frame.width * CITY_MARGIN;
    const my = frame.height * CITY_MARGIN;
    return s[0] > mx && s[0] < frame.width - mx && s[1] > my && s[1] < frame.height - my;
  };
  // Both ends of the rail, the squares beside it, and the billboard from foot to top.
  const layout = layoutForSize(frame.width, frame.height);
  const ends = [
    at(FIRST_PLATFORM),
    at(end),
    at(middle, 8),
    at(middle, -8),
    ...billboardAt(middle, layout).corners,
  ];
  while (!ends.every(inside) && pose.radius < 600) {
    pose.radius *= 1.06;
    pose.height = pose.radius * 0.75;
  }
  return pose;
}

/** Where the hero and Cell may sit in the frame at a stop, as shares of its height and width. */
const HERO_TOP = 0.07;
const CELL_LOW = 0.9;
const SIDE_MARGIN = 0.04;
/** How much closer or further than the shot's own distance the fit may go. */
const NEAREST = 0.55;
const FURTHEST = 2.2;

/**
 * The isometric shot on a station, fitted to its hero. The camera looks at the middle of what
 * must be in frame (the hero's top and Cell) and comes as close as it can while the hero's top,
 * its sides and Cell all stay inside the frame, so printed numbers are as large as the frame
 * allows whatever the data and the format. The fit is made for the train at rest and reused
 * while it pulls in, so the shot does not drift.
 */
function stationPose(stop: RideStop, trainS: number, frame: Frame): Pose {
  const base = shotPose(stationShot(stop), stop.s, stop, stop.side);
  const centre = heroPoint(stop);
  const top: V3 = [centre[0], centre[1], (stop.heroTop ?? 3.4) + 0.2];
  const cell = at(stop.s + CELL_SEAT, 0, 0.6);
  // The hero's own outermost corners when known, else a ring round the plaza.
  const ring: V3[] =
    stop.heroEdge && stop.heroEdge.length > 0
      ? stop.heroEdge
      : Array.from({ length: 8 }, (_, k): V3 => {
          const a = (k / 8) * Math.PI * 2;
          return [centre[0] + Math.cos(a) * 5, centre[1] + Math.sin(a) * 5, 1];
        });
  const seat = [-0.8, 0.8].map((d) => at(stop.s + CELL_SEAT + d, 0, 0.6));
  const measure = (pose: Pose) => {
    const cam = poseCamera(pose, frame);
    // The highest point on screen: the hero's top over its centre, or a far corner that stands higher in the picture.
    const tops = [top, ...ring].map((p) => projectPoint(p, cam, frame));
    const a = tops.reduce(
      (high, p) => (p && (!high || p[1] < high[1]) ? p : high),
      tops[0] ?? null,
    );
    // The lowest point on screen: Cell, or a part of the hero that stands lower in the picture.
    const b = [...tops, projectPoint(cell, cam, frame)].reduce(
      (low, p) => (p && (!low || p[1] > low[1]) ? p : low),
      null,
    );
    // Cell counts among what must stay between the sides, with room for the engine round it.
    const xs = [...ring, ...seat].map((p) => projectPoint(p, cam, frame)?.[0] ?? Number.NaN);
    if (!a || !b || xs.some(Number.isNaN)) return null;
    return {
      span: (b[1] - a[1]) / frame.height,
      middle: (a[1] + b[1]) / 2 / frame.height,
      perUnit: Math.abs(b[1] - a[1]) / Math.max(0.5, top[2] - cell[2]),
      left: Math.min(...xs) / frame.width,
      right: Math.max(...xs) / frame.width,
    };
  };
  const target = (HERO_TOP + CELL_LOW) / 2;
  const room = CELL_LOW - HERO_TOP;
  let rest = base;
  for (let i = 0; i < 200; i++) {
    const m = measure(rest);
    if (!m) break;
    const scale = rest.radius / base.radius;
    const tooBig = m.span > room || m.left < SIDE_MARGIN || m.right > 1 - SIDE_MARGIN;
    const roomy = m.span < room * 0.94 && m.left > SIDE_MARGIN * 2 && m.right < 1 - SIDE_MARGIN * 2;
    const offCentre = (m.left + m.right) / 2 - 0.5;
    if (Math.abs(offCentre) > 0.01) {
      // Turn the camera toward the side the hero leans to, so both its sides have the same room.
      const cam = poseCamera(rest, frame);
      const dx = cam.look[0] - cam.pos[0];
      const dy = cam.look[1] - cam.pos[1];
      const flat = Math.hypot(dx, dy) || 1;
      const shift = (offCentre * frame.width) / m.perUnit;
      rest = {
        ...rest,
        look: [
          rest.look[0] + (dy / flat) * shift,
          rest.look[1] - (dx / flat) * shift,
          rest.look[2],
        ],
      };
    } else if (tooBig && scale < FURTHEST) {
      rest = { ...rest, radius: rest.radius * 1.02, height: rest.height * 1.02 };
    } else if (roomy && scale > NEAREST) {
      rest = { ...rest, radius: rest.radius / 1.015, height: rest.height / 1.015 };
    } else if (Math.abs(m.middle - target) > 0.004) {
      // Looking at a higher point moves the picture down the frame, and the other way round.
      const z = rest.look[2] + ((target - m.middle) * frame.height) / m.perUnit;
      rest = { ...rest, look: [rest.look[0], rest.look[1], z] };
    } else break;
  }
  const now = shotPose(stationShot(stop), trainS, stop, stop.side);
  // While the train pulls in, the look point keeps the offset the fit found for the train at rest.
  const moved: V3 = [
    now.look[0] + (rest.look[0] - base.look[0]),
    now.look[1] + (rest.look[1] - base.look[1]),
    rest.look[2],
  ];
  return {
    ...now,
    radius: rest.radius,
    height: rest.height,
    look: trainS === stop.s ? rest.look : moved,
  };
}

function restPose(stop: RideStop, stops: readonly RideStop[], frame: Frame): Pose {
  return restPoseAt(stop, stops, frame, stop.s);
}

/** The camera at a stop's rest frame, for this frame's size. */
export function restCamera(stop: RideStop, stops: readonly RideStop[], frame: Frame): RideCamera {
  return poseCamera(restPose(stop, stops, frame), frame);
}

/**
 * Behind the engine is π or -π: the same place. Between two poses the angle must not swing round
 * the front, so a pose that is straight behind takes the sign of the pose it blends with.
 */
function behindLike(theta: number, other: number): number {
  return Math.abs(Math.abs(theta) - Math.PI) < 1e-9 ? Math.PI * (other < 0 ? -1 : 1) : theta;
}

function blend(a: Pose, b: Pose, t: number): Pose {
  const thetaA = behindLike(a.theta, b.theta);
  const thetaB = behindLike(b.theta, thetaA);
  return {
    anchor: lerpV(a.anchor, b.anchor, t),
    heading: lerp(a.heading, b.heading, t),
    theta: lerp(thetaA, thetaB, t),
    radius: logLerp(a.radius, b.radius, t),
    height: logLerp(a.height, b.height, t),
    fov: logLerp(a.fov, b.fov, t),
    look: lerpV(a.look, b.look, t),
    ride: lerp(a.ride, b.ride, t),
  };
}

export function rideCamera(
  frameIndex: number,
  stops: readonly RideStop[],
  timeline: RideTimeline,
  frame: Frame,
): { cam: RideCamera; roll: number; riding: boolean; speed: number } {
  const trainS = trainAt(frameIndex, stops, timeline);
  const speed = Math.abs(trainAt(frameIndex + 1, stops, timeline) - trainS);

  // The stop the camera is heading for: the first whose frame has not passed.
  let to = stops.findIndex((_, i) => frameIndex < (timeline.stopFrames[i] ?? 0));
  if (to === -1) to = stops.length;
  const from = stops[to - 1] ?? stops[0];
  const dest = stops[to];
  const arrive = timeline.stopFrames[to] ?? 0;
  const move = timeline.moveFrames[to] ?? 0;
  const start = arrive - move;

  let pose: Pose;
  if (!from) {
    pose = shotPose(SHOTS.RIDE, trainS, stops[0] as RideStop, 1);
  } else if (!dest || frameIndex <= start || move === 0) {
    pose = restPose(from, stops, frame);
  } else {
    // One glide from the shot it rests on to the next one's, round the train as it goes. The
    // camera used to turn behind the train to ride with it, pass through a shot in the middle
    // of the move and turn back out: with the stations close together that was four changes of
    // direction in under three seconds.
    const keys: { at: number; pose: Pose }[] = [
      { at: 0, pose: restPoseAt(from, stops, frame, trainS) },
      { at: 1, pose: restPoseAt(dest, stops, frame, trainS) },
    ];
    const u = (frameIndex - start) / move;
    const k = Math.max(0, keys.findIndex((key) => key.at > u) - 1);
    const a = keys[k] as { at: number; pose: Pose };
    const b = keys[k + 1] ?? a;
    pose = blend(a.pose, b.pose, b.at === a.at ? 1 : easeInOutCubic((u - a.at) / (b.at - a.at)));
  }

  // The ride itself: a sway, a bump at each rail joint and a roll into the bends, all fading out
  // as the camera leaves the seat behind Cell or the train slows, so nothing jumps.
  const feel = pose.ride * Math.min(1, speed * 4);
  const sway = Math.sin((frameIndex / 62) * Math.PI * 2);
  pose = {
    ...pose,
    theta: pose.theta + sway * 0.2 * feel,
    height:
      pose.height +
      (Math.sin((frameIndex / 86) * Math.PI * 2) * 0.25 +
        Math.abs(Math.sin(trainS * Math.PI * 1.4)) * speed * 0.12) *
        feel,
  };
  const roll = (sway * -2.2 + (heading(trainS + 5) - heading(trainS)) * -14) * feel;
  return { cam: poseCamera(pose, frame), roll: roll === 0 ? 0 : roll, riding: feel > 0.5, speed };
}

/** A stop's rest pose while the train is still on its way: the same shot, round where the train is now. */
function restPoseAt(
  stop: RideStop,
  stops: readonly RideStop[],
  frame: Frame,
  trainS: number,
): Pose {
  if (stop.kind === "city") return cityPose(stops, frame);
  if (stop.kind === "hello") return shotPose(SHOTS.HELLO, trainS, stop, 1);
  return stationPose(stop, trainS, frame);
}
