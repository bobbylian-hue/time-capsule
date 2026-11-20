import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, AppState, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArtIcon } from "../../components/ArtIcon";
import { haptics } from "../../components/haptics";
import { useLanguage } from "../../i18n";
import { dodgeFights, game, GameError, type DodgeSession, type DodgeTarget } from "../../services/game";
import { C, sans, serif, shadows } from "../../theme";
import { useReducedMotion } from "../../useReducedMotion";
import { VESSELS } from "../shop/strings";
import { BOSS_Y, DodgeFight, dragLane, fightHealth, GROUND, initialFrame, isFlick, LIVES, type DodgeInput, type FightFrame } from "./dodgeFightRules";
import { FightAttack, FightBoss, HeldBall, HitEdge, HurtText, JumpSpikes, PlayerThrow } from "./DodgeEffects";
import { DodgePlayer } from "./DodgePlayer";
import { fightRigFor } from "./fightRigs";
import fightStrings from "./dodgeStrings";
import { noWebSelect, useNoWebDrag } from "./noWebDrag";
import { RestoreResultCard, type Restored } from "./RestoreResult";
import { errorKey, useGameText } from "./strings";
import { ThrowBackground, WaxBall, type FightScreenProps } from "./ThrowScreen";
import type { SharedValue } from "react-native-reanimated";

type Props = FightScreenProps & DodgeTarget & {
  avatar?: unknown;
  /** Today's Hunt: one fight per capsule. `results` holds the capsules already fought (true = restored). */
  home?: { onQuit: () => void; onBack: () => void; index?: number; total?: number; results?: readonly boolean[] };
};
const web = Platform.OS === "web";
const keyInputs: Record<string, DodgeInput> = {
  arrowleft: "left", a: "left", arrowup: "jump", w: "jump", " ": "jump",
  arrowright: "right", d: "right",
};
const mockLosses = new Map<string, { left: number; expiresAt: number }>();
// The how-to card shows on a player's first fight on this device; "?" reopens it.
const INTRO_KEY = "tc.fightIntro";

