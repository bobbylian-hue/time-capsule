import { describe, expect, it } from "vitest";
import { ATTACK_WEIGHTS, attackTable, DodgeFight, dragLane, FIRE, FIRST_THROW, FLIGHT, isFlick, LIVES, pickAttack, TRIPLE_CAP, fightHealth, type AttackKind } from "./dodgeFightRules";

const stock = { wax: 30, gold: 2 };
function advance(fight: DodgeFight, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += .01) fight.advance(Math.min(.01, seconds - elapsed));
}
/** Advance with every attack cancelled, to test throwing on its own. */
function calm(fight: DodgeFight, seconds: number) {
  for (let elapsed = 0; elapsed < seconds; elapsed += .01) { fight.attack = null; fight.advance(Math.min(.01, seconds - elapsed)); }
}
/** A repeatable random sequence. */
function seeded(seed = 1) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

describe("dodge fight rules", () => {
  it("doubles health: rarity 10/12/14, 40 HP for landmarks, and 10 HP at home", () => {
    expect((["common", "uncommon", "rare"] as const).map((rarity) => fightHealth("corrupted", rarity))).toEqual([10, 12, 14]);
    expect(fightHealth("landmark", "common")).toBe(40);
    expect(fightHealth("home", "rare")).toBe(10);
  });

  it("throws a ball every second from the start, and each wax ball hits for one", () => {
    const fight = new DodgeFight("corrupted", "common", stock, () => .5);
    calm(fight, FIRST_THROW - .02);
    expect(fight.flight).toBeNull();
    calm(fight, .04);
    expect(fight.flight?.ball).toBe("wax");
    expect(fight.stock.wax).toBe(29);
    expect(fight.frame.nextThrowAt).toBeCloseTo(fight.frame.throwAt + FIRE);
    calm(fight, FLIGHT);
    expect(fight.hp).toBe(9);
    expect(fight.damage).toBe(1);
    calm(fight, FIRE);
    expect(fight.used.wax).toBe(2);
  });

  it("keeps throwing while moving and jumping", () => {
    const fight = new DodgeFight("corrupted", "rare", stock);
    calm(fight, .7);
    fight.input("left");
    fight.input("jump");
    calm(fight, .15);
    expect(fight.flight).not.toBeNull();
    fight.moveTo(2);
    calm(fight, 1);
    expect(fight.frame.x).toBeCloseTo(.8);
    expect(fight.used.wax).toBe(2);
  });

  it("uses gold for two damage and falls back to wax, then stops without a ball", () => {
    const fight = new DodgeFight("landmark", "common", { wax: 1, gold: 1 }, () => .5);
    fight.chooseBall("gold");
    calm(fight, .82);
    expect(fight.flight?.ball).toBe("gold");
    expect(fight.ball).toBe("wax");
    calm(fight, .62);
    expect(fight.hp).toBe(38);
    calm(fight, 1.3);
    expect(fight.hp).toBe(37);
    expect(fight.end).toBe("empty");
  });

  it("runs a hosted Landmark fight for the server's length, longer or shorter than 150 s", () => {
    const long = new DodgeFight("landmark", "common", { wax: 1, gold: 0 }, () => .5, { health: 40, maxHealth: 40, seconds: 180 });
    expect(long.secondsLeft).toBe(180);
    const short = new DodgeFight("landmark", "common", { wax: 1, gold: 0 }, () => .5, { health: 40, maxHealth: 40, seconds: 60 });
    expect(short.secondsLeft).toBe(60);
    expect(new DodgeFight("landmark", "common", { wax: 1, gold: 0 }).secondsLeft).toBe(150);
  });

  it("uses gold automatically when wax runs out and wins with the last ball", () => {
    const fight = new DodgeFight("corrupted", "common", { wax: 1, gold: 1 }, () => .5, { health: 3, maxHealth: 5 });
    calm(fight, 1.12);
    expect(fight.selected).toBe("gold");
    calm(fight, 2);
    expect(fight.end).toBe("won");
    expect(fight.stock).toEqual({ wax: 0, gold: 0 });
  });

  it("keeps home throws free, with no gold and no double shot", () => {
    const fight = new DodgeFight("home", "rare", { wax: 0, gold: 0 }, () => .99);
    fight.forcedAttacks = ["shot"];
    fight.chooseBall("gold");
    advance(fight, 1.82);
    expect(fight.attack?.kind).toBe("shot");
    fight.input("left");
    calm(fight, 10);
    expect(fight.end).toBe("won");
    expect(fight.stock).toEqual({ wax: 0, gold: 0 });
  });

  it("locks shots to a lane, and dodging that lane saves a life", () => {
    const fight = new DodgeFight("corrupted", "rare", stock, () => .5);
    fight.forcedAttacks = ["shot", "shot"];
    advance(fight, 1.82);
    expect(fight.attack?.lanes).toEqual([1]);
    fight.input("right");
    advance(fight, 1.6);
    expect(fight.lives).toBe(LIVES);
  });

  it("always leaves a safe lane on a double shot", () => {
    const fight = new DodgeFight("corrupted", "common", stock, () => .3);
    fight.forcedAttacks = ["double"];
    advance(fight, 1.82);
    expect(fight.attack?.kind).toBe("double");
    expect(new Set(fight.attack?.lanes).size).toBe(2);
    expect(fight.attack?.lanes).toContain(1);
  });

  it("picks attacks by the weight tables", () => {
    const random = seeded(42);
    for (const [name, table] of Object.entries(ATTACK_WEIGHTS)) {
      const counts: Record<AttackKind, number> = { shot: 0, double: 0, wave: 0, triple: 0 };
      const draws = 40000;
      for (let n = 0; n < draws; n++) counts[pickAttack(table, [], true, random)]++;
      const total = Object.values(table).reduce((a, b) => a + b, 0);
      for (const kind of Object.keys(table) as AttackKind[]) expect(counts[kind] / draws, `${name} ${kind}`).toBeCloseTo(table[kind] / total, 1);
    }
    expect(attackTable("corrupted", "common", 0)).toBe(ATTACK_WEIGHTS.early);
    expect(attackTable("corrupted", "common", .4)).toBe(ATTACK_WEIGHTS.late);
    expect(attackTable("corrupted", "rare", 0)).toBe(ATTACK_WEIGHTS.late);
    expect(attackTable("home", "common", 0)).toBe(ATTACK_WEIGHTS.early);
    expect(attackTable("landmark", "common", 0)).toBe(ATTACK_WEIGHTS.landmark);
  });

  it("never picks the same attack three times running, and skips a triple when not allowed", () => {
    const random = seeded(7);
    const shotOnly = { shot: 100, double: 1, wave: 1, triple: 1 };
    for (let n = 0; n < 500; n++) {
      expect(pickAttack(shotOnly, ["shot", "shot"], true, random)).not.toBe("shot");
      expect(pickAttack({ shot: 1, double: 1, wave: 1, triple: 1000 }, [], false, random)).not.toBe("triple");
    }
  });

  it("caps triple shots per fight and never uses one on the last life", () => {
    for (const mode of ["corrupted", "home", "landmark"] as const) {
      const fight = new DodgeFight(mode, "rare", { wax: 0, gold: 0 }, seeded(3));
      let triples = 0;
      let last: unknown = null;
      for (let step = 0; step < 6000 && !fight.end; step++) {
        if (fight.attack && fight.attack !== last) {
          last = fight.attack;
          if (fight.attack.kind === "triple") { triples++; expect(fight.lives).toBeGreaterThanOrEqual(2); }
        }
        // Dodge everything except triples, and keep the capsule alive by never throwing.
        if (fight.attack && fight.attack.kind !== "triple") fight.attack.lanes = [];
        if (fight.attack?.kind === "wave") fight.attack = null;
        fight.input(step % 40 < 20 ? "left" : "right");
        fight.advance(.05);
      }
      expect(triples).toBeLessThanOrEqual(TRIPLE_CAP[mode]);
    }
  });

  it("hits through a jump and in every lane on a triple shot", () => {
    const fight = new DodgeFight("corrupted", "common", stock, () => .5);
    fight.forcedAttacks = ["triple"];
    advance(fight, 1.82);
    expect(fight.attack?.lanes).toEqual([0, 1, 2]);
    fight.input("left");
    advance(fight, fight.attack!.warning + fight.attack!.travel - .3);
    fight.input("jump");
    advance(fight, .35);
    expect(fight.lives).toBe(LIVES - 1);
  });

  it("lets an airborne player clear a wave and hits a grounded player once", () => {
    const jumper = new DodgeFight("landmark", "rare", stock, () => .1);
    const grounded = new DodgeFight("landmark", "rare", stock, () => .1);
    for (const fight of [jumper, grounded]) {
      fight.forcedAttacks = ["wave"];
      advance(fight, 1.82);
      expect(fight.attack?.kind).toBe("wave");
      advance(fight, .92);
    }
    jumper.input("jump");
    advance(jumper, .55);
    advance(grounded, .55);
    expect(jumper.lives).toBe(LIVES);
    expect(grounded.lives).toBe(LIVES - 1);
  });

  it("uses faster Landmark warnings, waves followed by shots at half HP, and one-second protection", () => {
    const fight = new DodgeFight("landmark", "common", stock, () => .1, { health: 10, maxHealth: 20 });
    const common = new DodgeFight("corrupted", "rare", stock, () => .1);
    advance(fight, 1.82);
    advance(common, 1.82);
    expect(fight.attack?.warning).toBeLessThan(common.attack!.warning);
    expect(fight.attack?.kind).toBe("wave");
    advance(fight, 1.45);
    expect(fight.attack?.kind).toBe("shot");
    const lastHit = fight.frame.hurtAt;
    // A second attack resolving during the protection window leaves the total unchanged.
    fight.attack = { at: fight.frame.now, warning: .05, travel: .05, kind: "shot", lanes: [1] };
    advance(fight, .11);
    expect(fight.frame.hurtAt).toBe(lastHit);
    expect(fight.lives).toBe(2);
  });

  it("ends after three hits and expires a Landmark at 150 seconds of active play", () => {
    const lost = new DodgeFight("landmark", "common", stock, () => .5);
    advance(lost, 15);
    expect(lost.lives).toBe(0);
    expect(lost.end).toBe("lost");

    const timed = new DodgeFight("landmark", "common", { wax: 500, gold: 0 }, () => .5, { health: 1000, maxHealth: 1000 });
    expect(timed.secondsLeft).toBe(150);
    // Keep changing lanes between frames with attacks cancelled, against more health than 150 throws can take.
    for (let i = 0; i < 751; i++) {
      timed.input(i % 2 ? "right" : "left");
      timed.attack = null;
      advance(timed, .2);
    }
    expect(timed.end).toBe("timeout");
    expect(timed.secondsLeft).toBe(0);
  });

  it("reconciles a resumed Landmark timer with the server expiry without advancing attacks", () => {
    const fight = new DodgeFight("landmark", "common", stock, () => .5);
    advance(fight, 1);
    fight.syncTimer(90);
    expect(fight.secondsLeft).toBe(90);
    expect(fight.frame.now).toBeCloseTo(1);
    expect(fight.attack).toBeNull();
    expect(fight.lives).toBe(3);
  });

  it("counts the balls actually thrown and resolves damage locally", () => {
    const fight = new DodgeFight("corrupted", "rare", { wax: 1, gold: 2 }, () => .5, { health: 5, maxHealth: 7 });
    calm(fight, 1.14);
    expect(fight.used).toEqual({ wax: 1, gold: 0 });
    expect(fight.hp).toBe(5);
    calm(fight, FLIGHT);
    expect(fight.hp).toBe(4);
    for (let n = 0; n < 14 && !fight.end; n++) calm(fight, .5);
    expect(fight.end).toBe("won");
    expect(fight.used).toEqual({ wax: 1, gold: 2 });
    expect(fight.stock).toEqual({ wax: 0, gold: 0 });
  });

  it("keeps home throws free", () => {
    const home = new DodgeFight("home", "common", { wax: 0, gold: 0 });
    calm(home, 2);
    expect(home.hp).toBe(9);
    expect(home.used).toEqual({ wax: 0, gold: 0 });
  });

  it("snaps a drag to lanes and recognizes an upward flick", () => {
    expect(dragLane(1, 0, 400)).toBe(1);
    expect(dragLane(1, 40, 400)).toBe(1);
    expect(dragLane(1, 60, 400)).toBe(2);
    expect(dragLane(1, -60, 400)).toBe(0);
    expect(dragLane(0, 400, 400)).toBe(2);
    expect(dragLane(2, -999, 400)).toBe(0);
    expect(isFlick(4, -31, 120)).toBe(true);
    expect(isFlick(4, -31, 200)).toBe(false);
    expect(isFlick(40, -31, 100)).toBe(false);
    expect(isFlick(0, 40, 100)).toBe(false);
  });

  it("never lets the Landmark combo make a third wave in a row", () => {
    const fight = new DodgeFight("landmark", "common", { wax: 40, gold: 0 }, () => 0);
    fight.hp = 10;
    fight.forcedAttacks = ["wave", "wave"];
    const kinds: string[] = [];
    for (let n = 0; n < 3; n++) {
      (fight as unknown as { comboShot: boolean }).comboShot = false;
      (fight as unknown as { announceAttack(): void }).announceAttack();
      kinds.push(fight.attack!.kind);
    }
    expect(kinds).toEqual(["wave", "wave", "shot"]);
  });
});
