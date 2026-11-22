// Development-only sample for the admin screens (docs/design/admin.md) until Codex's functions land.
// Counts and vessel sets follow what is live; pin positions are scattered around each city and are not
// real Wayposts. Changes made here last until the page reloads.
import type {
  ActivityRow, AdminRole, CityMap, Habitat, MapSpot, MapWaypost, Member, Person, QueueItem, QueueKind, Rarity, Region, Scene, SpawnChange, SpawnPlace,
  SpawnPreview, SpawnRule, Spawning, WaveCapsule, WaveConfig, WaypostCheck,
} from "./admin";
import { STARTER_VESSELS } from "./vesselAccess";
import { VESSELS } from "../features/shop/strings";
import { insideBorder, type Border } from "./border";

const ROY: Person = { id: "1fd214ef-4de5-4b4f-81bc-77c3328441fe", name: "Roy", avatar: { set: "illus", id: "01" } };
const MEI: Person = { id: "sample-mei", name: "Mei", avatar: { set: "illus", id: "04" } };
const KAI: Person = { id: "sample-kai", name: "Kai", avatar: { set: "illus", id: "06" } };
const PEOPLE: Person[] = [
  { id: "p1", name: "阿哲", avatar: { set: "illus", id: "02" } },
  { id: "p2", name: "Lena", avatar: { set: "illus", id: "03" } },
  { id: "p3", name: "小雨", avatar: { set: "illus", id: "05" } },
  { id: "p4", name: "Sam", avatar: { set: "illus", id: "07" } },
  { id: "p5", name: "Joyce", avatar: { set: "illus", id: "08" } },
];

const EARNED = ["clock-tower", "senado-fountain", "bamboo-tower", "gate-lantern", "torii-scroll", "palace-pavilion", "lionfish-fountain", "golden-roof", "gate-lacquer", "twin-towers", "red-bird"];
const SETS: Record<string, [string, string, string]> = {
  taipei: ["bubble-tea", "bento", "hot-air-balloon"],
  "hong-kong": ["dim-sum-steamer", "postbox", "phone-booth"],
  singapore: ["lucky-stars", "mixtape", "instant-camera"],
  macau: ["candy-box", "musicbox", "pocket-watch"],
};
const RARITY: Rarity[] = ["common", "uncommon", "rare"];

const REGIONS: Region[] = [
  { id: "taipei", country_zh: "台灣", country_en: "Taiwan", name_zh: "台北", name_en: "Taipei", timezone: "Asia/Taipei", center: { lat: 25.0375, lng: 121.5637 },
    wayposts: { common: 54, landmark: 1 }, corrupted_spots: 77, capsule_spots: 18, vessels: SETS.taipei, out_now: 0, city_hunts_live: 1, private_hunts: 2,
    coverage: { covered: true, bytes: 14_200_000, built_at: "2026-11-07" } },
  { id: "hong-kong", country_zh: "香港", country_en: "Hong Kong", name_zh: "香港", name_en: "Hong Kong", timezone: "Asia/Hong_Kong", center: { lat: 22.2985, lng: 114.1720 },
    wayposts: { common: 14, landmark: 2 }, corrupted_spots: 22, capsule_spots: 17, vessels: SETS["hong-kong"], out_now: 0, city_hunts_live: 1, private_hunts: 0,
    coverage: { covered: true, bytes: 16_900_000, built_at: "2026-11-07" } },
  { id: "singapore", country_zh: "新加坡", country_en: "Singapore", name_zh: "新加坡", name_en: "Singapore", timezone: "Asia/Singapore", center: { lat: 1.2894, lng: 103.8504 },
    wayposts: { common: 42, landmark: 1 }, corrupted_spots: 58, capsule_spots: 6, vessels: SETS.singapore, out_now: 0, city_hunts_live: 0, private_hunts: 0,
    coverage: { covered: true, bytes: 9_800_000, built_at: "2026-11-07" } },
  { id: "macau", country_zh: "澳門", country_en: "Macau", name_zh: "澳門", name_en: "Macau", timezone: "Asia/Macau", center: { lat: 22.1935, lng: 113.5420 },
    wayposts: { common: 33, landmark: 1 }, corrupted_spots: 36, capsule_spots: 8, vessels: SETS.macau, out_now: 0, city_hunts_live: 1, private_hunts: 1,
    coverage: { covered: true, bytes: 4_300_000, built_at: "2026-11-07" } },
];
const LANDMARKS: Record<string, MapWaypost[]> = {
  taipei: [{ id: "lm-101", name_zh: "台北101", name_en: "Taipei 101", lat: 25.033667, lng: 121.56481, kind: "landmark", game_enabled: true }],
  "hong-kong": [
    { id: "lm-clock", name_zh: "尖沙咀鐘樓", name_en: "TST Clock Tower", lat: 22.29348, lng: 114.16949, kind: "landmark", game_enabled: true },
    { id: "lm-hkust", name_zh: "科大日晷", name_en: "HKUST Sundial", lat: 22.3374255, lng: 114.2629606, kind: "landmark", game_enabled: true },
  ],
  singapore: [{ id: "lm-merlion", name_zh: "魚尾獅", name_en: "Merlion", lat: 1.28681, lng: 103.85453, kind: "landmark", game_enabled: true }],
  macau: [{ id: "lm-senado", name_zh: "議事亭前地噴水池", name_en: "Senado Square fountain", lat: 22.193683, lng: 113.53989, kind: "landmark", game_enabled: true }],
};
const KEEPERS: Record<string, CityMap["keepers"]> = {
  taipei: [{ hunt: "xinyi-2026-11", name_zh: "市府廣場", name_en: "Civic Square", lat: 25.037546, lng: 121.562754 }],
  "hong-kong": [{ hunt: "hkust-2026-11", name_zh: "LG7 草地", name_en: "LG7 Lawn", lat: 22.3368, lng: 114.2638 }],
  macau: [{ hunt: "senado-2026-11", name_zh: "區華利前地", name_en: "Jorge Álvares Square", lat: 22.1912, lng: 113.5418 }],
};