export function DodgeFightScreen({ capsule, landmark, home, avatar, state, onState, onClose }: Props) {
  const { language, setLanguage } = useLanguage();
  const x = fightStrings[language];
  const s = useGameText();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const mode = home ? "home" : landmark ? "landmark" : "corrupted";
  const remote = !home && !capsule.id.startsWith("dev-");
  const stock = { wax: state.wax_balls, gold: state.gold_balls };
  const [attempts, setAttempts] = useState(() => remote ? capsule.attempts_left : mockLosses.get(capsule.id)?.left ?? capsule.attempts_left);
  const [arena, setArena] = useState({ width: 0, height: 0 });
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [pointer, setPointer] = useState(false);
  const [phase, setPhase] = useState<"intro" | "playing" | "finished">("intro");
  const [paused, setPaused] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [needed, setNeeded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof errorKey> | null>(null);
  const [submission, setSubmission] = useState<"idle" | "saving" | "retry" | "refused">("idle");
  const [result, setResult] = useState<Restored | null>(null);
  const [, render] = useState(0);
  const engine = useRef<DodgeFight | null>(null);
  if (!engine.current) engine.current = new DodgeFight(mode, capsule.rarity, stock);
  const fight = engine.current;
  const session = useRef<DodgeSession | null>(null);
  const live = useRef(true);
  const blocked = useRef(false);
  const away = useRef(false);
  const resolving = useRef(false);
  const noticeDone = useRef(false);
  const leaving = useRef(false);
  const autoStarted = useRef(false);
  const finish = useRef<(fight: DodgeFight) => void>(() => {});
  const motion = useSharedValue(initialFrame);
  const finishTime = useSharedValue(0);
  const burst = useRef(new RNAnimated.Value(0)).current;
  const health = fight.hp / fight.maxHp;
  const portrait = fightRigFor(avatar);
  const redraw = () => render((n) => n + 1);
  const describeError = (e: unknown) => errorKey(e instanceof GameError ? e.code : "unknown");

  useNoWebDrag();
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; burst.stopAnimation(); };
  }, [burst]);

  useEffect(() => {
    const nowHidden = () => (web && document.hidden) || (AppState.currentState != null && AppState.currentState !== "active");
    const visibility = () => {
      away.current = nowHidden();
      if (away.current && phase === "playing") { blocked.current = true; setPaused(true); }
    };
    visibility();
    const sub = AppState.addEventListener("change", visibility);
    if (web) document.addEventListener("visibilitychange", visibility);
    return () => {
      sub.remove();
      if (web) document.removeEventListener("visibilitychange", visibility);
    };
  }, [phase]);

  useEffect(() => {
    if (!web) return;
    const query = window.matchMedia("(any-pointer: fine)");
    const update = () => setPointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let on = true;
    AsyncStorage.getItem(INTRO_KEY).then((v) => { if (on) setIntroSeen(v === "seen"); }).catch(() => { if (on) setIntroSeen(false); });
    return () => { on = false; };
  }, []);

  const start = async () => {
    if (resolving.current) return;
    setError(null);
    const damage = stock.wax + 2 * stock.gold;
    // An online Corrupted fight checks against the health the server returns, because a resumed fight keeps its saved health.
    // A Landmark checks first, because its start call begins the 150-second clock.
    const healthNeeded = fightHealth(mode, capsule.rarity);
    if (!home && !(remote && mode === "corrupted") && damage < healthNeeded) {
      setNeeded(healthNeeded);
      return;
    }
    setNeeded(null);
    resolving.current = true;
    setBusy(true);
    try {
      if (remote) {
        const initialized = await dodgeFights.start({ capsule, landmark });
        if (!live.current) return;
        if (damage < initialized.health) {
          setNeeded(initialized.health);
          return;
        }
        session.current = initialized;
        setAttempts(initialized.attemptsLeft);
      } else if (mode === "corrupted") {
        for (const [id, row] of mockLosses) if (row.expiresAt <= Date.now()) mockLosses.delete(id);
        if (attempts <= 0) { setError("gone"); return; }
      }
      const next = new DodgeFight(mode, capsule.rarity, stock, Math.random, session.current ? {
        ...session.current, seconds: Math.max(0, (session.current.expiresAt - Date.now()) / 1000),
      } : undefined);
      next.chooseBall(fight.selected);
      engine.current = next;
      setSubmission("idle");
      finishTime.value = 0;
      motion.value = { ...next.frame };
      noticeDone.current = false;
      blocked.current = away.current;
      setPaused(away.current);
      setPhase("playing");
    } catch (e) {
      if (live.current) setError(describeError(e));
    } finally {
      resolving.current = false;
      if (live.current) setBusy(false);
    }
  };

  const close = () => {
    if (resolving.current || confirmLeave) return;
    if (home) {
      if (fight.end !== "won") home.onQuit();
      return;
    }
    if (phase === "playing" && fight.used.wax + fight.used.gold > 0) {
      blocked.current = true;
      setConfirmLeave(true);
      return;
    }
    onClose(fight.end === "won" && submission === "idle");
  };

  const celebrate = (out: Restored) => {
    void haptics.success();
    burst.setValue(0);
    RNAnimated.timing(burst, { toValue: 1, duration: reduced ? 420 : 1150, easing: Easing.linear, useNativeDriver: !web }).start(({ finished }) => {
      if (!finished || !live.current) return;
      if (home) onClose(true);
      else setResult(out);
    });
  };

  const submitFinish = async (active: DodgeFight, current: DodgeSession) => {
    if (resolving.current) return;
    resolving.current = true;
    setSubmission("saving");
    setError(null);
    try {
      const reported = active.end === "won" ? "won" : "lost";
      const out = await dodgeFights.finish({ capsule, landmark }, current, reported, active.used);
      if (!live.current) return;
      onState({ ...state, wax_balls: out.wax_balls, gold_balls: out.gold_balls });
      active.stock = { wax: out.wax_balls, gold: out.gold_balls };
      setAttempts(out.attempts_left);
      if (leaving.current) { onClose(false); return; }
      setSubmission("idle");
      if (out.result === "won" && out.vessel) celebrate({ ...out, vessel: out.vessel, stars: out.stars ?? 0 });
      else if (active.end === "won") active.finish("lost");
    } catch (e) {
      if (!live.current) return;
      const network = e instanceof GameError && e.code === "network";
      if (!network) {
        active.hp = current.health;
        active.stock = { ...stock };
      }
      setError(describeError(e));
      setSubmission(network ? "retry" : "refused");
    } finally {
      resolving.current = false;
    }
  };

  finish.current = (active) => {
    if (noticeDone.current) return;
    noticeDone.current = true;
    setPhase("finished");
    finishTime.value = withTiming(1, { duration: 1000 });
    const usedBalls = active.used.wax + active.used.gold > 0;
    const submit = active.end === "won" || active.end === "lost" || (active.end === "empty" && usedBalls);
    if (submit && session.current) {
      void submitFinish(active, session.current);
      return;
    }
    // Today's Hunt: a capsule that isn't restored moves straight on to the next one.
    if (home && active.end !== "won") {
      setTimeout(() => { if (live.current) onClose(false); }, 1400);
      return;
    }
    if (active.end === "won") {
      const practice = mode === "corrupted" ? game.devRestore(capsule.id) : null;
      celebrate(practice ?? { vessel: capsule.vessel, copies: landmark ? null : 1, stars: 1, is_new: true,
        xp_gained: home ? 0 : landmark ? 2000 : 600 });
    } else if (submit && mode === "corrupted") {
      const left = Math.max(0, attempts - 1);
      mockLosses.set(capsule.id, { left, expiresAt: Date.parse(capsule.expires_at) });
      setAttempts(left);
    }
    if (leaving.current) {
      onState({ ...state, wax_balls: active.stock.wax, gold_balls: active.stock.gold });
      onClose(false);
    }
  };

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    setConfirmLeave(false);
    fight.finish("lost");
    motion.value = { ...fight.frame };
    finish.current(fight);
  };

  useEffect(() => {
    if (phase !== "playing" || paused) return;
    let last: number | undefined;
    let frameId: number;
    const frame = (now: number) => {
      if (blocked.current) { last = undefined; frameId = requestAnimationFrame(frame); return; }
      const active = engine.current!;
      if (active.end) return;
      const { hp, lives, flight, attack, secondsLeft } = active;
      const expiry = session.current?.expiresAt;
      const remaining = expiry === undefined ? Infinity : (expiry - Date.now()) / 1000;
      active.syncTimer(remaining);
      if (remaining <= 0) active.finish("expired");
      else active.advance(last === undefined ? 0 : (now - last) / 1000);
      last = now;
      motion.value = { ...active.frame };
      if (active.flight && active.flight !== flight) void haptics.fightThrow();
      if (active.hp < hp) void haptics.fightHit();
      if (active.lives < lives) void haptics.fightHurt();
      if (active.hp !== hp || active.lives !== lives || active.flight !== flight || active.attack !== attack || active.secondsLeft !== secondsLeft) redraw();
      if (active.end) { finish.current(active); return; }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [motion, phase, paused]);

  const playing = phase === "playing" && !paused && !confirmLeave && !helpOpen;

  // A returning player skips the card and the fight starts at once.
  useEffect(() => {
    if (introSeen !== true || phase !== "intro" || autoStarted.current) return;
    autoStarted.current = true;
    void start();
  });
  const startFromCard = () => {
    if (!introSeen) {
      setIntroSeen(true);
      AsyncStorage.setItem(INTRO_KEY, "seen").catch(() => {});
    }
    void start();
  };
  const openHelp = () => { blocked.current = true; setHelpOpen(true); };
  const closeHelp = () => { blocked.current = paused || away.current; setHelpOpen(false); };
  const ready = useAnimatedStyle(() => ({ opacity: phase === "playing" ? Math.max(0, Math.min(1, (1.1 - motion.value.now) / .3)) : 0 }));
  const input = useRef<(key: DodgeInput) => void>(() => {});
  input.current = (key) => {
    if (playing && !blocked.current) engine.current?.input(key);
  };
  // Hold and drag anywhere: the figure snaps one lane per quarter of the stage dragged. A quick upward flick jumps.
  const stageWidth_ = useRef(0);
  const pan = useMemo(() => {
    let from = 1;
    let trail: { y: number; t: number }[] = [];
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        from = engine.current?.currentLane ?? 1;
        trail = [{ y: e.nativeEvent.pageY, t: Date.now() }];
      },
      onPanResponderMove: (e, { dx }) => {
        const active = engine.current;
        if (!active || !inputOk.current()) return;
        active.moveTo(dragLane(from, dx, stageWidth_.current || 1));
        const now = Date.now(), y = e.nativeEvent.pageY;
        trail = [...trail.filter((p) => now - p.t <= 160), { y, t: now }];
        const first = trail[0];
        if (isFlick(0, y - first.y, now - first.t)) {
          input.current("jump");
          trail = [{ y, t: now }];
        }
      },
    });
  }, []);
  const inputOk = useRef<() => boolean>(() => false);
  inputOk.current = () => playing && !blocked.current;

  useEffect(() => {
    if (!web || !playing) return;
    const keyboard = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || (e.key === " " && (e.target as HTMLElement)?.closest?.("[role=button],button"))) return;
      const action = keyInputs[e.key.toLowerCase()];
      if (!action) return;
      e.preventDefault();
      input.current(action);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [playing]);

  const desktop = layout.width >= 600;
  const stageWidth = desktop ? Math.min(480, (layout.height - 32) * 2 / 3) : layout.width;
  stageWidth_.current = arena.width;
  const seconds = fight.secondsLeft;
  const clock = seconds === null ? "" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const scene = { ...arena, motion, reduced };
  const name = VESSELS[capsule.vessel as keyof typeof VESSELS]?.name[language];
  const title = s(landmark ? "challenge" : "corruptedCapsule");
  const boss = name ? `${title} · ${name}` : title;
  const expiredText = landmark ? x.remoteExpired : s("expired");
  const errorText = error === "expired" ? expiredText : error ? s(error) : null;
  const submitting = submission === "saving";
  const needsRetry = submission === "retry";
  const ending = fight.end === "empty" ? s("noBalls")
    : fight.end === "expired" ? expiredText
    : fight.end === "timeout" ? s("timeUp")
    : mode === "corrupted" && fight.end === "lost"
      ? (attempts > 0 ? x.brokeFree : s("gone")) : x.noLives;

  return <View style={[styles.root, noWebSelect]} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
    {desktop && <><ThrowBackground /><View pointerEvents="none" style={styles.backdrop} /></>}
    {stageWidth > 0 && <View style={[styles.column, { width: stageWidth, paddingTop: insets.top + (desktop ? 16 : 0),
      paddingBottom: insets.bottom + (desktop ? 16 : 0) }]}>
      <View style={[styles.stage, desktop && styles.desktopStage]} onLayout={(e) => setArena(e.nativeEvent.layout)}>
        <ThrowBackground />
        <View pointerEvents="none" style={styles.dim} />
        {arena.width > 0 && <>
          <View style={[StyleSheet.absoluteFill, web ? ({ touchAction: "none" } as object) : null]} {...pan.panHandlers}>
            <FightBoss {...scene} vessel={capsule.vessel} health={submission !== "idle" ? Math.max(.16, health) : health} warning={fight.attack} damage={fight.damage}
              praise={fight.damage > 0 ? { text: x.praise[fight.hitWord], index: fight.hitWord } : null} burst={burst} finishTime={finishTime} />
            <DodgePlayer {...scene} figure={portrait} />
            <JumpSpikes {...scene} hitAt={fight.attack?.kind === "wave" ? fight.attack.at + fight.attack.warning + fight.attack.travel : null} />
            <HealthBar {...scene} label={x.hp(fight.hp)} value={fight.hp} max={fight.maxHp} at="boss" />
            <HealthBar {...scene} label={x.lives(fight.lives)} value={fight.lives} max={LIVES} at="player" />
            {fight.attack && <FightAttack {...scene} attack={fight.attack}
              label={fight.attack.kind === "wave" ? x.wave : fight.attack.kind === "triple" ? x.triple : x.shot}
              warn={fight.attack.kind === "wave" ? x.waveWarn : fight.attack.kind === "triple" ? x.tripleWarn : x.shotWarn} />}
            <HurtText {...scene} finishTime={finishTime} text={x.hurt} />
            <Animated.Text pointerEvents="none" style={[styles.ready, { top: arena.height * .5 }, ready]}>{x.ready}</Animated.Text>
            {playing && fight.ball && <HeldBall {...scene} ball={fight.ball} figure={portrait} />}
            {fight.flight && <PlayerThrow {...scene} flight={fight.flight} figure={portrait} />}
            <HitEdge motion={motion} finishTime={finishTime} />
          </View>
          <View pointerEvents="box-none" style={styles.hud}>
            <View style={styles.hudRow}>
              <Text numberOfLines={1} style={styles.bossName}>{boss}</Text>
              {!!clock && <View style={styles.clock}><Text style={styles.clockText}>{clock}</Text></View>}
              <View style={styles.hudActions}>
                {phase === "playing" && <Pressable accessibilityRole="button" accessibilityLabel={x.help} style={styles.pill}
                  disabled={confirmLeave || helpOpen} onPress={openHelp}>
                  <Text style={styles.helpMark}>?</Text>
                </Pressable>}
                <Pressable accessibilityRole="button" accessibilityLabel={x.otherLanguage} style={styles.pill} onPress={() => setLanguage(language === "zh" ? "en" : "zh")}>
                  <Text style={styles.lang}>{x.languageButton}</Text>
                </Pressable>
                {(phase !== "finished" || (fight.end === "won" && submission === "idle")) && <Pressable accessibilityRole="button" accessibilityLabel={s("close")} style={styles.pill}
                  disabled={busy || confirmLeave || (!!home && fight.end === "won")} onPress={close}>
                  <ArtIcon name="close" size={19} />
                </Pressable>}
              </View>
            </View>
            {home?.total && <HuntSteps x={x} total={home.total} index={home.index ?? 0} results={home.results ?? []}
              current={fight.end === "won" ? true : fight.end ? false : null} />}
          </View>
        </>}
        {phase === "intro" && (introSeen === false || needed !== null || !!error) && <View style={styles.overlay}>
          <ScrollView style={styles.scrollCard} contentContainerStyle={styles.cardContent}>
            <Text accessibilityRole="header" style={styles.title}>{landmark ? boss : x.intro}</Text>
            <Rules x={x} />
            {needed !== null ? <View accessibilityLiveRegion="polite" style={styles.requirement}>
              <Text style={styles.detail}>{x.needBalls(needed)}</Text>
              <Text style={styles.detail}>{x.waypostHint}</Text>
            </View> : <Text style={styles.detail}>{errorText ?? (pointer ? x.keyHint : x.touchHint)}</Text>}
            <Action label={x.start} disabled={busy} onPress={startFromCard} />
            <Action label={s("close")} secondary disabled={busy} onPress={home ? home.onBack : () => onClose(false)} />
          </ScrollView>
        </View>}
        {helpOpen && <View style={styles.overlay}>
          <ScrollView accessibilityViewIsModal style={styles.scrollCard} contentContainerStyle={styles.cardContent}>
            <Text accessibilityRole="header" style={styles.title}>{x.help}</Text>
            <Rules x={x} />
            <Text style={styles.detail}>{pointer ? x.keyHint : x.touchHint}</Text>
            <Action label={x.resume} onPress={closeHelp} />
          </ScrollView>
        </View>}
        {paused && !confirmLeave && !helpOpen && phase === "playing" && <View style={styles.overlay}>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>{x.paused}</Text>
            <Action label={x.resume} onPress={() => { if (!away.current) { blocked.current = false; setPaused(false); } }} />
          </View>
        </View>}
        {confirmLeave && <View style={styles.overlay}>
          <View accessibilityViewIsModal style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>{x.leavingLoss}</Text>
            <Action label={x.keepPlaying} onPress={() => {
              blocked.current = paused || away.current || helpOpen;
              setConfirmLeave(false);
            }} />
            <Action label={x.leave} secondary onPress={leave} />
          </View>
        </View>}
        {phase === "finished" && (fight.end !== "won" || submission !== "idle") && <View style={styles.overlay}>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>{submitting ? x.saving : errorText ?? (home ? x.missedNext : ending)}</Text>
            {submission === "idle" && (fight.end === "lost" || (fight.end === "empty" && fight.used.wax + fight.used.gold > 0))
              && mode === "corrupted" && attempts > 0 && <Text style={styles.detail}>{x.triesLeft(attempts)}</Text>}
            {needsRetry && <Action label={x.retryFinish} onPress={() => { if (session.current) void submitFinish(fight, session.current); }} />}
            {!home && <Action label={s("close")} disabled={submitting} onPress={() => onClose(false)} />}
          </View>
        </View>}
        {result && <RestoreResultCard result={result} bottom={0} onCollect={() => onClose(true)} />}
      </View>
    </View>}
  </View>;
}

