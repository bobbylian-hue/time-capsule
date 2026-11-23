// Landmark monuments as data (docs/design/map-builder.md, R2). Before R2 they were code in mapHtml.ts; now each
// Landmark carries a `monument` the admin builds and Journey draws. Three ways, mixable:
// - buildings: real buildings from our map tiles, picked by feature id and repainted, drawn at toy height;
// - model: one of eight ready-made shapes built from the map's own boxes, discs and arcs;
// - custom: hand-stacked tiers for shapes nothing else makes (Taipei 101's flares, the Senado fountain, HKUST).
// No monument (null) means the seal only. Everything is centred on the Landmark's point, where its seal floats.
import { C } from "../../../theme";

export type MonumentColor = "landmark" | "ink" | "light" | "glass" | "wax" | "brass";
export const MONUMENT_COLORS: MonumentColor[] = ["landmark", "ink", "light", "glass", "wax", "brass"];
export type ModelKind = "tower" | "pagoda" | "gate" | "fountain" | "column" | "pavilion" | "dome" | "statue";
export const MODEL_KINDS: ModelKind[] = ["tower", "pagoda", "gate", "fountain", "column", "pavilion", "dome", "statue"];
export type ModelSize = "s" | "m" | "l";
/**
 * [half-width m, base m, top m, options]: a box centred on the Landmark. Options: `round` (a disc of that radius),
 * `rect` (a box of these half sizes east-west and north-south instead of a square), `dx`/`dy` (shift east/north in m),
 * `arc` (a curved band from radius `inner` to the half-width, between two angles in degrees: 0 = east, 90 = north).
 */
export type Tier = [number, number, number, { round?: boolean; rect?: [number, number]; dx?: number; dy?: number; arc?: { inner: number; from: number; to: number } }?];
export type Monument = {
  /** Tile buildings: their feature ids, the real height of the tallest, and the toy height it is drawn at. */
  buildings?: { ids: number[]; real_top: number; top: number; color: MonumentColor } | null;
  model?: { kind: ModelKind; size: ModelSize; rotate: number; color: MonumentColor } | null;
  /** Hand-tuned tiers, shown as "Custom" in the builder. */
  custom?: { tiers: Tier[]; color: MonumentColor } | null;
};
/** A monument at its Landmark: `id` is the Landmark Waypost's id (what a tap on it selects). */
export type PlacedMonument = { id: string; lat: number; lng: number; monument: Monument };

const SIZE: Record<ModelSize, number> = { s: 0.6, m: 1, l: 1.5 };
/** The eight ready-made models, at size M, as tiers. Built so they read at the toy city's scale. */
export const MODELS: Record<ModelKind, Tier[]> = {
  tower: [[8, 0, 10], [6.5, 10, 22], [5, 22, 32], [3, 32, 38], [1, 38, 46]],
  pagoda: [[7, 0, 1.2], ...[0, 1, 2, 3, 4].flatMap((i): Tier[] => {
    const b = 1.2 + i * 4.2;
    return [[4.6 - i * 0.55, b, b + 3.2], [7.2 - i * 0.75, b + 3.2, b + 4.2]];
  }), [0.5, 22.2, 26, { round: true }]],
  gate: [[1.4, 0, 10, { dx: -6 }], [1.4, 0, 10, { dx: 6 }], [0, 8, 9.6, { rect: [8.5, 1.2] }], [0, 10.4, 11.6, { rect: [10.5, 1.6] }]],
  fountain: [[9, 0, 0.5, { round: true }], [7, 0.5, 2, { arc: { inner: 6, from: 0, to: 180 } }], [7, 0.5, 2, { arc: { inner: 6, from: 180, to: 360 } }],
    [6, 0.5, 1, { round: true }], [1.5, 1, 4, { round: true }], [3, 4, 4.6, { round: true }], [0.8, 4.6, 6.5, { round: true }]],
  column: [[3, 0, 1, { round: true }], [1.4, 1, 14, { round: true }], [2.2, 14, 15, { round: true }], [1, 15, 17.5, { round: true }]],
  pavilion: [[7, 0, 1, { round: true }], [0.5, 1, 5, { dx: 4.5, dy: 4.5 }], [0.5, 1, 5, { dx: -4.5, dy: 4.5 }], [0.5, 1, 5, { dx: 4.5, dy: -4.5 }], [0.5, 1, 5, { dx: -4.5, dy: -4.5 }],
    [7.5, 5, 5.8, { round: true }], [5, 5.8, 6.8, { round: true }], [2.5, 6.8, 7.6, { round: true }], [0.6, 7.6, 9, { round: true }]],
  dome: [[8, 0, 6, { round: true }], [7, 6, 8, { round: true }], [6, 8, 9.5, { round: true }], [4.5, 9.5, 10.6, { round: true }], [2.5, 10.6, 11.3, { round: true }], [0.6, 11.3, 13, { round: true }]],
  statue: [[3, 0, 3], [2.2, 3, 4], [1, 4, 9, { round: true }], [0.7, 9, 10.2, { round: true }]],
};

