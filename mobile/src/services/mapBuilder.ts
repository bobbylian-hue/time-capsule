// The map builder, release R1 (docs/design/map-builder.md): city borders, Wayposts with names from the map and
// photos, the S2 grid as a soft guide, Corrupted Capsule spots, and Waypost numbers. Every write is checked and
// logged on the server (Codex's R1 migration); the screens only warn first.
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import { ADMIN_SAMPLE, rpc, type Habitat, type MapSpot, type MapWaypost, type PlaceStatus, type Scene, type WaypostCheck } from "./admin";
import { sample } from "./adminSample";
import type { Border } from "./border";
import type { LandmarkSettings } from "./admin";
export { insideBorder, type Border } from "./border";
import { WAYPOST_PHOTOS } from "./waypostPhoto";
export { photoUrl } from "./waypostPhoto";

/** Turn on once Codex's R1 migration 20261122203609 is applied (PR #198). */
export const MAP_BUILDER_R1_BACKEND = true;
/** Whether the R1 tools show: with the live functions, or on the development sample. */
export const MAP_BUILDER_R1 = MAP_BUILDER_R1_BACKEND || ADMIN_SAMPLE;
/** Turn on once Codex's R1.5 migration is applied: drafts, publish, delete, one Waypost per cell, Fill an area. */
export const MAP_BUILDER_R15_BACKEND = true;
export const MAP_BUILDER_R15 = MAP_BUILDER_R15_BACKEND || ADMIN_SAMPLE;
/** Turn on once Codex's Fill an area follow-up is applied: batches saved as Live, their Activity ids back for Undo,
 * and the city's drafts grouped by the batch they came from (Roy, 2026-11-23). */
export const FILL_PUBLISH_BACKEND = true;
const FILL_PUBLISH = FILL_PUBLISH_BACKEND || ADMIN_SAMPLE;
/** Turn on once Codex's R2 migration is applied: Landmarks with a look, a reward and a fight, made in the builder. */
export const MAP_BUILDER_R2_BACKEND = false;
export const MAP_BUILDER_R2 = MAP_BUILDER_R2_BACKEND || ADMIN_SAMPLE;
/** What a new Landmark starts with: the seal alone, the default keepsake and stamp, and today's fight (40 HP, 150 s). */
export const LANDMARK_DEFAULTS: LandmarkSettings = { monument: null, vessel: "landmark-keepsake", stamp: "landmark-default", fight_health: 40, fight_seconds: 150 };

export type CellNeighbour = { id: string; name_zh: string; name_en: string; meters: number };
/** What the server says about a spot under the R1 rules: only the border refuses; the rest are notes. */
export type BuilderCheck = WaypostCheck & { inside_border?: boolean; same_cell?: CellNeighbour[];
  /** R1.5: another Waypost or Landmark already holds this level-17 cell, so saving here is refused. */ cell_taken?: boolean };
export type WaypostStats = { total_spins: number; level: number; xp: number; last_spin_at: string | null; rack_count: number };
export type WaypostWrite = { lat: number; lng: number; name_zh: string; name_en: string; scene: Scene;
  /** A path in the waypost-photos bucket; null keeps the current one, "" clears it. */
  photo: string | null; photo_credit: string | null };


/** Uploads a JPEG data URL to `<region>/<uuid>.jpg` and returns the path to save on the Waypost. */
export async function uploadWaypostPhoto(region: string, dataUrl: string): Promise<string> {
  if (ADMIN_SAMPLE && !MAP_BUILDER_R1_BACKEND) return dataUrl;
  const bytes = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(",") + 1)), (c) => c.charCodeAt(0));
  const path = `${region}/${Crypto.randomUUID().toLowerCase()}.jpg`;
  const { error } = await supabase.storage.from(WAYPOST_PHOTOS).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message?.includes("exceeded") ? "photo_too_big" : "photo_failed");
  return path;
}

