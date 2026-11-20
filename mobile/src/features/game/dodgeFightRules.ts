import type { BallKind, Rarity } from "../../services/game";

export type FightMode = "corrupted" | "landmark" | "home";
export type DodgeInput = "left" | "jump" | "right";
export type FightEnd = "won" | "lost" | "timeout" | "expired" | "empty";
export type BallStock = Record<BallKind, number>;
export const LANES = [.2, .5, .8] as const;
export const GROUND = .865;
export const BOSS_Y = .31;
export const LIVES = 3;
export const CHARGE = .95;
export const WIND = .14;
export const THROW_RECOVERY = .16;
export const MOVE = .13;
export const JUMP = .7;
export const FLIGHT = .62;
export const INVULNERABLE = 1;
export const LANDMARK_SECONDS = 150;

export const fightHealth = (mode: FightMode, rarity: Rarity) =>
  mode === "landmark" ? 20 : mode === "home" ? 5 : { common: 5, uncommon: 6, rare: 7 }[rarity];

export type AttackKind = "shot" | "double" | "wave" | "triple";
type Weights = Record<AttackKind, number>;
/** How often each attack comes. Rare capsules use the late table from the start. */
export const ATTACK_WEIGHTS: Record<"early" | "late" | "landmark", Weights> = {
  early: { shot: 50, double: 20, wave: 25, triple: 5 },
  late: { shot: 35, double: 25, wave: 25, triple: 15 },
  landmark: { shot: 30, double: 25, wave: 30, triple: 15 },
};
/** A triple shot can't be dodged, so it is capped per fight and never takes the last life. */
export const TRIPLE_CAP: Record<FightMode, number> = { corrupted: 1, home: 1, landmark: 2 };
export const LATE_DAMAGE = .4;

export function attackTable(mode: FightMode, rarity: Rarity, tough: number) {
  return mode === "landmark" ? ATTACK_WEIGHTS.landmark : rarity === "rare" || tough >= LATE_DAMAGE ? ATTACK_WEIGHTS.late : ATTACK_WEIGHTS.early;
}

/** Weighted pick that never repeats the same attack three times running and skips a triple when it isn't allowed. */
export function pickAttack(table: Weights, recent: readonly AttackKind[], allowTriple: boolean, random: () => number): AttackKind {
  const [a, b] = recent.slice(-2);
  const options = (Object.keys(table) as AttackKind[])
    .filter((kind) => table[kind] > 0 && (kind !== "triple" || allowTriple) && !(a === kind && b === kind));
  const total = options.reduce((sum, kind) => sum + table[kind], 0);
  let roll = random() * total;
  for (const kind of options) {
    roll -= table[kind];
    if (roll < 0) return kind;
  }
  return options[options.length - 1];
}

export function fightHealthTicks(mode: FightMode, maxHp: number) {
  const section = mode === "landmark" ? 5 : 1;
  return Array.from({ length: Math.ceil(maxHp / section) - 1 }, (_, index) => (index + 1) * section / maxHp);
}

export function dodgeSwipe(dx: number, dy: number): DodgeInput | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "jump" : null;
}

export const otherBall = (ball: BallKind): BallKind => ball === "wax" ? "gold" : "wax";
export function availableBall(ball: BallKind, stock: BallStock): BallKind | null {
  if (stock[ball] > 0) return ball;
  const other = otherBall(ball);
  return stock[other] > 0 ? other : null;
}

export type Attack = {
  at: number;
  warning: number;
  travel: number;
  kind: AttackKind;
  lanes: number[];
};
export type Flight = { at: number; x: number; ball: BallKind };
export type FightFrame = {
  now: number; x: number; jump: number; charge: number; wind: number; moving: number;
  scatterAt: number; scatterX: number; hurtAt: number; throwAt: number; hitAt: number;
};
export const initialFrame: FightFrame = {
  now: 0, x: .5, jump: 0, charge: 0, wind: 0, moving: 0,
  scatterAt: -10, scatterX: .5, hurtAt: -10, throwAt: -10, hitAt: -10,
};

