import { describe, expect, it } from "vitest";
import { ATTACK_WEIGHTS, attackTable, CHARGE, DodgeFight, dodgeSwipe, fightHealthTicks, FLIGHT, LIVES, pickAttack, TRIPLE_CAP, WIND, fightHealth, type AttackKind } from "./dodgeFightRules";

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
  it("uses rarity health 5/6/7, 20 HP for landmarks, and 5 HP at home", () => {
    expect((["common", "uncommon", "rare"] as const).map((rarity) => fightHealth("corrupted", rarity))).toEqual([5, 6, 7]);
    expect(fightHealth("landmark", "common")).toBe(20);
    expect(fightHealth("home", "rare")).toBe(5);
  });

  it("gathers, winds up, launches, then hits for one wax damage", () => {
    const fight = new DodgeFight("corrupted", "common", stock, () => .5);
    advance(fight, CHARGE + .02);
    expect(fight.frame.wind).toBeGreaterThan(0);
    expect(fight.flight).toBeNull();
    advance(fight, WIND);
    expect(fight.flight?.ball).toBe("wax");
    expect(fight.stock.wax).toBe(29);
    expect(fight.hp).toBe(5);
    advance(fight, FLIGHT);
    expect(fight.hp).toBe(4);
    expect(fight.damage).toBe(1);
  });

  it("scatters a windup on a step and only charges once back on the ground", () => {
    const fight = new DodgeFight("corrupted", "rare", stock);
    advance(fight, 1);
    fight.input("left");
    expect(fight.frame.scatterAt).toBe(fight.frame.now);
    advance(fight, .15);
    expect(fight.frame.x).toBeCloseTo(.2);
    expect(fight.flight).toBeNull();
    fight.input("left");
    fight.input("jump");
    advance(fight, .38);
    expect(fight.frame.jump).toBeGreaterThan(.9);
    expect(fight.frame.charge).toBe(0);
    advance(fight, .5);
    expect(fight.frame.x).toBeCloseTo(.2);
    expect(fight.frame.charge).toBeGreaterThan(0);
  });

  it("uses gold for two damage and falls back to wax, then stops without a ball", () => {
    const fight = new DodgeFight("landmark", "common", { wax: 1, gold: 1 }, () => .5);
    fight.chooseBall("gold");
    advance(fight, 1.15);
    expect(fight.flight?.ball).toBe("gold");
    expect(fight.ball).toBe("wax");
    advance(fight, .62);
    expect(fight.hp).toBe(18);
    advance(fight, 1.3);
    expect(fight.hp).toBe(17);
    expect(fight.end).toBe("empty");
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
    calm(fight, 7);
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
    expect(grounded.frame.charge).toBeLessThan(.2);
    expect(grounded.frame.scatterAt).toBeGreaterThan(0);
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

    const timed = new DodgeFight("landmark", "common", { wax: 500, gold: 0 }, () => .5);
    expect(timed.secondsLeft).toBe(150);
    // Keep changing lanes between frames, dodging aimed shots without launching.
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

  it("does not count a charge interrupted before launch or free home throws", () => {
    const fight = new DodgeFight("corrupted", "common", stock);
    advance(fight, CHARGE);
    fight.input("left");
    expect(fight.used).toEqual({ wax: 0, gold: 0 });
    const home = new DodgeFight("home", "common", { wax: 0, gold: 0 });
    calm(home, 2);
    expect(home.hp).toBe(4);
    expect(home.used).toEqual({ wax: 0, gold: 0 });
  });

  it("marks hits on the health bar and recognizes swipes from movement", () => {
    expect(fightHealthTicks("home", 3)).toEqual([1 / 3, 2 / 3]);
    expect(fightHealthTicks("corrupted", 4)).toEqual([.25, .5, .75]);
    expect(fightHealthTicks("corrupted", 5)).toEqual([.2, .4, .6, .8]);
    expect(fightHealthTicks("landmark", 20)).toEqual([.25, .5, .75]);
    expect(dodgeSwipe(23, 0)).toBeNull();
    expect(dodgeSwipe(24, 6)).toBe("right");
    expect(dodgeSwipe(-24, -5)).toBe("left");
    expect(dodgeSwipe(10, -24)).toBe("jump");
    expect(dodgeSwipe(0, 50)).toBeNull();
  });
});