/** R1's calls, as Codex's migration 20261122203609 defines them. */
export const builder = {
  check: (region: string, lat: number, lng: number, id?: string): Promise<BuilderCheck> =>
    ADMIN_SAMPLE ? sample.checkWaypost(region, lat, lng, id) : rpc("admin_waypost_check", { p_region: region, p_lat: lat, p_lng: lng, p_id: id ?? null }),
  addWaypost: (region: string, w: WaypostWrite, note: string | null, status: "draft" | "live" = "live"): Promise<MapWaypost> =>
    ADMIN_SAMPLE ? sample.addWaypost(region, w, true, note, status)
      : rpc("admin_waypost_add", { p_region: region, p_lat: w.lat, p_lng: w.lng, p_name_zh: w.name_zh, p_name_en: w.name_en, p_scene: w.scene,
          p_photo: w.photo, p_photo_credit: w.photo_credit, p_checked: true, p_note: note, ...(MAP_BUILDER_R15_BACKEND ? { p_status: status } : {}) }),
  updateWaypost: (id: string, w: WaypostWrite, note: string | null): Promise<MapWaypost> =>
    ADMIN_SAMPLE ? sample.updateWaypost(id, w, note)
      : rpc("admin_waypost_update", { p_id: id, p_lat: w.lat, p_lng: w.lng, p_name_zh: w.name_zh, p_name_en: w.name_en, p_scene: w.scene,
          p_photo: w.photo, p_photo_credit: w.photo_credit, p_note: note }),
  addSpot: (region: string, lat: number, lng: number, habitat: Habitat, note: string | null, status: "draft" | "live" = "live"): Promise<MapSpot> =>
    ADMIN_SAMPLE ? sample.addSpot(region, lat, lng, habitat, note, status)
      : rpc("admin_spot_add", { p_region: region, p_lat: lat, p_lng: lng, p_habitat: habitat, p_note: note, ...(MAP_BUILDER_R15_BACKEND ? { p_status: status } : {}) }),
  moveSpot: (id: string, lat: number, lng: number, note: string | null): Promise<MapSpot> =>
    ADMIN_SAMPLE ? sample.moveSpot(id, lat, lng, note) : rpc("admin_spot_move", { p_id: id, p_lat: lat, p_lng: lng, p_note: note }),
  // R2 (Codex's R2 migration).
  /** A new Landmark: the Waypost fields plus its look, reward and fight. */
  addLandmark: (region: string, w: WaypostWrite, landmark: LandmarkSettings, note: string | null, status: "draft" | "live" = "live"): Promise<MapWaypost> =>
    ADMIN_SAMPLE ? sample.addWaypost(region, w, true, note, status, landmark)
      : rpc("admin_waypost_add", { p_region: region, p_lat: w.lat, p_lng: w.lng, p_name_zh: w.name_zh, p_name_en: w.name_en, p_scene: w.scene,
          p_photo: w.photo, p_photo_credit: w.photo_credit, p_checked: true, p_note: note, p_status: status, p_kind: "landmark", p_landmark: landmark }),
  /** Changes a Landmark's look, reward or fight; on a common Waypost, makes it a Landmark (keeping its id and spins). */
  setLandmark: (id: string, landmark: LandmarkSettings, note: string | null): Promise<number | null> =>
    ADMIN_SAMPLE ? sample.setLandmark(id, landmark, note) : rpc("admin_landmark_set", { p_id: id, p_landmark: landmark, p_note: note }),
  stats: (id: string): Promise<WaypostStats> =>
    ADMIN_SAMPLE ? sample.waypostStats(id) : rpc("admin_waypost_stats", { p_id: id }),
  // R1.5 (Codex's R1.5 migration).
  /** Publish, hide, show or delete several Wayposts or spots in one Activity row. */
  setStatus: (kind: "waypost" | "spot", ids: string[], status: PlaceStatus, note: string | null): Promise<{ changed: number }> =>
    ADMIN_SAMPLE ? sample.setStatus(kind, ids, status, note) : rpc("admin_place_set_status", { p_kind: kind, p_ids: ids, p_status: status, p_note: note }),
  areaSuggest: (region: string, kind: "waypost" | "spot", box: Box, spacing: number): Promise<{ lat: number; lng: number }[]> =>
    ADMIN_SAMPLE ? sample.areaSuggest(region, kind, box, spacing)
      : rpc("admin_area_suggest", { p_region: region, p_kind: kind, p_south: box.south, p_west: box.west, p_north: box.north, p_east: box.east, p_spacing_m: spacing }),
  /** Saved as drafts (or Live), one Activity row; places that fail a rule come back in skipped with the reason.
   * `batch` ties the Wayposts and spawn spots of one Fill an area save together in the Drafts list. */
  addWayposts: (region: string, items: { lat: number; lng: number; name_zh: string; name_en: string; scene: Scene }[], note: string | null, opts: BatchOpts = {}): Promise<BatchResult<MapWaypost>> =>
    ADMIN_SAMPLE ? sample.addWayposts(region, items, note, opts)
      : rpc("admin_waypost_add_batch", { p_region: region, p_items: items, p_note: note, ...batchArgs(opts) }),
  addSpots: (region: string, items: { lat: number; lng: number; habitat: Habitat }[], note: string | null, opts: BatchOpts = {}): Promise<BatchResult<MapSpot>> =>
    ADMIN_SAMPLE ? sample.addSpots(region, items, note, opts)
      : rpc("admin_spot_add_batch", { p_region: region, p_items: items, p_note: note, ...batchArgs(opts) }),
  /** Whether a batch can be saved as Live and undone from the panel (the follow-up backend). */
  canPublishBatch: FILL_PUBLISH,
  /** The city's drafts, grouped by who saved them and in which batch. Before the backend, one group of everything. */
  drafts: (region: string, all: { wayposts: MapWaypost[]; spots: MapSpot[] }): Promise<DraftGroup[]> =>
    ADMIN_SAMPLE ? sample.drafts(region)
      : FILL_PUBLISH_BACKEND ? rpc("admin_city_drafts", { p_region: region })
      : Promise.resolve(oneGroup(all)),
};
export type BatchOpts = { status?: "draft" | "live"; batch?: string };
const batchArgs = (o: BatchOpts) => FILL_PUBLISH_BACKEND ? { p_status: o.status ?? "draft", p_batch: o.batch ?? null } : {};
/** Drafts saved together: one Fill an area save, or (batch null) everything one person added one at a time. */
export type DraftGroup = { batch: string | null; actor: { id: string; name: string; avatar: unknown } | null; at: string | null;
  wayposts: string[]; spots: string[] };
