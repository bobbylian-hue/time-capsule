// A city's border (map builder R1). Kept free of imports so the sample and the screens can both use it.
/** A city's outline: the real OpenStreetMap border cut to its map tiles. */
export type Border = { type: "Polygon"; coordinates: number[][][] } | { type: "MultiPolygon"; coordinates: number[][][][] };
const inRing = (x: number, y: number, ring: number[][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPolygon = (x: number, y: number, rings: number[][][]) => inRing(x, y, rings[0]) && !rings.slice(1).some((hole) => inRing(x, y, hole));
/** Inside the city's border. A city without a border yet refuses nothing here; the server still checks. */
export function insideBorder(border: Border | null | undefined, at: { lat: number; lng: number }) {
  if (!border) return true;
  return border.type === "Polygon" ? inPolygon(at.lng, at.lat, border.coordinates) : border.coordinates.some((p) => inPolygon(at.lng, at.lat, p));
}

