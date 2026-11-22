import { describe, expect, it } from "vitest";
import { insideBorder, type Border } from "./border";

const square: Border = { type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

describe("city border", () => {
  it("is inside the outline and outside its holes", () => {
    expect(insideBorder(square, { lat: 2, lng: 2 })).toBe(true);
    expect(insideBorder(square, { lat: 5, lng: 5 })).toBe(false);
    expect(insideBorder(square, { lat: 12, lng: 2 })).toBe(false);
  });
  it("handles several pieces, and refuses nothing without a border", () => {
    const islands: Border = { type: "MultiPolygon", coordinates: [square.coordinates as number[][][], [[[20, 20], [22, 20], [22, 22], [20, 22], [20, 20]]]] };
    expect(insideBorder(islands, { lat: 21, lng: 21 })).toBe(true);
    expect(insideBorder(islands, { lat: 15, lng: 15 })).toBe(false);
    expect(insideBorder(null, { lat: 15, lng: 15 })).toBe(true);
  });
});
