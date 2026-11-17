import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn() } }));

import { CITIES, MAX_GUESSES, cityAt, cityPuzzle, CityPuzzleError, judge, localPriceText, localText, parseGuess, shareText, usdText, type CityPuzzle } from "./cityPuzzle";

describe("judge", () => {
  it("wins within 10% either way", () => {
    expect(judge(1.8, 2).hint).toBe("solved");
    expect(judge(2.2, 2).hint).toBe("solved");
    expect(judge(1.79, 2).hint).toBe("higher");
    expect(judge(2.21, 2).hint).toBe("lower");
  });
  it("says close within 25% and not beyond", () => {
    expect(judge(1.5, 2)).toEqual({ hint: "higher", close: true });
    expect(judge(1.4, 2)).toEqual({ hint: "higher", close: false });
    expect(judge(2.5, 2)).toEqual({ hint: "lower", close: true });
    expect(judge(9, 2)).toEqual({ hint: "lower", close: false });
  });
});

describe("money", () => {
  it("shows US dollars without empty decimals", () => {
    expect(usdText(2)).toBe("US$ 2");
    expect(usdText(1.5)).toBe("US$ 1.5");
    expect(usdText(1.88)).toBe("US$ 1.88");
  });
  it("turns a dollar guess into the city's money", () => {
    expect(localText(2, { currency: "NT$", rate: 32 })).toBe("NT$ 64");
    expect(localText(1.5, { currency: "HK$", rate: 7.8 })).toBe("HK$ 11.7");
    expect(localText(1, { currency: "S$", rate: 1.35 })).toBe("S$ 1.4");
  });
  it("shows the answer's checked local price as stored, not converted back", () => {
    expect(localPriceText(200, "NT$")).toBe("NT$ 200");
    expect(localPriceText(11.5, "MOP")).toBe("MOP 11.5");
  });
  it("reads a typed guess", () => {
    expect(parseGuess("2")).toBe(2);
    expect(parseGuess(" $1.85 ")).toBe(1.85);
    expect(parseGuess("US$ 1,200")).toBe(1200);
    for (const bad of ["", "0", "-3", "1.234", "abc", "1e3"]) expect(parseGuess(bad)).toBeNull();
  });
});

describe("shareText", () => {
  const base: CityPuzzle = { city: "taipei", no: 12, question_zh: "", question_en: "", vessel: "bubble-tea", currency: "NT$", rate: 32, guesses: [], done: true, won: true, answer: null, reward: 3 };
  it("shows arrows and the count, never a price", () => {
    const text = shareText({ ...base, guesses: [{ usd: 1, hint: "higher", close: false }, { usd: 5, hint: "lower", close: false }, { usd: 1.9, hint: "solved", close: true }] }, "Taipei", "Time Capsule");
    expect(text).toBe("Time Capsule · Taipei #12 · 3/6\n⬆️⬇️✅");
  });
  it("marks a miss with X", () => {
    const text = shareText({ ...base, won: false, guesses: Array.from({ length: MAX_GUESSES }, () => ({ usd: 1, hint: "higher" as const, close: false })) }, "台北", "時光膠囊");
    expect(text.startsWith("時光膠囊 · 台北 #12 · X/6")).toBe(true);
  });
});

describe("cityAt", () => {
  it("finds the playable city you are standing in", () => {
    expect(cityAt({ lat: 25.0375, lng: 121.5628 })?.id).toBe("taipei");
    expect(cityAt({ lat: 22.19, lng: 113.54 })?.id).toBe("macau");
  });
  it("is nothing far from every playable city, and for cities that are only coming soon", () => {
    expect(cityAt({ lat: 40.71, lng: -74.0 })).toBeNull();
    expect(cityAt({ lat: 35.7148, lng: 139.7967 })).toBeNull();
    expect(cityAt(null)).toBeNull();
  });
  it("lists every playable city with a Landmark and what it is known for", () => {
    for (const c of CITIES.filter((x) => x.playable)) expect(c.known_zh && c.known_en && c.landmark_zh && c.landmark_en).toBeTruthy();
  });
});

describe("sample puzzle", () => {
  it("keeps the price back until the puzzle ends, then pays once", async () => {
    const day = await cityPuzzle.today();
    expect(day.puzzles.map((p) => p.city)).toEqual(["taipei", "hongkong", "macau", "singapore"]);
    expect(day.puzzles.every((p) => p.answer === null && !p.done)).toBe(true);
    const first = await cityPuzzle.guess("taipei", 9);
    expect(first.puzzle.guesses).toEqual([{ usd: 9, hint: "lower", close: false }]);
    expect(first.puzzle.answer).toBeNull();
    const win = await cityPuzzle.guess("taipei", 1.9);
    expect(win.puzzle.won && win.puzzle.done).toBe(true);
    expect(win.puzzle.reward).toBe(3);
    expect(win.puzzle.answer?.local).toBe(60);
    expect(win.streak).toBe(day.streak + 1);
    await expect(cityPuzzle.guess("taipei", 2)).rejects.toBeInstanceOf(CityPuzzleError);
    expect((await cityPuzzle.today()).puzzles[0].done).toBe(true);
  });
  it("ends after six misses with the smaller reward, and the streak rises only once a day", async () => {
    let out = await cityPuzzle.guess("macau", 50);
    for (let i = 1; i < MAX_GUESSES; i++) out = await cityPuzzle.guess("macau", 50);
    expect(out.puzzle.done && !out.puzzle.won).toBe(true);
    expect(out.puzzle.reward).toBe(1);
    expect(out.streak).toBe(3);
  });
});