const flare = (from: number, h: number, narrow: number, wide: number): Tier[] => [[narrow, from, from + h * .35], [(narrow + wide) / 2, from + h * .35, from + h * .7], [wide, from + h * .7, from + h]];
/**
 * The three monuments that were code before R2, moved into data with no visible change. Codex seeds them from this
 * JSON (MONUMENT_SEED) exactly; Journey also uses it before the R2 backend is live, keyed by the Landmark's place.
 */
export const MONUMENT_SEED: Record<string, { lat: number; lng: number; monument: Monument }> = {
  // Spire axis from the OSM building data in our tiles; Wikipedia agrees within ~20 m.
  taipei101: { lat: 25.033667, lng: 121.56481, monument: { custom: { color: "landmark", tiers: [
    // A wide low base covers the real (grey) mall around the tower foot.
    [62, 0, 18], [36, 18, 24], [24, 24, 30], [21, 30, 36],
    ...Array.from({ length: 8 }, (_, i) => flare(36 + i * 8, 8, 14, 18.5)).flat(),
    [12, 100, 106], [8, 106, 112], [4, 112, 116], [1.6, 116, 142],
  ] } } },
  // Senado Square: the fountain (wide round basin, inner bowl, small armillary globe) at the fountain basin in our tiles, and
  // the buildings lining the square (tile buildings within 3 m of OSM way 192573684; Leal Senado is across the road).
  senado: { lat: 22.193683, lng: 113.53989, monument: {
    buildings: { color: "landmark", real_top: 26.2, top: 12, ids: [35184577873359, 35185133855962, 35185133855963, 35184763410348, 35185029968552, 35185133855967, 35185133855964, 35185133855966, 35185133855960, 35185133855961, 35184763410351, 35185190550958, 35185133855953, 35184637522361, 35184702457087, 35185152337983, 35184702457086] },
    custom: { color: "landmark", tiers: [
      [13, 0, .5, { round: true }],
      [9, .5, 3.5, { arc: { inner: 7.4, from: 0, to: 180 } }], [9, .5, 3.5, { arc: { inner: 7.4, from: 180, to: 360 } }],
      [7.4, .5, 1.6, { round: true }],
      [4, 1.6, 5, { round: true }], [1.6, 5, 7.5, { round: true }],
      [2.2, 7.5, 8.5, { round: true }], [3.2, 8.5, 10, { round: true }], [3.6, 10, 11.5, { round: true }], [3.2, 11.5, 13, { round: true }], [2.2, 13, 14, { round: true }],
      [1.5, 14, 15, { round: true }],
      [4.6, 10.3, 11.2, { arc: { inner: 4.1, from: 0, to: 180 } }], [4.6, 10.3, 11.2, { arc: { inner: 4.1, from: 180, to: 360 } }],
    ] } } },
  // HKUST: the curved academic building that wraps the Piazza, opening west towards the gate; every tile building inside
  // the campus outline (OSM way 40664120) is blue too; the Red Bird (OSM node 2439950828) stands at the seal.
  hkust: { lat: 22.3374255, lng: 114.2629606, monument: {
    buildings: { color: "landmark", real_top: 38, top: 14, ids: [
      35184588150781, 35184588150874, 35184588151507, 35184588151845, 35184604980730, 35184604980739, 35184605712876, 35184605712877,
      35184605712878, 35184605712879, 35184605712885, 35184607417841, 35184607417844, 35184607417847, 35184607417851, 35184607946900,
      35184607946908, 35184608001582, 35184608002636, 35184608003256, 35184608003258, 35184608003259, 35184608003393, 35184608118220,
      35184608118222, 35184608118225, 35184608118226, 35184608118228, 35184608234791, 35184608234793, 35184608234794, 35184609084167,
      35184612483705, 35184612483717, 35184612546772, 35184612546783, 35184612546784, 35184635582360, 35184635582361, 35184650365030,
      35184650365035, 35184650365036, 35184650365040, 35184650365043, 35184650365055, 35184650365059, 35184660294276, 35184675660611,
      35184687662679, 35184687793739, 35184740860876, 35184961096812, 35185113745772, 35185113746500, 35185113746501, 35185113746502,
      35185132194864, 35185133480445, 35185133480455, 35185301575605, 35185382178161, 35185478357636, 35185478357638, 35185478357639,
      35185478357640, 35185684953432, 35185684953433, 35185684953434, 35185684953436, 35185797136924, 35185797136925, 35185797136926,
      35185797136927, 35185797247856, 35185797247857, 35185930730155, 35185932128835, 35185932223402, 35185932693361, 35185932930162,
      35185932930163, 35185933216948, 52776561307952,
    ] },
    custom: { color: "landmark", tiers: [
      [64, 0, 14, { arc: { inner: 50, from: -80, to: 100 } }], [62, 14, 18, { arc: { inner: 53, from: -76, to: 96 } }],
      [8, 0, .5, { round: true }],
      [2.6, .5, 1.5, { round: true, dx: -9 }], [2.6, .5, 1.5, { round: true, dx: -7.5, dy: -1 }],
      [1.7, .5, 3, { round: true, dx: -8, dy: 3.5 }], [1.5, 3, 5, { round: true, dx: -9, dy: 4.5 }],
      [2.5, .5, 2.5, { round: true, dx: -5.5 }], [2.4, 2.5, 4.5, { round: true, dx: -3.5 }], [2.3, 4.5, 6.5, { round: true, dx: -1.5 }],
      [2.2, 6.5, 8.5, { round: true }], [2, 8.5, 10.5, { round: true, dx: .8 }], [1.9, 10.5, 12.5, { round: true, dx: .8 }],
      [1.8, 12.5, 14.5, { round: true }], [1.7, 14.5, 16, { round: true, dx: 1.5 }], [1.6, 16, 17.5, { round: true, dx: 3 }],
      [1.5, 17.5, 19, { round: true, dx: 4.5 }], [1.5, 19, 20, { round: true, dx: 6 }],
    ] } } },
};