/** The demo's active-play clock. All positions are fractions and all times are seconds. */
export class DodgeFight {
  readonly maxHp: number;
  private timer: number;
  hp: number;
  lives = LIVES;
  stock: BallStock;
  selected: BallKind = "wax";
  end: FightEnd | null = null;
  frame = { ...initialFrame };
  attack: Attack | null = null;
  flight: Flight | null = null;
  readonly used: BallStock = { wax: 0, gold: 0 };
  damage = 0;
  /** Which praise word the last capsule hit shows (0–2). */
  hitWord = 0;
  private lane = 1;
  private moveAt = -10;
  private moveFrom = .5;
  private jumpAt = -10;
  private gatherFrom = 0;
  private nextAttackAt = 1.8;
  private comboShot = false;
  private recent: AttackKind[] = [];
  /** Tests only: attacks to use next, in order, before the weighted pick. */
  forcedAttacks: AttackKind[] = [];
  private triples = 0;

  constructor(readonly mode: FightMode, private readonly rarity: Rarity, stock: BallStock,
    private readonly random = Math.random, remote?: { health: number; maxHealth: number; seconds?: number }) {
    this.timer = Math.min(LANDMARK_SECONDS, remote?.seconds ?? LANDMARK_SECONDS);
    this.maxHp = remote?.maxHealth ?? fightHealth(mode, rarity);
    this.hp = remote?.health ?? this.maxHp;
    this.stock = { ...stock };
    this.selected = mode === "home" ? "wax" : availableBall("wax", stock) ?? "wax";
  }

  get secondsLeft() {
    return this.mode === "landmark" ? Math.max(0, Math.ceil(this.timer - this.frame.now)) : null;
  }

  /** A hosted attempt's expiry keeps running while local play is paused. */
  syncTimer(seconds: number) {
    if (this.mode === "landmark") this.timer = Math.min(this.timer, this.frame.now + Math.max(0, seconds));
  }

  get ball(): BallKind | null {
    return this.mode === "home" ? "wax" : availableBall(this.selected, this.stock);
  }

  chooseBall(ball: BallKind) {
    if (this.mode === "home" || this.end || this.stock[ball] <= 0 || ball === this.selected) return;
    this.selected = ball;
  }

  input(input: DodgeInput) {
    if (this.end || this.lives === 0) return;
    const { now, x } = this.frame;
    if (input === "jump") {
      if (now - this.jumpAt < JUMP) return;
      this.jumpAt = now;
      this.interrupt(now + JUMP);
      return;
    }
    const lane = Math.max(0, Math.min(2, this.lane + (input === "left" ? -1 : 1)));
    if (lane === this.lane) return;
    this.lane = lane;
    this.moveFrom = x;
    this.moveAt = now;
    this.interrupt(now + MOVE);
  }

  private interrupt(until: number) {
    const frame = this.frame;
    if (frame.charge > .15) {
      frame.scatterAt = frame.now;
      frame.scatterX = frame.x;
    }
    frame.charge = 0;
    frame.wind = 0;
    this.gatherFrom = Math.max(this.gatherFrom, until);
  }