/** Taipei City's OpenStreetMap outline (relation 1293250) cut to the map tiles, as in the map builder demo. */
const BORDERS: Record<string, Border> = {
  taipei: { type: "Polygon", coordinates: [[[121.50994, 25.08448], [121.50994, 25.02162], [121.51055, 25.02181], [121.51908, 25.01978], [121.5258, 25.01168], [121.53237, 25.00782], [121.53422, 25.00314], [121.53137, 25.00101], [121.53056, 24.99791], [121.5317, 24.9905], [121.53517, 24.99514], [121.53687, 24.99277], [121.53704, 24.98849], [121.60182, 24.98849], [121.60195, 24.99037], [121.59907, 24.99167], [121.59814, 24.99454], [121.60055, 24.99843], [121.60041, 25.00119], [121.5977, 25.00428], [121.5959, 25.00451], [121.59737, 25.01466], [121.6027, 25.01516], [121.60416, 25.01911], [121.60819, 25.01943], [121.60925, 25.02096], [121.61581, 25.01923], [121.61581, 25.08448], [121.50994, 25.08448]]] },
};
/** Stands in for the S2 level-17 cell (about 70 m) in the sample; the real screens and server use S2 itself. */
const cellOf = (p: { lat: number; lng: number }) => `${Math.floor(p.lat / 0.00065)}:${Math.floor(p.lng / 0.0007)}`;

/** The same scatter every time, so the sample map doesn't jump between reloads. */
function scatter(seed: string, n: number, center: { lat: number; lng: number }, km: number) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const next = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 2 ** 32; };
  return Array.from({ length: n }, () => {
    const r = Math.sqrt(next()) * km, a = next() * Math.PI * 2;
    return { lat: center.lat + (r * Math.cos(a)) / 111, lng: center.lng + (r * Math.sin(a)) / (111 * Math.cos((center.lat * Math.PI) / 180)) };
  });
}

function waveEnd(now = Date.now()) {
  const step = config.wave_minutes * 60000;
  return new Date(Math.floor(now / step) * step + step).toISOString();
}
/** A stable number in [0, 1) for a key, so the same spot and wave always roll the same. */
function roll(key: string) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h / 2 ** 32;
}
/** What one spot shows in one wave, following the same steps as the server: show or not, a rarity, then a vessel from the place's pool (falling back to neighbouring rarities). */
function resolve(region: string, spot: string, slot: number, pool: SpawnRule[], cfg: WaveConfig): SpawnRule | null {
  if (roll(`${spot}:${slot}:show`) >= cfg.spawn_chance) return null;
  const hour = new Date(slot * cfg.wave_minutes * 60000).getUTCHours();
  const md = new Date(slot * cfg.wave_minutes * 60000).toISOString().slice(5, 10);
  const open = pool.filter((r) => (!r.hours || (r.hours[0] <= r.hours[1] ? hour >= r.hours[0] && hour <= r.hours[1] : hour >= r.hours[0] || hour <= r.hours[1]))
    && (!r.dates || (r.dates[0] <= r.dates[1] ? md >= r.dates[0] && md <= r.dates[1] : md >= r.dates[0] || md <= r.dates[1])));
  if (!open.length) return null;
  const total = cfg.weights.common + cfg.weights.uncommon + cfg.weights.rare;
  const x = roll(`${spot}:${slot}:rarity`) * total;
  const want: Rarity = x < cfg.weights.common ? "common" : x < cfg.weights.common + cfg.weights.uncommon ? "uncommon" : "rare";
  const order: Rarity[] = want === "common" ? ["common", "uncommon", "rare"] : want === "uncommon" ? ["uncommon", "common", "rare"] : ["rare", "uncommon", "common"];
  return [...open].sort((p, q) => order.indexOf(p.rarity ?? "common") - order.indexOf(q.rarity ?? "common")
    || roll(`${spot}:${slot}:vessel:${p.vessel}`) - roll(`${spot}:${slot}:vessel:${q.vessel}`))[0];
}
function wave(region: Region): WaveCapsule[] {
  const slot = Math.floor(Date.now() / (config.wave_minutes * 60000));
  const pool = poolFor(region.id, ruleState);
  return spotsFor(region).filter((s) => !s.hidden_at).flatMap((s) => {
    const picked = resolve(region.id, s.id, slot, pool, config);
    if (!picked) return [];
    return [{ spot: s.id, vessel: picked.vessel, rarity: picked.rarity ?? "common", lat: s.lat, lng: s.lng, expires_at: waveEnd(), caught: roll(`${s.id}:${slot}:caught`) < 0.2 }];
  });
}

