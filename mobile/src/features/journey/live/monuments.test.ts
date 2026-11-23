import { describe, expect, it } from "vitest";
import { asNamedModel, MONUMENT_SEED, monumentTop, paintMonuments, sameJson } from "./monuments";

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

describe("saved looks from the server", () => {
  // jsonb returns keys in its own order (HKUST: buildings came back as ids, top, color, real_top).
  const reorder = (v: unknown): unknown => Array.isArray(v) ? v.map(reorder)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reorder(x)])) : v;

  it("treats a look with keys in another order, or empty keys missing, as unchanged", () => {
    const edited = { buildings: { ids: [1, 2], real_top: 38, top: 14, color: "landmark" }, model: null, custom: null };
    expect(sameJson(edited, { buildings: { color: "landmark", top: 14, real_top: 38, ids: [1, 2] } })).toBe(true);
    expect(sameJson(edited, { buildings: { ids: [2, 1], real_top: 38, top: 14, color: "landmark" } })).toBe(false);
  });

  it("still finds the named model when the server reordered the tiers' options", () => {
    for (const place of ["taipei101", "senado", "hkust"] as const) {
      const fromServer = reorder(MONUMENT_SEED[place].monument) as typeof MONUMENT_SEED[typeof place]["monument"];
      expect(asNamedModel(fromServer)!.model?.kind).toBe(place);
    }
  });
});