  private announceAttack() {
    const { now } = this.frame;
    const tough = 1 - this.hp / this.maxHp;
    const landmark = this.mode === "landmark";
    const [a, b] = this.recent.slice(-2);
    const combo = !this.comboShot && landmark && tough >= .5 && !(a === "wave" && b === "wave") && this.random() < .35;
    const allowTriple = this.lives >= 2 && this.triples < TRIPLE_CAP[this.mode];
    const forced = this.forcedAttacks.shift();
    const kind: AttackKind = forced ?? (this.comboShot ? "shot" : combo ? "wave" : null) ??
      pickAttack(attackTable(this.mode, this.rarity, tough), this.recent, allowTriple, this.random);
    if (kind === "triple") this.triples++;
    this.recent = [...this.recent.slice(-1), kind];
    // A triple glows longer so the player sees the unavoidable hit coming.
    const warning = .85 - .23 * tough - (landmark ? .12 : 0) + (kind === "triple" ? .3 : 0);
    const travel = kind === "wave" ? .62 : .7 - .15 * tough;
    // Double shots always threaten the player's lane and leave one of the other lanes safe.
    const otherLanes = [0, 1, 2].filter((lane) => lane !== this.lane);
    const lanes = kind === "wave" ? [] : kind === "triple" ? [0, 1, 2] : kind === "double"
      ? [this.lane, otherLanes[this.random() < .5 ? 0 : 1]].sort() : [this.lane];
    this.attack = { at: now, warning, travel, kind, lanes };
    this.nextAttackAt = now + warning + (combo ? travel + .12 : 1.25 + this.random() * .85 - tough * .5);
    this.comboShot = combo;
  }

  finish(end: FightEnd) {
    this.end = end;
    this.attack = this.flight = null;
    this.frame.charge = 0;
    this.frame.wind = 0;
  }

  /** Only advance while visible and playing. No timestamp from outside the fight enters these rules. */
  advance(delta: number) {
    if (this.end) return;
    const frame = this.frame;
    const now = frame.now += Math.min(delta, .05);
    const move = Math.min(1, (now - this.moveAt) / MOVE);
    const jumpTime = now - this.jumpAt;
    frame.moving = move < 1 ? Math.sin(move * Math.PI) : 0;
    frame.x = this.moveFrom + (LANES[this.lane] - this.moveFrom) * (1 - (1 - move) ** 3);
    frame.jump = jumpTime < JUMP ? Math.sin(Math.PI * jumpTime / JUMP) : 0;

    if (this.flight && now - this.flight.at >= FLIGHT) {
      const ball = this.flight.ball;
      this.flight = null;
      this.damage = Math.min(this.hp, ball === "gold" ? 2 : 1);
      this.hp -= this.damage;
      this.hitWord = Math.floor(this.random() * 3);
      frame.hitAt = now;
      if (this.hp === 0) { this.finish("won"); return; }
      if (this.lives === 0) { this.finish("lost"); return; }
    }
    if (this.lives === 0) return;
    if (this.secondsLeft === 0) { this.finish("timeout"); return; }

    if (this.attack && now >= this.attack.at + this.attack.warning + this.attack.travel) {
      const hit = this.attack.kind === "triple" ? true
        : this.attack.kind === "wave" ? jumpTime >= JUMP - .06
        : this.attack.lanes.some((lane) => Math.abs(frame.x - LANES[lane]) < .14);
      this.attack = null;
      if (hit && now - frame.hurtAt >= INVULNERABLE) {
        frame.hurtAt = now;
        this.lives--;
        this.interrupt(now);
        if (this.lives === 0) {
          this.attack = null;
          if (!this.flight) this.finish("lost");
          return;
        }
      }
    }

    const ball = this.ball;
    if (!ball && !this.flight) { this.finish("empty"); return; }
    if (!this.attack && now >= this.nextAttackAt) this.announceAttack();

    if (!ball || move < 1 || jumpTime < JUMP) return;
    const standing = Math.max(0, now - this.gatherFrom);
    frame.charge = Math.min(1, standing / CHARGE);
    frame.wind = Math.max(0, Math.min(1, (standing - CHARGE) / WIND));
    if (standing < CHARGE + WIND) return;

    this.flight = { at: now, x: frame.x, ball };
    if (this.mode !== "home") {
      this.stock[ball]--;
      this.used[ball]++;
    }
    this.selected = this.ball ?? ball;
    this.gatherFrom = now + THROW_RECOVERY;
    frame.throwAt = now;
    frame.charge = 0;
    frame.wind = 0;
  }
}