// Places vessels can be assigned to. Taipei's set sits on Taiwan, so it reaches every Taiwan city.
const PLACES: SpawnPlace[] = [
  { id: "taiwan", parent: null, name_zh: "台灣", name_en: "Taiwan", country_zh: "台灣", country_en: "Taiwan", has_spots: true },
  { id: "taipei", parent: "taiwan", name_zh: "台北", name_en: "Taipei", country_zh: "台灣", country_en: "Taiwan", has_spots: true },
  { id: "hong-kong", parent: null, name_zh: "香港", name_en: "Hong Kong", country_zh: "香港", country_en: "Hong Kong", has_spots: true },
  { id: "singapore", parent: null, name_zh: "新加坡", name_en: "Singapore", country_zh: "新加坡", country_en: "Singapore", has_spots: true },
  { id: "macau", parent: null, name_zh: "澳門", name_en: "Macau", country_zh: "澳門", country_en: "Macau", has_spots: true },
];
const parentOf = (id: string) => PLACES.find((p) => p.id === id)?.parent ?? null;
/** The vessels a city can spawn: its own and its country's. */
const poolFor = (city: string, list: SpawnRule[]) => list.filter((r) => (r.places ?? []).some((p) => p === city || p === parentOf(city)));
const withRegions = (list: SpawnRule[]) => list.map((r) => ({ ...r, regions: REGIONS.filter((c) => (r.places ?? []).some((p) => p === c.id || p === parentOf(c.id))).map((c) => c.id) }));

let config: WaveConfig = { wave_minutes: 10, spawn_chance: 0.55, weights: { common: 70, uncommon: 25, rare: 5 }, nearby_max: 6, next_length: null,
  spin_wax_min: 10, spin_wax_max: 10 };
const postState = new Map<string, MapWaypost[]>();
const spotState = new Map<string, MapSpot[]>();
function postsFor(region: Region): MapWaypost[] {
  if (!postState.has(region.id)) {
    const scenes: Scene[] = ["park", "garden", "waterfront", "square", "publicArt"];
    postState.set(region.id, [
      ...scatter(`${region.id}-posts`, region.wayposts.common, region.center, 1.8).map((p, i): MapWaypost => ({
        id: `${region.id}-wp-${i}`, name_zh: `${region.name_zh}公園 ${i + 1}`, name_en: `${region.name_en} Park ${i + 1}`, ...p, kind: "common", game_enabled: true,
        scene: scenes[i % scenes.length], hidden_at: null, source_ref: `osm:way/${100000 + i}`,
      })),
      ...(LANDMARKS[region.id] ?? []),
    ]);
  }
  return postState.get(region.id)!;
}
function spotsFor(region: Region): MapSpot[] {
  if (!spotState.has(region.id)) {
    spotState.set(region.id, scatter(`${region.id}-spots`, region.corrupted_spots, region.center, 1.6).map((p, i) => ({ id: `${region.id}-spot-${i}`, ...p, habitat: null, hidden_at: null })));
  }
  return spotState.get(region.id)!;
}
const regionOfPost = (id: string) => REGIONS.find((r) => postsFor(r).some((w) => w.id === id));
const regionOfSpot = (id: string) => REGIONS.find((r) => spotsFor(r).some((w) => w.id === id));