/** Green when full, red when nearly gone, as one smooth bar with no section lines. */
const tint = (f: number) => `hsl(${Math.round(4 + 124 * Math.max(0, Math.min(1, f)))}, 52%, 46%)`;

/** The small health bars: the capsule's under the capsule, the player's under the figure's feet. Only the number left shows. */
function HealthBar({ width, height, motion, reduced, label, value, max, at }: {
  width: number; height: number; motion: SharedValue<FightFrame>; reduced: boolean; label: string; value: number; max: number; at: "boss" | "player";
}) {
  const f = max > 0 ? value / max : 0;
  const fill = useSharedValue(f);
  const lag = useSharedValue(f);
  useEffect(() => {
    fill.value = reduced ? f : withTiming(f, { duration: 120 });
    lag.value = reduced ? f : withDelay(250, withTiming(f, { duration: 500 }));
  }, [f, fill, lag, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const lagStyle = useAnimatedStyle(() => ({ width: `${lag.value * 100}%` }));
  const boss = at === "boss";
  const barWidth = width * (boss ? .34 : .24);
  const follow = useAnimatedStyle(() => ({
    transform: [{ translateX: boss ? width * .535 - barWidth / 2 : motion.value.x * width - barWidth / 2 }],
  }));
  return <Animated.View pointerEvents="none" accessible accessibilityLabel={label}
    style={[styles.hpRow, { width: barWidth, top: height * (boss ? BOSS_Y + .135 : GROUND + .03) }, follow]}>
    <View style={[styles.hpTrack, { borderColor: boss ? C.brass : C.paper, height: boss ? 9 : 8 }]}>
      <Animated.View style={[styles.hpFill, { backgroundColor: "#F3E2BB" }, lagStyle]} />
      <Animated.View style={[styles.hpFill, { backgroundColor: tint(f) }, fillStyle]} />
    </View>
    <Text allowFontScaling={false} style={styles.hpNumber}>{value}</Text>
  </Animated.View>;
}

/** Today's Hunt: the three capsules numbered down the left. Grey until restored, blue once restored; a ring on the current one. */
function HuntSteps({ x, total, index, results, current }: {
  x: (typeof fightStrings)["zh" | "en"]; total: number; index: number; results: readonly boolean[]; current: boolean | null;
}) {
  return <View pointerEvents="none" style={styles.track}>
    {Array.from({ length: total }, (_, i) => {
      const result = i < index ? results[i] : i === index ? current : null;
      const done = result === true;
      const now = i === index && result === null;
      const state = done ? x.restored : result === false ? x.missed : now ? x.current : x.waiting;
      return <React.Fragment key={i}>
        {i > 0 && <View style={[styles.link, done && styles.linkDone]} />}
        <View accessible accessibilityLabel={x.huntStep(i + 1, state)} style={[styles.step, now && styles.stepNow, done && styles.stepDone]}>
          <Text allowFontScaling={false} style={[styles.stepText, now && { color: C.ink }, done && { color: C.white }]}>{i + 1}</Text>
        </View>
      </React.Fragment>;
    })}
  </View>;
}

function Rules({ x }: { x: (typeof fightStrings)["zh" | "en"] }) {
  return <>
    <View style={styles.rule}><View style={styles.symbol}><Text style={styles.jumpSymbol}>‹ ›</Text></View><Text style={styles.ruleText}>{x.moveRule}</Text></View>
    <View style={styles.rule}><View style={styles.symbol}><WaxBall kind="wax" size={28} /></View><Text style={styles.ruleText}>{x.throwRule}</Text></View>
    <View style={styles.rule}><View style={styles.symbol}><Text style={styles.redSymbol}>← →</Text></View><Text style={styles.ruleText}>{x.dodgeRule}</Text></View>
    <View style={styles.rule}><View style={styles.symbol}><Text style={styles.jumpSymbol}>↑</Text></View><Text style={styles.ruleText}>{x.jumpRule}</Text></View>
    <View style={styles.rule}><View style={styles.symbol}><Text style={styles.tripleSymbol}>●●●</Text></View><Text style={styles.ruleText}>{x.tripleRule}</Text></View>
  </>;
}

function Action({ label, onPress, disabled, secondary }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, secondary && styles.secondary, (pressed || disabled) && { opacity: .65 }]}>
    <Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 40, alignItems: "center", backgroundColor: C.paper },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(22,38,63,.24)" },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(22,38,63,.12)" },
  column: { flex: 1, minHeight: 0 },
  stage: { flex: 1, overflow: "hidden", backgroundColor: "#DDEBD3" },
  desktopStage: { borderRadius: 22, ...shadows.card },
  hud: { position: "absolute", top: 10, left: 10, right: 10, gap: 6, zIndex: 2 },
  bossName: { flexShrink: 1, fontFamily: serif, fontSize: 13, fontWeight: "700", color: C.white, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: "rgba(22,38,63,.72)", overflow: "hidden" },
  hpRow: { position: "absolute", left: 0, flexDirection: "row", alignItems: "center", gap: 5, zIndex: 3 },
  hpTrack: { flex: 1, overflow: "hidden", backgroundColor: "#0B1424", borderRadius: 5, borderWidth: 1.5 },
  hpFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4 },
  hpNumber: { minWidth: 16, fontFamily: sans, fontSize: 11, fontWeight: "700", color: C.white, fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(22,38,63,.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  track: { position: "absolute", left: 0, top: 50, alignItems: "center" },
  step: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#C9D1DC", ...shadows.card },
  stepNow: { backgroundColor: C.paper, borderWidth: 3, borderColor: C.blue },
  stepDone: { backgroundColor: C.blue },
  stepText: { fontFamily: serif, fontSize: 14, fontWeight: "700", color: C.muted },
  link: { width: 3, height: 12, backgroundColor: "#C9D1DC" },
  linkDone: { backgroundColor: C.blue },
  hudRow: { minHeight: 36, alignItems: "center", flexDirection: "row", gap: 7 },
  hudActions: { marginLeft: "auto", flexDirection: "row", gap: 6 },
  pill: { justifyContent: "center", alignItems: "center", minWidth: 44, height: 44, paddingHorizontal: 8,
    backgroundColor: "rgba(246,248,251,.96)", borderRadius: 22 },
  lang: { color: C.blue, fontFamily: sans, fontSize: 12 },
  helpMark: { color: C.blue, fontFamily: serif, fontSize: 18, fontWeight: "700" },
  ready: { position: "absolute", width: "100%", textAlign: "center", fontFamily: serif, fontSize: 30, fontWeight: "700", color: C.white,
    textShadowColor: "rgba(22,38,63,.7)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  clock: { backgroundColor: C.paper, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 9 },
  clockText: { color: C.ink, fontFamily: sans, fontVariant: ["tabular-nums"], fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 5, backgroundColor: "rgba(22,38,63,.38)", alignItems: "center", justifyContent: "center", padding: 14 },
  scrollCard: { flexGrow: 0, maxHeight: "100%", width: "100%", maxWidth: 330, backgroundColor: C.paper, borderRadius: 18, ...shadows.card },
  cardContent: { gap: 10, padding: 16 },
  card: { backgroundColor: C.paper, borderRadius: 18, width: "100%", maxWidth: 330, gap: 10, padding: 16, ...shadows.card },
  title: { fontFamily: serif, fontSize: 19, fontWeight: "700", textAlign: "center", color: C.ink },
  detail: { color: C.muted, fontFamily: sans, textAlign: "center", fontSize: 12 },
  requirement: { gap: 4 },
  rule: { flexDirection: "row", gap: 9, alignItems: "center" },
  ruleText: { flex: 1, color: C.ink, fontFamily: sans, fontSize: 13 },
  symbol: { width: 40, height: 34, borderRadius: 9, backgroundColor: "#E7EEF5", alignItems: "center", justifyContent: "center" },
  redSymbol: { fontSize: 16, fontWeight: "700", color: C.wax },
  tripleSymbol: { fontSize: 9, letterSpacing: -.5, color: C.wax },
  jumpSymbol: { fontSize: 19, fontWeight: "700", color: C.ink },
  action: { minHeight: 44, justifyContent: "center", alignItems: "center", backgroundColor: C.wax, borderRadius: 22, paddingHorizontal: 10 },
  actionText: { fontFamily: serif, fontSize: 16, color: C.white },
  secondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  secondaryText: { color: C.wax },
});