/** The tiers a model draws at its size, turned by `rotate` degrees (clockwise seen from above, like a compass). */
export function modelTiers(model: NonNullable<Monument["model"]>): Tier[] {
  const k = SIZE[model.size] ?? 1;
  return MODELS[model.kind].map(([half, base, top, o]) => [half * k, base * k, top * k, o && {
    ...o, rect: o.rect && [o.rect[0] * k, o.rect[1] * k], dx: o.dx != null ? o.dx * k : undefined, dy: o.dy != null ? o.dy * k : undefined,
    arc: o.arc && { ...o.arc, inner: o.arc.inner * k },
  }] as Tier);
}

/** Where the seal floats: the top of whatever is built (0 for the seal alone). */
export function monumentTop(m: Monument | null | undefined): number {
  if (!m) return 0;
  const tiers = [...(m.custom?.tiers ?? []), ...(m.model ? modelTiers(m.model) : [])];
  return Math.max(m.buildings?.top ?? 0, 0, ...tiers.map((t) => t[2]));
}

/** The Landmark blues, bottom to top (the default); the other colours are one paint with the map's soft gradient. */
const RAMP: [number, string][] = [[0, C.ink], [0.35, C.blue], [0.75, C.lightBlue], [1, C.glass]];
export const COLOR_HEX: Record<MonumentColor, string> = { landmark: C.blue, ink: C.ink, light: C.lightBlue, glass: C.glass, wax: C.wax, brass: C.brass };
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const rampAt = (t: number) => {
  const i = RAMP.findIndex(([at]) => at >= t);
  if (i <= 0) return RAMP[0][1];
  const [a0, c0] = RAMP[i - 1], [a1, c1] = RAMP[i];
  return mix(c0, c1, (t - a0) / (a1 - a0));
};