/** Refuses the way the server does, with the same codes. */
const fail = (code: string): never => { throw new Error(code); };
function nearestPost(region: Region, at: { lat: number; lng: number }, skip?: string) {
  let best: { w: MapWaypost; m: number } | null = null;
  for (const w of postsFor(region)) {
    if (!w.game_enabled || w.id === skip) continue;
    const m = distance(at, w);
    if (!best || m < best.m) best = { w, m };
  }
  return best;
}
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371000, rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}
/** In the sample a City Hunt's area is 800 m around its Keeper and its spin quest needs 3 Wayposts. */
function huntsAround(region: Region, at: { lat: number; lng: number }, skip?: string) {
  return (KEEPERS[region.id] ?? []).filter((k) => distance(k, at) <= 800).map((k) => ({
    id: k.hunt, name_zh: k.name_zh, name_en: k.name_en, wayposts_needed: 3,
    wayposts_left: postsFor(region).filter((w) => w.game_enabled && w.kind === "common" && w.id !== skip && distance(k, w) <= 800).length,
  }));
}
function checkSpot(region: Region, at: { lat: number; lng: number }, skip?: string): WaypostCheck & { inside_border: boolean; same_cell: { id: string; name_zh: string; name_en: string; meters: number }[] } {
  const near = nearestPost(region, at, skip);
  const cell = cellOf(at);
  return {
    inside_border: insideBorder(BORDERS[region.id], at),
    same_cell: postsFor(region).filter((w) => w.game_enabled && w.id !== skip && cellOf(w) === cell)
      .map((w) => ({ id: w.id, name_zh: w.name_zh, name_en: w.name_en, meters: Math.round(distance(at, w)) })),
    inside_coverage: distance(region.center, at) <= 5000,
    nearest: near ? { id: near.w.id, name_zh: near.w.name_zh, name_en: near.w.name_en, meters: Math.round(near.m) } : null,
    live_hunts: huntsAround(region, at, skip),
  };
}
/** R1 rules: only the city border refuses; a nearby Waypost is a note, never a block. */
function guardPlace(region: Region, at: { lat: number; lng: number }) {
  if (!insideBorder(BORDERS[region.id], at)) fail("outside_border");
  if (!BORDERS[region.id] && distance(region.center, at) > 5000) fail("outside_coverage");
}
const guardWaypost = (region: Region, at: { lat: number; lng: number }, _note: string | null, _skip?: string) => guardPlace(region, at);
const clean = (x: string | null | undefined) => x ? x : null;
const hasChinese = (x: string) => /[\u3400-\u9fff]/.test(x);
/** Every place with spots keeps a vessel that can appear at any hour on any date, or its spots sit empty part of the day. */
function guardPools(list: SpawnRule[]) {
  for (const place of PLACES.filter((p) => p.has_spots && p.parent !== null || (p.has_spots && !PLACES.some((c) => c.parent === p.id)))) {
    if (!poolFor(place.id, list).some((r) => !r.hours && !r.dates)) fail("place_needs_vessel");
  }
}
function applyChange(list: SpawnRule[], cfg: WaveConfig, c: SpawnChange): { list: SpawnRule[]; cfg: WaveConfig } {
  if (c.call === "wave") return { list, cfg: { ...cfg, spawn_chance: c.spawn_chance, weights: c.weights, nearby_max: c.nearby_max } };
  const rule = list.find((r) => r.vessel === c.vessel);
  if (!rule) fail("not_found");
  if (rule!.never) fail("not_spawnable");
  if (c.call === "place_add") return { cfg, list: list.map((r) => r.vessel === c.vessel ? { ...r, rarity: r.rarity ?? "common", places: [...new Set([...(r.places ?? []), c.region])] } : r) };
  if (c.call === "place_remove") return { cfg, list: list.map((r) => r.vessel === c.vessel ? { ...r, places: (r.places ?? []).filter((p) => p !== c.region) } : r) };
  if (c.call !== "rule") return { list, cfg };
  if (c.hours && (c.hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23))) fail("bad_rule");
  if (c.dates && c.dates.some((d) => !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d))) fail("bad_rule");
  return { cfg, list: list.map((r) => r.vessel === c.vessel ? { ...r, rarity: c.rarity, habitat: c.habitat, hours: c.hours, dates: c.dates } : r) };
}
/** Counts over the next day (every 6th wave), as the server's preview does. */
function dayCounts(region: Region, list: SpawnRule[], cfg: WaveConfig) {
  const counts: Record<string, number> = {};
  const pool = poolFor(region.id, list);
  for (const r of pool) counts[r.vessel] = 0;
  const first = Math.floor(Date.now() / (cfg.wave_minutes * 60000)) + 1;
  const waves = Math.round((24 * 60) / cfg.wave_minutes);
  for (let w = 0; w < waves; w += 6) {
    for (const s of spotsFor(region)) {
      if (s.hidden_at) continue;
      const picked = resolve(region.id, s.id, first + w, pool, cfg);
      if (picked) counts[picked.vessel] = (counts[picked.vessel] ?? 0) + 1;
    }
  }
  return counts;
}
/** The cities a change reaches. */
function reached(c: SpawnChange, list: SpawnRule[]) {
  if (c.call === "wave") return REGIONS;
  if (c.call === "rule") return REGIONS.filter((r) => poolFor(r.id, list).some((x) => x.vessel === c.vessel)).slice(0, 2);
  return REGIONS.filter((r) => r.id === c.region || parentOf(r.id) === c.region);
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

let members: Member[] = [
  { ...ROY, email: "roy@example.com", role: "owner", added_by: null, added_at: "2026-11-15T09:00:00Z" },
  { ...MEI, email: "mei@example.com", role: "moderator", added_by: "Roy", added_at: "2026-11-15T09:30:00Z" },
];
let queue: QueueItem[] = [
  { kind: "public_capsule_report", id: "cap-1", title: "給路過的人", preview: "這座公園以前有一棵很大的樹，我們在下面說好十年後再來。如果你看到這封信，替我看看它還在不在。",
    owner: PEOPLE[3], reports: 2, reasons: ["spam", "other"], reporters: [PEOPLE[0], PEOPLE[1]], hidden: true, first_at: hoursAgo(5), status: "open" },
  { kind: "hunt_report", id: "hunt-YBAWML", title: "氹仔中央公園定向日", preview: "跟著六個任務走一圈公園，最後回到嚮導那裡領獎。",
    owner: PEOPLE[4], reports: 2, reasons: [], reporters: [PEOPLE[2], PEOPLE[0]], hidden: true, first_at: hoursAgo(20), status: "open" },
  { kind: "public_capsule_report", id: "cap-2", title: "To whoever passes by", preview: "Call this number for a free prize!!! Limited time only.",
    owner: PEOPLE[1], reports: 1, reasons: ["spam"], reporters: [PEOPLE[4]], hidden: true, first_at: hoursAgo(30), status: "open" },
  { kind: "public_capsule_report", id: "cap-3", title: "給路過的人", preview: "今天是我第一次一個人來台北。",
    owner: PEOPLE[2], reports: 1, reasons: ["personal"], reporters: [PEOPLE[3]], hidden: false, first_at: hoursAgo(52), status: "done",
    decision: "restore", decided_by: ROY, decided_at: hoursAgo(48), note: "Nothing personal in it." },
];
let activity: ActivityRow[] = [
  { id: 3, actor: ROY, action: "queue.restore", target_type: "public_capsule", target_id: "cap-3", target_label: "給路過的人", before: { hidden: true }, after: { hidden: false }, note: "Nothing personal in it.", at: hoursAgo(48) },
  { id: 2, actor: ROY, action: "member.add", target_type: "member", target_id: MEI.id, target_label: "Mei", before: null, after: { role: "moderator" }, note: null, at: "2026-11-15T09:30:00Z" },
  { id: 1, actor: ROY, action: "member.add", target_type: "member", target_id: ROY.id, target_label: "Roy", before: null, after: { role: "owner" }, note: null, at: "2026-11-15T09:00:00Z" },
];
let viewAs: AdminRole = "owner";
const log = (row: Omit<ActivityRow, "id" | "actor" | "at">) => {
  activity = [{ ...row, id: (activity[0]?.id ?? 0) + 1, actor: ROY, at: new Date().toISOString() }, ...activity];
};
const canEdit = () => viewAs === "owner" || viewAs === "admin" ? true : fail("forbidden");
const label = (w: MapWaypost) => w.name_zh;
const snapshot = (w: MapWaypost) => ({ name_zh: w.name_zh, name_en: w.name_en, lat: w.lat, lng: w.lng, scene: w.scene ?? null, game_enabled: w.game_enabled, hidden_at: w.hidden_at ?? null });
const ruleSnapshot = (r: SpawnRule) => ({ rarity: r.rarity, habitat: r.habitat, hours: r.hours, dates: r.dates, places: r.places ?? [] });
const waveSnapshot = (c: WaveConfig) => ({ spawn_chance: c.spawn_chance, weights: c.weights, nearby_max: c.nearby_max });
const pause = <T,>(value: T) => new Promise<T>((done) => setTimeout(() => done(value), 120));

function rules(): SpawnRule[] {
  const live = Object.entries(SETS).flatMap(([region, set]) => set.map((vessel, i): SpawnRule => ({
    vessel, rarity: RARITY[i], habitat: null, hours: null, dates: null, regions: [region], places: [region === "taipei" ? "taiwan" : region], never: null,
  })));
  const listed = new Set(live.map((r) => r.vessel));
  const rest = Object.keys(VESSELS).filter((v) => !listed.has(v)).map((vessel): SpawnRule => ({
    vessel, rarity: null, habitat: null, hours: null, dates: null, regions: [], places: [],
    never: STARTER_VESSELS.includes(vessel) ? "starter" : EARNED.includes(vessel) ? "earned" : vessel === "maison" ? "brand" : null,
  }));
  return [...live, ...rest];
}
let ruleState: SpawnRule[] = rules();

/** A region with what is live in the sample right now: its vessel pool, counts and wave. */
function regionNow(r: Region): Region {
  const posts = postsFor(r).filter((w) => w.game_enabled);
  return { ...r, vessels: poolFor(r.id, ruleState).map((x) => x.vessel), wayposts: { common: posts.filter((w) => w.kind === "common").length, landmark: posts.filter((w) => w.kind === "landmark").length },
    corrupted_spots: spotsFor(r).filter((x) => !x.hidden_at).length, out_now: wave(r).filter((w) => !w.caught).length,
    border: BORDERS[r.id] ?? null, cells_used: new Set(posts.map(cellOf)).size, idle_14d: Math.floor(posts.length / 5) };
}

export const sample = {
  me: () => pause({ role: viewAs }),
  /** Development only: look at the screens as another role. */
  viewAs: (role: AdminRole) => { viewAs = role; },
  role: () => viewAs,
  cities: () => pause(REGIONS.map(regionNow)),
  cityMap: (id: string): Promise<CityMap> => {
    const region = REGIONS.find((r) => r.id === id) ?? REGIONS[0];
    const posts = postsFor(region);
    const spots = spotsFor(region);
    const quests = region.id === "macau"
      ? scatter("ybawml", 6, { lat: 22.1545, lng: 113.556 }, 0.25).map((s, i) => ({ id: `q${i}`, hunt: "YBAWML", hunt_name: "氹仔中央公園定向日", ...s }))
      : [];
    return pause({ region: regionNow(region), wayposts: posts.map((w) => ({ ...w })), spots: spots.map((x) => ({ ...x })), wave: wave(region), keepers: KEEPERS[region.id] ?? [], private_quests: quests });
  },
  spawning: (): Promise<Spawning> => pause({
    config: { ...config },
    rules: withRegions(ruleState),
    places: PLACES,
    stats: Object.fromEntries(REGIONS.map((r, i) => [r.id, { out_now: wave(r).filter((w) => !w.caught).length, caught_today: 12 + i * 7, caught_week: 80 + i * 31 }])),
  }),
  queue: (status: "open" | "done") => pause(queue.filter((q) => q.status === status).map((q) =>
    viewAs === "viewer" ? { ...q, preview: null } : q)),
  resolve: async (kind: QueueKind, id: string, decision: "restore" | "remove", note: string | null) => {
    const item = queue.find((q) => q.kind === kind && q.id === id);
    if (!item) throw new Error("not_found");
    queue = queue.map((q) => q === item ? { ...q, status: "done", decision, hidden: decision === "remove", decided_by: ROY, decided_at: new Date().toISOString(), note } : q);
    log({ action: `queue.${decision}`, target_type: kind === "hunt_report" ? "hunt" : "public_capsule", target_id: id, target_label: item.title,
      before: { hidden: item.hidden }, after: { hidden: decision === "remove" }, note });
    await pause(null);
  },
  members: () => pause(members),
  addMember: async (email: string, role: AdminRole) => {
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) throw new Error("not_found");
    if (members.some((m) => m.email === clean)) throw new Error("already_member");
    const person: Member = { ...KAI, id: `sample-${clean}`, name: clean.split("@")[0], email: clean, role, added_by: "Roy", added_at: new Date().toISOString() };
    members = [...members, person];
    log({ action: "member.add", target_type: "member", target_id: person.id, target_label: person.name, before: null, after: { role }, note: null });
    await pause(null);
  },
  setRole: async (user: string, role: AdminRole) => {
    const m = members.find((x) => x.id === user);
    if (!m) throw new Error("not_found");
    if (m.role === "owner" && role !== "owner" && members.filter((x) => x.role === "owner").length === 1) throw new Error("last_owner");
    members = members.map((x) => x.id === user ? { ...x, role } : x);
    log({ action: "member.role", target_type: "member", target_id: user, target_label: m.name, before: { role: m.role }, after: { role }, note: null });
    await pause(null);
  },
  removeMember: async (user: string) => {
    const m = members.find((x) => x.id === user);
    if (!m) throw new Error("not_found");
    if (m.role === "owner" && members.filter((x) => x.role === "owner").length === 1) throw new Error("last_owner");
    members = members.filter((x) => x.id !== user);
    log({ action: "member.remove", target_type: "member", target_id: user, target_label: m.name, before: { role: m.role }, after: null, note: null });
    await pause(null);
  },
  activity: (before?: number) => pause(activity.filter((a) => before == null || a.id < before)),
  // Phase 2 edits.
  checkWaypost: (regionId: string, lat: number, lng: number, id?: string) => {
    const region = REGIONS.find((r) => r.id === regionId) ?? fail("not_found");
    return pause(checkSpot(region, { lat, lng }, id));
  },
  addWaypost: async (regionId: string, w: { lat: number; lng: number; name_zh: string; name_en: string; scene: Scene; photo?: string | null; photo_credit?: string | null }, checked: boolean, note: string | null) => {
    canEdit();
    const region = REGIONS.find((r) => r.id === regionId) ?? fail("not_found");
    if (!w.name_zh.trim() || !w.name_en.trim() || !hasChinese(w.name_zh)) fail("bad_name");
    guardWaypost(region, w, note);
    const id = `admin-${Date.now().toString(36)}`;
    const post: MapWaypost = { id, ...w, name_zh: w.name_zh.trim(), name_en: w.name_en.trim(), photo: clean(w.photo), photo_credit: clean(w.photo_credit),
      kind: "common", game_enabled: true, hidden_at: null, source_ref: `admin:${id}` };
    postState.set(region.id, [...postsFor(region), post]);
    log({ action: "waypost.add", target_type: "waypost", target_id: id, target_label: label(post), before: null, after: snapshot(post), note });
    return pause({ ...post });
  },
  updateWaypost: async (id: string, w: Partial<{ lat: number; lng: number; name_zh: string; name_en: string; scene: Scene; photo: string | null; photo_credit: string | null }>, note: string | null) => {
    canEdit();
    const region = regionOfPost(id) ?? fail("not_found");
    const old = postsFor(region).find((x) => x.id === id)!;
    if (old.kind === "landmark") fail("landmark");
    const next = { ...old, ...Object.fromEntries(Object.entries(w).filter(([, v]) => v != null)) } as MapWaypost;
    next.photo = clean(next.photo); next.photo_credit = clean(next.photo_credit);
    if (!next.name_zh.trim() || !next.name_en.trim() || !hasChinese(next.name_zh)) fail("bad_name");
    const moved = next.lat !== old.lat || next.lng !== old.lng;
    if (moved) guardWaypost(region, next, note, id);
    postState.set(region.id, postsFor(region).map((x) => x.id === id ? next : x));
    log({ action: moved ? "waypost.move" : "waypost.edit", target_type: "waypost", target_id: id, target_label: label(next), before: snapshot(old), after: snapshot(next), note });
    return pause({ ...next });
  },
  setWaypostVisible: async (id: string, visible: boolean, note: string | null) => {
    canEdit();
    const region = regionOfPost(id) ?? fail("not_found");
    const old = postsFor(region).find((x) => x.id === id)!;
    if (old.kind === "landmark") fail("landmark");
    if (!visible && huntsAround(region, old, id).some((h) => h.wayposts_left < h.wayposts_needed)) fail("hunt_needs_wayposts");
    const next = { ...old, game_enabled: visible, hidden_at: visible ? null : new Date().toISOString() };
    postState.set(region.id, postsFor(region).map((x) => x.id === id ? next : x));
    log({ action: visible ? "waypost.show" : "waypost.hide", target_type: "waypost", target_id: id, target_label: label(next), before: snapshot(old), after: snapshot(next), note });
    return pause({ ...next });
  },
  setSpotVisible: async (id: string, visible: boolean, note: string | null) => {
    canEdit();
    const region = regionOfSpot(id) ?? fail("not_found");
    const old = spotsFor(region).find((x) => x.id === id)!;
    const next = { ...old, hidden_at: visible ? null : new Date().toISOString() };
    spotState.set(region.id, spotsFor(region).map((x) => x.id === id ? next : x));
    log({ action: visible ? "spot.show" : "spot.hide", target_type: "spot", target_id: id, target_label: `${region.name_zh} · ${old.lat.toFixed(4)}, ${old.lng.toFixed(4)}`,
      before: { hidden_at: old.hidden_at ?? null }, after: { hidden_at: next.hidden_at }, note });
    return pause({ ...next });
  },
  // Map builder R1.
  addSpot: async (regionId: string, lat: number, lng: number, habitat: Habitat, note: string | null) => {
    canEdit();
    const region = REGIONS.find((r) => r.id === regionId) ?? fail("not_found");
    guardPlace(region, { lat, lng });
    const spot: MapSpot = { id: `admin-spot-${Date.now().toString(36)}`, lat, lng, habitat, hidden_at: null };
    spotState.set(region.id, [...spotsFor(region), spot]);
    log({ action: "spot.add", target_type: "spot", target_id: spot.id, target_label: `${region.name_zh} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`, before: null, after: { lat, lng, habitat }, note });
    return pause({ ...spot });
  },
  moveSpot: async (id: string, lat: number, lng: number, note: string | null) => {
    canEdit();
    const region = regionOfSpot(id) ?? fail("not_found");
    guardPlace(region, { lat, lng });
    const old = spotsFor(region).find((x) => x.id === id)!;
    const next = { ...old, lat, lng };
    spotState.set(region.id, spotsFor(region).map((x) => x.id === id ? next : x));
    log({ action: "spot.move", target_type: "spot", target_id: id, target_label: `${region.name_zh} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      before: { lat: old.lat, lng: old.lng }, after: { lat, lng }, note });
    return pause({ ...next });
  },
  waypostStats: (id: string) => {
    const n = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);
    const spins = n % 4 === 0 ? 0 : (n % 260) + 3;
    return pause({ total_spins: spins, level: spins >= 100 ? 2 : 1, xp: spins, rack_count: n % 5, last_spin_at: spins ? new Date(Date.now() - (n % 40) * 3600_000).toISOString() : null });
  },
  preview: (c: SpawnChange): Promise<SpawnPreview> => {
    const after = applyChange(ruleState, config, c);
    const regions = reached(c, c.call === "place_add" ? after.list : ruleState);
    return pause({ regions: regions.map((r) => ({ region: r.id, before: dayCounts(r, ruleState, config), after: dayCounts(r, after.list, after.cfg) })) });
  },
  change: async (c: SpawnChange, note: string | null) => {
    canEdit();
    const next = applyChange(ruleState, config, c);
    if (c.call === "wave") {
      const total = c.weights.common + c.weights.uncommon + c.weights.rare;
      if (total <= 0 || c.spawn_chance < 0.1 || c.spawn_chance > 1 || c.nearby_max < 1 || c.nearby_max > 12) fail("bad_rule");
    }
    guardPools(next.list);
    if (c.call === "wave") {
      log({ action: "config.wave", target_type: "config", target_id: "wave", target_label: "wave", before: waveSnapshot(config), after: waveSnapshot(next.cfg), note });
    } else {
      const old = ruleState.find((r) => r.vessel === c.vessel)!;
      const now = next.list.find((r) => r.vessel === c.vessel)!;
      const name = (VESSELS as any)[c.vessel]?.name.zh ?? c.vessel;
      const where = c.call === "rule" ? null : PLACES.find((p) => p.id === c.region)?.name_zh ?? c.region;
      log({ action: c.call === "rule" ? "spawn.rule" : `spawn.${c.call}`, target_type: "vessel", target_id: c.vessel,
        target_label: where ? `${name} · ${where}` : name, before: ruleSnapshot(old), after: ruleSnapshot(now), note });
    }
    ruleState = next.list; config = next.cfg;
    await pause(null);
  },
  setSpinReward: async (min: number, max: number, note: string | null) => {
    canEdit();
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max > 50 || max < min) fail("bad_rule");
    const before = { spin_wax_min: config.spin_wax_min, spin_wax_max: config.spin_wax_max };
    config = { ...config, spin_wax_min: min, spin_wax_max: max };
    log({ action: "config.spin", target_type: "config", target_id: "spin", target_label: "Waypost spin",
      before, after: { spin_wax_min: min, spin_wax_max: max }, note });
    await pause(null);
  },
  setWaveLength: async (minutes: number, note: string | null) => {
    canEdit();
    if (![5, 10, 15, 20, 30, 60].includes(minutes)) fail("bad_rule");
    const gcd = (x: number, y: number): number => y ? gcd(y, x % y) : x;
    const step = (config.wave_minutes * minutes / gcd(config.wave_minutes, minutes)) * 60000;
    const starts_at = new Date(Math.floor(Date.now() / step) * step + step).toISOString();
    const before = config.next_length ?? null;
    config = { ...config, next_length: minutes === config.wave_minutes ? null : { minutes, starts_at } };
    log({ action: "config.wave_length", target_type: "config", target_id: "wave_length", target_label: "wave length",
      before: { wave_minutes: config.wave_minutes, next: before }, after: { wave_minutes: config.wave_minutes, next: config.next_length }, note });
    return pause(starts_at);
  },
  undo: async (actionId: number, note: string | null) => {
    canEdit();
    const row = activity.find((r) => r.id === actionId) ?? fail("not_found");
    if (!/^(waypost|spot|spawn|config)\./.test(row.action)) fail("not_undoable");
    if (activity.some((r) => r.id > actionId && r.target_id === row.target_id && r.target_type === row.target_type)) fail("stale");
    const before = row.before as any;
    if (row.target_type === "waypost") {
      const region = regionOfPost(row.target_id) ?? fail("not_found");
      postState.set(region.id, before == null
        ? postsFor(region).filter((w) => w.id !== row.target_id)
        : postsFor(region).map((w) => w.id === row.target_id ? { ...w, ...before } : w));
    } else if (row.target_type === "spot") {
      const region = regionOfSpot(row.target_id) ?? fail("not_found");
      // Undoing an added spot hides it; undoing a move puts it back.
      const put = before == null ? { hidden_at: new Date().toISOString() } : "lat" in before ? { lat: before.lat, lng: before.lng } : { hidden_at: before.hidden_at };
      spotState.set(region.id, spotsFor(region).map((x) => x.id === row.target_id ? { ...x, ...put } : x));
    } else if (row.target_type === "vessel") {
      const list = ruleState.map((r) => r.vessel === row.target_id ? { ...r, ...before } : r);
      guardPools(list);
      ruleState = list;
    } else if (row.target_id === "wave") {
      config = { ...config, ...before };
    } else {
      config = { ...config, next_length: before.next };
    }
    log({ action: "undo", target_type: row.target_type, target_id: row.target_id, target_label: row.target_label, before: row.after, after: row.before, note: note ?? `#${row.id}` });
    await pause(null);
  },
};
