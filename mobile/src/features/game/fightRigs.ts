import type { ImageSourcePropType } from "react-native";

type Point = readonly [number, number];
export type HandGeometry = { shoulder: Point; ball: Point };
type Limb = { source: ImageSourcePropType; pivot: Point };
/** One whole-body throw pose, split at the waist so the upper half also plays over the jump legs. */
export type ThrowPose = { upper: ImageSourcePropType; lower: ImageSourcePropType; ball: Point };
export type FightRig = {
  body: ImageSourcePropType; armDown: ImageSourcePropType; armUp: ImageSourcePropType;
  legLeft: Limb; legRight: Limb; legsJump: ImageSourcePropType; hand: HandGeometry;
  /** Cock, release, follow-through, recover (PR #189). A rig without them throws with the single raised arm. */
  throw?: readonly [ThrowPose, ThrowPose, ThrowPose, ThrowPose];
};

/**
 * The whole-body throw's timing in seconds, as drawn: cock starts this long before the ball leaves,
 * then release, follow-through and recover run back to back from the moment it leaves.
 */
export const THROW_COCK = .14;
export const THROW_ENDS = [.08, .23, .36] as const;
/** Which throw pose shows now: 0–3, or -1 for the standing pose. */
export function throwPose(now: number, throwAt: number, nextThrowAt: number) {
  "worklet";
  const after = now - throwAt;
  if (after >= 0 && after < THROW_ENDS[2]) return after < THROW_ENDS[0] ? 1 : after < THROW_ENDS[1] ? 2 : 3;
  return nextThrowAt - now <= THROW_COCK ? 0 : -1;
}

// Paths were checked in design/art/_checks/fight-player-assets.json. Coordinates are
// from the corresponding assembled masters in design/art/manifest.json (1024 px).
export const RIG_CANVAS = 1024;
export const RIG_FEET = 900;
export const RIG_WIDTH = .46;
export const RELEASE_ANGLE = -15;

const rigs: Record<string, FightRig> = {
  "01": {
    body: require("../../../../public/art/characters/fight-01-body.webp"),
    armDown: require("../../../../public/art/characters/fight-01-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-01-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-01-leg-left.webp"), pivot: [480, 531] },
    legRight: { source: require("../../../../public/art/characters/fight-01-leg-right.webp"), pivot: [551, 531] },
    legsJump: require("../../../../public/art/characters/fight-01-legs-jump.webp"),
    hand: { shoulder: [566, 393], ball: [604, 119] },
    throw: [
      { upper: require("../../../../public/art/characters/fight-01-throw-1-upper.webp"), lower: require("../../../../public/art/characters/fight-01-throw-1-lower.webp"), ball: [658, 264] },
      { upper: require("../../../../public/art/characters/fight-01-throw-2-upper.webp"), lower: require("../../../../public/art/characters/fight-01-throw-2-lower.webp"), ball: [530, 219] },
      { upper: require("../../../../public/art/characters/fight-01-throw-3-upper.webp"), lower: require("../../../../public/art/characters/fight-01-throw-3-lower.webp"), ball: [377, 616] },
      { upper: require("../../../../public/art/characters/fight-01-throw-4-upper.webp"), lower: require("../../../../public/art/characters/fight-01-throw-4-lower.webp"), ball: [642, 608] },
    ],
  },
  "02": {
    body: require("../../../../public/art/characters/fight-02-body.webp"),
    armDown: require("../../../../public/art/characters/fight-02-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-02-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-02-leg-left.webp"), pivot: [480, 570] },
    legRight: { source: require("../../../../public/art/characters/fight-02-leg-right.webp"), pivot: [545, 570] },
    legsJump: require("../../../../public/art/characters/fight-02-legs-jump.webp"),
    hand: { shoulder: [560, 393], ball: [600, 176] },
  },
  "03": {
    body: require("../../../../public/art/characters/fight-03-body.webp"),
    armDown: require("../../../../public/art/characters/fight-03-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-03-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-03-leg-left.webp"), pivot: [475, 550] },
    legRight: { source: require("../../../../public/art/characters/fight-03-leg-right.webp"), pivot: [544, 550] },
    legsJump: require("../../../../public/art/characters/fight-03-legs-jump.webp"),
    hand: { shoulder: [561, 400], ball: [601, 163] },
  },
  "04": {
    body: require("../../../../public/art/characters/fight-04-body.webp"),
    armDown: require("../../../../public/art/characters/fight-04-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-04-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-04-leg-left.webp"), pivot: [479, 536] },
    legRight: { source: require("../../../../public/art/characters/fight-04-leg-right.webp"), pivot: [551, 536] },
    legsJump: require("../../../../public/art/characters/fight-04-legs-jump.webp"),
    hand: { shoulder: [572, 344], ball: [614, 119] },
  },
  "05": {
    body: require("../../../../public/art/characters/fight-05-body.webp"),
    armDown: require("../../../../public/art/characters/fight-05-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-05-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-05-leg-left.webp"), pivot: [478, 556] },
    legRight: { source: require("../../../../public/art/characters/fight-05-leg-right.webp"), pivot: [546, 556] },
    legsJump: require("../../../../public/art/characters/fight-05-legs-jump.webp"),
    hand: { shoulder: [557, 405], ball: [598, 176] },
  },
  "06": {
    body: require("../../../../public/art/characters/fight-06-body.webp"),
    armDown: require("../../../../public/art/characters/fight-06-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-06-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-06-leg-left.webp"), pivot: [475, 516] },
    legRight: { source: require("../../../../public/art/characters/fight-06-leg-right.webp"), pivot: [549, 516] },
    legsJump: require("../../../../public/art/characters/fight-06-legs-jump.webp"),
    hand: { shoulder: [564, 365], ball: [602, 122] },
  },
  "07": {
    body: require("../../../../public/art/characters/fight-07-body.webp"),
    armDown: require("../../../../public/art/characters/fight-07-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-07-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-07-leg-left.webp"), pivot: [477, 548] },
    legRight: { source: require("../../../../public/art/characters/fight-07-leg-right.webp"), pivot: [545, 548] },
    legsJump: require("../../../../public/art/characters/fight-07-legs-jump.webp"),
    hand: { shoulder: [559, 406], ball: [597, 174] },
  },
  "08": {
    body: require("../../../../public/art/characters/fight-08-body.webp"),
    armDown: require("../../../../public/art/characters/fight-08-arm-down.webp"),
    armUp: require("../../../../public/art/characters/fight-08-arm-up.webp"),
    legLeft: { source: require("../../../../public/art/characters/fight-08-leg-left.webp"), pivot: [475, 538] },
    legRight: { source: require("../../../../public/art/characters/fight-08-leg-right.webp"), pivot: [546, 538] },
    legsJump: require("../../../../public/art/characters/fight-08-legs-jump.webp"),
    hand: { shoulder: [561, 378], ball: [601, 134] },
  },
};

export function fightRigFor(avatar: unknown): FightRig {
  const choice = avatar as { set?: string; id?: string } | null;
  return (choice?.set === "illus" && choice.id && Object.hasOwn(rigs, choice.id) && rigs[choice.id]) || rigs["01"];
}

export function fightHandPoint(hand: HandGeometry, angle: number) {
  "worklet";
  const theta = angle * Math.PI / 180;
  const dx = hand.ball[0] - hand.shoulder[0];
  const dy = hand.ball[1] - hand.shoulder[1];
  return [hand.shoulder[0] + dx * Math.cos(theta) - dy * Math.sin(theta),
    hand.shoulder[1] + dx * Math.sin(theta) + dy * Math.cos(theta)] as const;
}