/** What the map page draws: tier shapes with their colours, and how to repaint and scale the chosen tile buildings. */
export type MonumentPaint = {
  geo: { type: "FeatureCollection"; features: unknown[] };
  /** Tile building id → [toy scale, colour]. */
  tiles: Record<string, [number, string]>;
  /** Tile building id → monument id, for taps. */
  owner: Record<string, string>;
};

export function paintMonuments(list: PlacedMonument[]): MonumentPaint {
  const features: unknown[] = [], tiles: MonumentPaint["tiles"] = {}, owner: MonumentPaint["owner"] = {};
  for (const p of list) {
    const m = p.monument, top = monumentTop(m) || 1;
    const groups: [Tier[], MonumentColor, number][] = [];
    if (m.custom) groups.push([m.custom.tiers, m.custom.color, 0]);
    if (m.model) groups.push([modelTiers(m.model), m.model.color, m.model.rotate || 0]);
    for (const [tiers, color, rotate] of groups) for (const tier of tiers) {
      const ring = tierRing(p.lat, p.lng, tier, rotate);
      const t = (tier[1] + tier[2]) / 2 / top;
      features.push({ type: "Feature", properties: { id: p.id, base: tier[1], top: tier[2], c: color === "landmark" ? rampAt(t) : COLOR_HEX[color] },
        geometry: { type: "Polygon", coordinates: [ring] } });
    }
    if (m.buildings) for (const id of m.buildings.ids) {
      tiles[String(id)] = [m.buildings.top / (m.buildings.real_top || 1), COLOR_HEX[m.buildings.color]];
      owner[String(id)] = p.id;
    }
  }
  return { geo: { type: "FeatureCollection", features }, tiles, owner };
}

/** One tier's outline as [lng, lat] points, turned `rotate` degrees clockwise about the Landmark's point. */
function tierRing(lat: number, lng: number, [half, , , o]: Tier, rotate: number): number[][] {
  const mLat = 110540, mLng = 111320 * Math.cos(lat * Math.PI / 180);
  const r = -rotate * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  // Metres east/north of the Landmark → turned → degrees.
  const to = (x: number, y: number) => [lng + (x * cos - y * sin) / mLng, lat + (x * sin + y * cos) / mLat];
  const cx = o?.dx ?? 0, cy = o?.dy ?? 0;
  const at = (rad: number, deg: number) => to(cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180));
  const arc = o?.arc;
  if (arc) {
    const steps = Math.max(6, Math.ceil(Math.abs(arc.to - arc.from) / 7.5));
    return [...Array.from({ length: steps + 1 }, (_, k) => at(half, arc.from + (arc.to - arc.from) * k / steps)),
      ...Array.from({ length: steps + 1 }, (_, k) => at(arc.inner, arc.to - (arc.to - arc.from) * k / steps)), at(half, arc.from)];
  }
  if (o?.round) return Array.from({ length: 25 }, (_, k) => at(half, k / 24 * 360));
  const [hx, hy] = o?.rect ?? [half, half];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, y]) => to(cx + x * hx, cy + y * hy));
}
