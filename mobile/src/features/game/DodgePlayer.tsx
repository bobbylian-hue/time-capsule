import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { FightShadow } from "./DodgeEffects";
import { GROUND, INVULNERABLE, type FightFrame } from "./dodgeFightRules";
import { RELEASE_ANGLE, RIG_CANVAS, RIG_FEET, RIG_WIDTH, throwPose, type FightRig, type ThrowPose } from "./fightRigs";

type Pose = { size: number; motion: SharedValue<FightFrame>; reduced: boolean };

function StandingLeg({ leg, direction, size, motion, reduced, whole }: Pose & { leg: FightRig["legLeft"]; direction: number; whole: boolean }) {
  const pose = useAnimatedStyle(() => {
    const { jump, now, throwAt, nextThrowAt } = motion.value;
    const throwing = whole && throwPose(now, throwAt, nextThrowAt) >= 0;
    return {
      opacity: jump > 0 || throwing ? 0 : 1,
      transform: [{ rotate: `${reduced ? 0 : motion.value.moving * direction * 7}deg` }],
    };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, {
    transformOrigin: [size * leg.pivot[0] / RIG_CANVAS, size * leg.pivot[1] / RIG_CANVAS, 0],
  }, pose]}>
    <Image source={leg.source} resizeMode="contain" style={styles.layer} />
  </Animated.View>;
}

/**
 * One whole-body throw pose. All four stay mounted and decoded for the whole fight and only the current one is
 * visible: swapping one image's source four times in half a second skipped frames that hadn't decoded yet.
 */
function ThrowLayer({ pose, index, part, motion }: { pose: ThrowPose; index: number; part: "upper" | "lower"; motion: SharedValue<FightFrame> }) {
  const style = useAnimatedStyle(() => {
    const { now, throwAt, nextThrowAt, jump } = motion.value;
    const on = throwPose(now, throwAt, nextThrowAt) === index && (part === "upper" || jump === 0);
    return { opacity: on ? 1 : 0 };
  });
  return <Animated.Image source={pose[part]} resizeMode="contain" style={[styles.layer, style]} />;
}

export function DodgePlayer({ figure, width, height, motion, reduced }: {
  figure: FightRig; width: number; height: number; motion: SharedValue<FightFrame>; reduced: boolean;
}) {
  const size = width * RIG_WIDTH;
  const feet = size * RIG_FEET / RIG_CANVAS;
  const whole = !!figure.throw;
  const player = useAnimatedStyle(() => {
    const { x, now, jump, hurtAt } = motion.value;
    const blinking = now - hurtAt < INVULNERABLE;
    return {
      opacity: blinking && (reduced || Math.floor(now * 14) % 2) ? .4 : 1,
      transform: [{ translateX: x * width - size / 2 }, { translateY: -jump * height * .17 }],
    };
  });
  const shadow = useAnimatedStyle(() => ({
    transform: [{ translateX: (motion.value.x - .085) * width }, { scale: 1 - motion.value.jump * .45 }],
  }));
  const jumpLegs = useAnimatedStyle(() => ({ opacity: motion.value.jump > 0 ? 1 : 0 }));
  // The standing upper body (arm down + body) hides while a whole-body pose shows.
  const resting = useAnimatedStyle(() => {
    const { now, throwAt, nextThrowAt } = motion.value;
    const pose = throwPose(now, throwAt, nextThrowAt);
    return { opacity: whole ? (pose >= 0 ? 0 : 1) : 1 };
  });
  // A rig without throw art keeps the single raised arm: up from the cock, swinging through the release.
  const armDown = useAnimatedStyle(() => {
    const { now, throwAt, nextThrowAt } = motion.value;
    return { opacity: !whole && throwPose(now, throwAt, nextThrowAt) >= 0 ? 0 : 1 };
  });
  const armUp = useAnimatedStyle(() => {
    const { now, throwAt, nextThrowAt } = motion.value;
    const pose = whole ? -1 : throwPose(now, throwAt, nextThrowAt);
    const follow = Math.min(1, Math.max(0, (now - throwAt) / .36));
    const angle = pose === 0 ? RELEASE_ANGLE : RELEASE_ANGLE - 12 * follow;
    return { opacity: pose >= 0 ? 1 : 0, transform: [{ rotate: `${reduced ? 0 : angle}deg` }] };
  });

  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[styles.shadow, {
      width: width * .17, top: height * .847, height: height * .036,
    }, shadow]}><FightShadow kind="player" /></Animated.View>
    <Animated.View style={[styles.figure, {
      width: size, height: size, top: height * GROUND - feet,
    }, player]}>
      <StandingLeg leg={figure.legLeft} direction={-1} size={size} motion={motion} reduced={reduced} whole={whole} />
      <StandingLeg leg={figure.legRight} direction={1} size={size} motion={motion} reduced={reduced} whole={whole} />
      <Animated.Image source={figure.legsJump} resizeMode="contain" style={[styles.layer, jumpLegs]} />
      {figure.throw?.map((pose, index) => <ThrowLayer key={`l${index}`} pose={pose} index={index} part="lower" motion={motion} />)}
      <Animated.View style={[StyleSheet.absoluteFill, resting]}>
        <Animated.Image source={figure.armDown} resizeMode="contain" style={[styles.layer, armDown]} />
        {!whole && <Animated.View style={[StyleSheet.absoluteFill, {
          transformOrigin: [size * figure.hand.shoulder[0] / RIG_CANVAS, size * figure.hand.shoulder[1] / RIG_CANVAS, 0],
        }, armUp]}>
          <Image source={figure.armUp} resizeMode="contain" style={styles.layer} />
        </Animated.View>}
        <Image source={figure.body} resizeMode="contain" style={styles.layer} />
      </Animated.View>
      {figure.throw?.map((pose, index) => <ThrowLayer key={`u${index}`} pose={pose} index={index} part="upper" motion={motion} />)}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  shadow: { position: "absolute", left: 0 },
  figure: { position: "absolute", left: 0 },
  layer: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
});
