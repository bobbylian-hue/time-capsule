import { describe, expect, it } from "vitest";
import { numberedNames } from "./waypostNames";

const taken = (zh: string[], en: string[]) => ({ zh: new Set(zh), en: new Set(en) });

describe("numberedNames", () => {
  it("keeps a name nobody uses", () => {
    expect(numberedNames("大安森林公園", "Daan Park", taken(["信義廣場"], ["Xinyi Plaza"]))).toEqual({ zh: "大安森林公園", en: "Daan Park", n: null });
  });
  it("numbers both names the same when either is taken", () => {
    expect(numberedNames("大安森林公園", "Daan Park", taken(["大安森林公園"], []))).toEqual({ zh: "大安森林公園（2）", en: "Daan Park (2)", n: 2 });
    expect(numberedNames("大安森林公園", "Daan Park", taken([], ["Daan Park"]))).toEqual({ zh: "大安森林公園（2）", en: "Daan Park (2)", n: 2 });
  });
  it("skips numbers already used", () => {
    expect(numberedNames("公園", "Park", taken(["公園", "公園（2）"], ["Park (3)"])).n).toBe(4);
  });
  it("keeps a name's own number apart from the added one", () => {
    expect(numberedNames("台北公園1", "Taipei Park 1", taken([], ["Taipei Park 1"])).en).toBe("Taipei Park 1 (2)");
  });
  it("leaves an empty name empty", () => {
    expect(numberedNames("", "Pier", taken([], ["Pier"]))).toEqual({ zh: "", en: "Pier (2)", n: 2 });
  });
});
