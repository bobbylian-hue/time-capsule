import React from "react";
import { Animated as RNAnimated, Image, Platform, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { gameArt, vesselParts } from "../../art/manifest";
import { crackOverlays } from "../../art/crackOverlays";
import type { VesselKind } from "../../components/Vessel";
import type { BallKind } from "../../services/game";
import { C, sans, serif } from "../../theme";
import { BOSS_Y, FLIGHT, GROUND, LANES, type Attack, type FightFrame, type Flight } from "./dodgeFightRules";
import { fightHandPoint, RELEASE_ANGLE, RIG_CANVAS, RIG_FEET, RIG_WIDTH, throwPose, type FightRig } from "./fightRigs";
import { RestoreLightBurst } from "./RestoreResult";

type Scene = { width: number; height: number; motion: SharedValue<FightFrame>; reduced: boolean };
const lerp = (a: number, b: number, t: number) => {
  "worklet";
  return a + (b - a) * t;
};

export function FightShadow({ kind }: { kind: "boss" | "player" }) {
  const id = `fight-${kind}-shadow`;
  const opacity = kind === "boss" ? .16 : .2;
  return <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={C.ink} stopOpacity={opacity} />
        <Stop offset=".42" stopColor={C.ink} stopOpacity={opacity * .72} />
        <Stop offset="1" stopColor={C.ink} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={50} cy={50} r={50} fill={`url(#${id})`} />
  </Svg>;
}

function Glow({ warning = false }: { warning?: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 100 100">
    <Defs>
      <RadialGradient id={warning ? "bossGlow" : "heldGlow"} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={warning ? C.plum : "#FFF4D6"} stopOpacity={.92} />
        <Stop offset=".42" stopColor={warning ? C.plum : C.brass} stopOpacity={.55} />
        <Stop offset="1" stopColor={warning ? C.ink : C.brass} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={50} cy={50} r={50} fill={warning ? "url(#bossGlow)" : "url(#heldGlow)"} />
  </Svg>;
}

const PRAISE_COLORS = [C.wax, C.blue, "#9A7430"];

export function FightBoss({ width, height, motion, reduced, vessel, health, warning, damage, praise, burst, finishTime }: Scene & {
  vessel: string; health: number; warning: Attack | null; damage: number; praise: { text: string; index: number } | null;
  burst: RNAnimated.Value; finishTime: SharedValue<number>;
}) {
  const size = width * .36;
  const source = vesselParts[vessel as VesselKind]?.assembled;
  const cracks = crackOverlays[vessel];
  const pose = useAnimatedStyle(() => {
    const { now, hitAt } = motion.value;
    const hit = now - hitAt;
    const shakes = hit < .25 ? Math.sin(hit * 120) * (1 - hit / .25) * width * .015 : 0;
    const preparing = warning && now < warning.at + warning.warning;
    return { transform: [
      { translateX: reduced ? 0 : shakes },
      { translateY: reduced ? 0 : Math.sin(now * 2.2) * height * .008 },
      { scale: !reduced && preparing ? 1 + .03 * Math.sin(now * 18) : 1 },
    ] };
  });
  const glow = useAnimatedStyle(() => {
    const now = motion.value.now;
    const preparing = warning && now < warning.at + warning.warning;
    return { opacity: preparing ? (reduced ? .65 : .55 + .45 * Math.sin(now * 18)) : 0 };
  });
  const dust = useAnimatedStyle(() => {
    const progress = Math.min(1, (motion.value.now + finishTime.value - motion.value.hitAt) / .5);
    return { opacity: 1 - progress, transform: [{ scale: .7 + progress * .6 }] };
  });
  const floating = useAnimatedStyle(() => {
    const progress = Math.min(1, (motion.value.now + finishTime.value - motion.value.hitAt) / .7);
    return { opacity: Math.min(1, (1 - progress) / .3), transform: [{ translateY: reduced ? 0 : -progress * height * .06 }] };
  });
  const word = useAnimatedStyle(() => {
    const progress = Math.min(1, (motion.value.now + finishTime.value - motion.value.hitAt) / .85);
    const pop = progress < .12 ? lerp(.6, 1.15, progress / .12) : progress < .22 ? lerp(1.15, 1, (progress - .12) / .1) : 1;
    return {
      opacity: progress < .08 ? progress / .08 : Math.min(1, (1 - progress) / .3),
      transform: reduced ? [] : [{ translateY: -progress * height * .05 }, { scale: pop }],
    };
  });
  const darken = Platform.OS === "web"
    ? ({ filter: "saturate(.55) brightness(.8)" } as object) : { tintColor: C.ink, opacity: .3 };
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={{ position: "absolute", left: "35%", width: "30%", height: "4.5%", top: `${(BOSS_Y + .1025) * 100}%` }}>
      <FightShadow kind="boss" />
    </View>
    <View style={{ position: "absolute", top: height * BOSS_Y - size / 2, width: "100%", height: size, alignItems: "center" }}>
      {!reduced && <RestoreLightBurst size={size} burst={burst} />}
      <Animated.View style={[{ width: size, height: size }, pose]}>
        <Animated.View style={[{ position: "absolute", top: "-10%", left: "-10%", width: "120%", height: "120%" }, glow]}><Glow warning /></Animated.View>
        {source && <Image source={source} style={styles.layer} resizeMode="contain" />}
        <View style={[StyleSheet.absoluteFill, { opacity: health }]}>
          {source && <Image source={source} style={[styles.layer, darken]} resizeMode="contain" />}
          {cracks && <Image source={cracks} style={styles.layer} resizeMode="contain" />}
        </View>
        {!reduced && <Animated.Image source={gameArt.hitDust} style={[styles.layer, dust]} resizeMode="contain" />}
      </Animated.View>
    </View>
    {damage > 0 && <Animated.Text style={[styles.damage, { top: height * (BOSS_Y - .02) }, floating]}>−{damage}</Animated.Text>}
    {praise && <Animated.Text allowFontScaling={false} style={[styles.praise, { top: height * (BOSS_Y + .13), color: PRAISE_COLORS[praise.index % 3] }, word]}>{praise.text}</Animated.Text>}
  </View>;
}

type BallScene = Scene & { figure: FightRig };
const ballSize = (width: number) => width * .085;
/** The ball in the hand before it's thrown is 20% smaller than the flying ball (Roy, 2026-11-20). */
const HELD_SCALE = .8;

/** A point on the rig (1024 canvas) placed on the stage, for a figure at lane position x and jump height. */
function rigAt(width: number, height: number, x: number, jump: number, point: readonly [number, number]) {
  "worklet";
  const scale = width * RIG_WIDTH / RIG_CANVAS;
  return [x * width + (point[0] - RIG_CANVAS / 2) * scale,
    height * (GROUND - jump * .17) + (point[1] - RIG_FEET) * scale] as const;
}
/** Where the ball sits in the cock pose, and where it leaves the hand on release. */
function heldPoint(figure: FightRig) {
  return figure.throw ? figure.throw[0].ball : fightHandPoint(figure.hand, RELEASE_ANGLE);
}
function releasePoint(figure: FightRig) {
  return figure.throw ? figure.throw[1].ball : fightHandPoint(figure.hand, RELEASE_ANGLE);
}

/** The next ball shows in the hand only during the cock pose, just before it flies. */
export function HeldBall({ width, height, motion, figure, ball }: BallScene & { ball: BallKind }) {
  const size = ballSize(width) * HELD_SCALE;
  const point = heldPoint(figure);
  const style = useAnimatedStyle(() => {
    const { now, x, jump, throwAt, nextThrowAt } = motion.value;
    const [handX, handY] = rigAt(width, height, x, jump, point);
    return {
      opacity: throwPose(now, throwAt, nextThrowAt) === 0 ? 1 : 0,
      transform: [{ translateX: handX - size / 2 }, { translateY: handY - size / 2 }],
    };
  });
  return <Animated.Image pointerEvents="none" source={gameArt.ball[ball]} resizeMode="contain"
    style={[{ position: "absolute", left: 0, top: 0, width: size, height: size }, style]} />;
}

function InFlight({ width, height, motion, reduced, figure, flight, delay = 0 }: BallScene & { flight: Flight; delay?: number }) {
  const size = ballSize(width);
  const point = releasePoint(figure);
  const style = useAnimatedStyle(() => {
    const age = motion.value.now - flight.at - delay;
    const k = Math.max(0, Math.min(1, age / FLIGHT));
    const [startX, startY] = rigAt(width, height, flight.x, 0, point);
    return {
      opacity: age < 0 ? 0 : delay === 0 ? 1 : .36 - delay * 1.6,
      transform: [
        { translateX: lerp(startX, width * .5, k) - size / 2 },
        { translateY: lerp(startY, height * BOSS_Y, k) - Math.sin(Math.PI * k) * height * .16 - size / 2 },
        { scale: lerp(1, .42, k ** .8) },
        { rotate: `${reduced ? 0 : k * 720}deg` },
      ],
    };
  });
  return <Animated.Image source={gameArt.ball[flight.ball]} resizeMode="contain" style={[{ position: "absolute", width: size, height: size }, style]} />;
}

export function PlayerThrow(props: BallScene & { flight: Flight }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {!props.reduced && [.15, .1, .05].map((delay) => <InFlight key={delay} {...props} delay={delay} />)}
    <InFlight {...props} />
  </View>;
}

function AimedShot({ width, height, motion, reduced, attack, lane, warn }: Scene & { attack: Attack; lane: number; warn: string | null }) {
  const x = LANES[lane];
  const ringWidth = width * .26;
  const ringHeight = ringWidth / 2.6;
  const orbSize = width * .09;
  const orbBox = orbSize * 2;
  const triple = attack.kind === "triple";
  const reticle = useAnimatedStyle(() => ({
    opacity: motion.value.now < attack.at + attack.warning ? 1 : .7,
    transform: [{ scale: reduced ? 1 : 1 + (triple ? .1 : .06) * Math.sin(motion.value.now * (triple ? 22 : 16)) }],
  }));
  const orb = useAnimatedStyle(() => {
    const k = Math.max(0, Math.min(1, (motion.value.now - attack.at - attack.warning) / attack.travel));
    return {
      opacity: k > 0 ? 1 : 0,
      transform: [
        { translateX: width * lerp(.5, x, k) - orbBox / 2 },
        { translateY: lerp(height * BOSS_Y, height * GROUND - width * .14, k) - Math.sin(k * Math.PI) * height * .06 - orbBox / 2 },
        { scale: lerp(.6, 1.9, k * k) },
      ],
    };
  });
  return <>
    <Animated.View style={[{ position: "absolute", top: height * GROUND - ringHeight / 2,
      left: width * x - ringWidth / 2, width: ringWidth, height: ringHeight }, reticle]}>
      <Svg width={ringWidth} height={ringHeight}>
        <Ellipse cx={ringWidth / 2} cy={ringHeight / 2} rx={ringWidth / 2 - 2} ry={ringHeight / 2 - 2}
          fill={triple ? "rgba(163,54,79,.3)" : "rgba(163,54,79,.18)"} stroke={C.wax} strokeWidth={triple ? 3.5 : 2.5} strokeDasharray="5 4" />
      </Svg>
      {warn && <View style={styles.warnRow}><Text allowFontScaling={false} numberOfLines={1} style={[styles.warning, { backgroundColor: C.wax }]}>{warn}</Text></View>}
    </Animated.View>
    <Animated.View style={[{ position: "absolute", width: orbBox, height: orbBox }, orb]}>
      <ShotOrb size={orbSize} />
    </Animated.View>
  </>;
}

/** The capsule's shot, as in the demo: a glossy plum orb lit from the top left, a navy edge and a soft plum glow. */
function ShotOrb({ size }: { size: number }) {
  const box = size * 2, c = box / 2, r = size / 2;
  return <Svg width={box} height={box}>
    <Defs>
      <RadialGradient id="shotGlow" cx="50%" cy="50%" r="50%">
        <Stop offset=".4" stopColor={C.plum} stopOpacity={.5} />
        <Stop offset="1" stopColor={C.plum} stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id="shotBody" cx="35%" cy="35%" r="92%" fx="35%" fy="35%">
        <Stop offset="0" stopColor="#8C5B8F" />
        <Stop offset=".45" stopColor="#3B1E3D" />
        <Stop offset=".7" stopColor={C.ink} />
        <Stop offset="1" stopColor={C.ink} />
      </RadialGradient>
    </Defs>
    <Circle cx={c} cy={c} r={c} fill="url(#shotGlow)" />
    <Circle cx={c} cy={c} r={r} fill="url(#shotBody)" stroke="rgba(22,38,63,.6)" strokeWidth={2} />
  </Svg>;
}

/** The demo's jump warning: a striped band across the ground at the player's feet, shown for the whole wave. */
function JumpBand({ width, height, motion, reduced, warn }: Scene & { warn: string }) {
  const pulse = useAnimatedStyle(() => ({ opacity: reduced ? 1 : .75 + .25 * Math.sin(motion.value.now * 16) }));
  return <Animated.View style={[{ position: "absolute", top: height * (GROUND - .055), height: height * .11, width, alignItems: "center",
    justifyContent: "center", borderColor: "rgba(22,38,63,.55)", borderStyle: "dashed", borderTopWidth: 2, borderBottomWidth: 2 }, pulse]}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs><Pattern id="jumpStripe" patternUnits="userSpaceOnUse" width={20} height={20} patternTransform="rotate(45)">
        <Rect width={20} height={20} fill="rgba(22,38,63,.08)" /><Rect width={10} height={20} fill="rgba(22,38,63,.22)" />
      </Pattern></Defs>
      <Rect width="100%" height="100%" fill="url(#jumpStripe)" />
    </Svg>
    <Text allowFontScaling={false} numberOfLines={1} style={[styles.warning, styles.bandText]}>{warn}</Text>
  </Animated.View>;
}

// The spike art (1536 wide): the ground line is row ~632 and the spikes fill rows 470–645.
const SPIKE_CANVAS = 1536, SPIKE_GROUND = 632, SPIKE_TOP = 470, SPIKE_BASE = 645, SPIKE_SPAN = 1.06;
const SPIKE_UP = .12, SPIKE_HOLD = .2, SPIKE_DOWN = .18;

/**
 * The jump attack's hit: spikes burst up from the ground across the stage at the player's feet, hold, then sink.
 * Nothing shows on the ground during the warning (Roy removed the crack). `hitAt` is the coming hit while a
 * jump attack is on; afterwards the frame's spikeAt carries the last hit.
 */
export function JumpSpikes({ width, height, motion, reduced, hitAt }: Scene & { hitAt: number | null }) {
  const span = width * SPIKE_SPAN;
  const scale = span / SPIKE_CANVAS;
  const tall = (SPIKE_BASE - SPIKE_TOP) * scale;
  const top = height * GROUND - (SPIKE_GROUND - SPIKE_TOP) * scale;
  const style = useAnimatedStyle(() => {
    const { now, spikeAt } = motion.value;
    let rise = 0;
    if (hitAt !== null) rise = Math.max(0, Math.min(1, (now - (hitAt - SPIKE_UP)) / SPIKE_UP));
    else {
      const since = now - spikeAt;
      rise = since < SPIKE_HOLD ? 1 : Math.max(0, 1 - (since - SPIKE_HOLD) / SPIKE_DOWN);
    }
    if (reduced) rise = rise > 0 ? 1 : 0;
    return { opacity: rise > 0 ? 1 : 0, transform: [{ translateY: (1 - rise) * tall }] };
  });
  return <View pointerEvents="none" style={{ position: "absolute", left: (width - span) / 2, top, width: span, height: tall, overflow: "hidden" }}>
    <Animated.Image source={gameArt.jumpSpikes} resizeMode="stretch"
      style={[{ position: "absolute", left: 0, top: -SPIKE_TOP * scale, width: span, height: span * 1024 / SPIKE_CANVAS }, style]} />
  </View>;
}

export function FightAttack(props: Scene & { attack: Attack; label: string; warn: string }) {
  const { label, warn, ...scene } = props;
  return <View pointerEvents="none" accessible accessibilityLiveRegion="assertive" accessibilityLabel={label} style={StyleSheet.absoluteFill}>
    {scene.attack.kind === "wave" ? <JumpBand {...scene} warn={warn} />
      // A triple can't be dodged, so it shows one "brace" pill in the middle instead of three "move" pills.
      : scene.attack.lanes.map((lane) => <AimedShot key={lane} {...scene} lane={lane}
        warn={scene.attack.kind !== "triple" || lane === 1 ? warn : null} />)}
  </View>;
}

/** 「被打中了」 rises from the player when an attack lands. */
export function HurtText({ width, height, motion, reduced, finishTime, text }: Scene & { finishTime: SharedValue<number>; text: string }) {
  const style = useAnimatedStyle(() => {
    const { now, hurtAt, x, jump } = motion.value;
    const progress = Math.min(1, (now + finishTime.value - hurtAt) / .9);
    return {
      opacity: progress < .06 ? progress / .06 : Math.max(0, (1 - progress) / .35),
      transform: [
        { translateX: x * width - width * .25 },
        { translateY: height * (GROUND - .3 - jump * .17) - (reduced ? 0 : progress * height * .05) },
      ],
    };
  });
  return <Animated.Text pointerEvents="none" allowFontScaling={false} style={[styles.hurt, { width: width * .5 }, style]}>{text}</Animated.Text>;
}

export function HitEdge({ motion, finishTime }: { motion: SharedValue<FightFrame>; finishTime: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - (motion.value.now + finishTime.value - motion.value.hurtAt) / .24) }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 8, borderColor: "rgba(163,54,79,.75)" }, style]} />;
}

const styles = StyleSheet.create({
  warnRow: { position: "absolute", top: -24, left: -40, right: -40, alignItems: "center" },
  warning: { fontFamily: sans, fontSize: 12, fontWeight: "700", color: C.white, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden", borderRadius: 20 },
  bandText: { fontSize: 14, paddingHorizontal: 12, backgroundColor: C.ink },
  layer: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  damage: { position: "absolute", width: "100%", textAlign: "center", fontFamily: serif, fontSize: 18, fontWeight: "700", color: C.white,
    textShadowColor: C.plum, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  praise: { position: "absolute", width: "100%", textAlign: "center", fontFamily: serif, fontSize: 28, fontWeight: "700",
    textShadowColor: "rgba(255,255,255,.95)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  hurt: { position: "absolute", left: 0, top: 0, textAlign: "center", fontFamily: serif, fontSize: 22, fontWeight: "700", color: C.wax,
    textShadowColor: "rgba(255,255,255,.95)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
});