const oneGroup = ({ wayposts, spots }: { wayposts: MapWaypost[]; spots: MapSpot[] }): DraftGroup[] => {
  const w = wayposts.filter((x) => x.status === "draft").map((x) => x.id), s = spots.filter((x) => x.status === "draft").map((x) => x.id);
  return w.length || s.length ? [{ batch: null, actor: null, at: null, wayposts: w, spots: s }] : [];
};
export type Box = { south: number; west: number; north: number; east: number };
export type BatchResult<T> = { added: T[]; skipped: { index: number; reason: string }[];
  /** The Activity row, so the panel can undo the save (null when nothing was added; absent before the backend). */ action_id?: number | null };
/** Fill an area: the spacings offered (metres). A level-17 cell is about 70 m across, so 75 m is as close as
 * Wayposts can get (one per cell); spawn spots have no cell rule and can go down to 50 m. */
export const FILL_SPACING = { waypost: [75, 150, 250, 400], spot: [50, 100, 150, 250] } as const;
/** The spacing Fill an area starts with. */
export const FILL_DEFAULT = { waypost: 250, spot: 150 } as const;

/** The picture a kind of place from the map tiles suggests (park, pier, artwork…). */
export function sceneFor(kind: string | null | undefined): Scene {
  const map: Record<string, Scene> = { park: "park", grass: "park", playground: "park", dog_park: "park", garden: "garden",
    pier: "waterfront", beach: "waterfront", water: "waterfront", marina: "waterfront", artwork: "publicArt", monument: "publicArt",
    attraction: "publicArt", museum: "publicArt", arts_centre: "publicArt", fountain: "publicArt", memorial: "publicArt", sculpture: "publicArt" };
  return (kind && map[kind]) || "square";
}

/** Landuse kinds where a Waypost is worth a second look (a note, never a refusal). */
export const AREA_KINDS = ["school", "kindergarten", "university", "college", "hospital", "cemetery", "military"] as const;
export type AreaKind = typeof AREA_KINDS[number];
/** Names the map tiles give near a spot, the kind of land it's on, and the S2 level-17 neighbours. */
export type MapNames = { names: { zh: string; en: string; kind: string; meters: number }[]; area: AreaKind | null;
  /** The spawn-spot habitat the tiles suggest (water, park, else square). */ habitat: Habitat | null; same: { id: string; meters: number }[] };
