import { describe, expect, it } from "vitest";
import { asNamedModel, MONUMENT_SEED, monumentTop, paintMonuments } from "./monuments";

describe("named models", () => {
  it("turns each hand-made shape into its named model and draws it identically", () => {
    for (const place of ["taipei101", "senado", "hkust"] as const) {
      const seed = MONUMENT_SEED[place];
      const named = asNamedModel(seed.monument)!;
      expect(named.custom).toBeNull();
      expect(named.model).toEqual({ kind: place, size: "m", rotate: 0, color: "landmark" });
      expect(named.buildings).toEqual(seed.monument.buildings);
      const draw = (m: typeof named) => paintMonuments([{ id: "x", lat: seed.lat, lng: seed.lng, monument: m }]);
      expect(draw(named)).toEqual(draw(seed.monument));
      expect(monumentTop(named)).toBe(monumentTop(seed.monument));
    }
  });

  it("leaves other shapes alone", () => {
    const other = { custom: { color: "ink" as const, tiers: [[3, 0, 9] as [number, number, number]] } };
    expect(asNamedModel(other)).toBe(other);
    expect(asNamedModel(null)).toBeNull();
  });
});
