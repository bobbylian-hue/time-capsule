// The map builder, release R1 (docs/design/map-builder.md): city borders, Wayposts with names from the map and
// photos, the S2 grid as a soft guide, Corrupted Capsule spots, and Waypost numbers. Every write is checked and
// logged on the server (Codex's R1 migration); the screens only warn first.
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import { ADMIN_SAMPLE, rpc, type Habitat, type MapSpot, type MapWaypost, type Scene, type WaypostCheck } from "./admin";
import { sample } from "./adminSample";
import type { Border } from "./border";
export { insideBorder, type Border } from "./border";
import { WAYPOST_PHOTOS } from "./waypostPhoto";
export { photoUrl } from "./waypostPhoto";

/** Turn on once Codex's R1 migration 20261122203609 is applied (PR #198). */
export const MAP_BUILDER_R1_BACKEND = true;
/** Whether the R1 tools show: with the live functions, or on the development sample. */
export const MAP_BUILDER_R1 = MAP_BUILDER_R1_BACKEND || ADMIN_SAMPLE;

export type CellNeighbour = { id: string; name_zh: string; name_en: string; meters: number };
/** What the server says about a spot under the R1 rules: only the border refuses; the rest are notes. */
export type BuilderCheck = WaypostCheck & { inside_border?: boolean; same_cell?: CellNeighbour[] };
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
  addWaypost: (region: string, w: WaypostWrite, note: string | null): Promise<MapWaypost> =>
    ADMIN_SAMPLE ? sample.addWaypost(region, w, true, note)
      : rpc("admin_waypost_add", { p_region: region, p_lat: w.lat, p_lng: w.lng, p_name_zh: w.name_zh, p_name_en: w.name_en, p_scene: w.scene,
          p_photo: w.photo, p_photo_credit: w.photo_credit, p_checked: true, p_note: note }),
  updateWaypost: (id: string, w: WaypostWrite, note: string | null): Promise<MapWaypost> =>
    ADMIN_SAMPLE ? sample.updateWaypost(id, w, note)
      : rpc("admin_waypost_update", { p_id: id, p_lat: w.lat, p_lng: w.lng, p_name_zh: w.name_zh, p_name_en: w.name_en, p_scene: w.scene,
          p_photo: w.photo, p_photo_credit: w.photo_credit, p_note: note }),
  addSpot: (region: string, lat: number, lng: number, habitat: Habitat, note: string | null): Promise<MapSpot> =>
    ADMIN_SAMPLE ? sample.addSpot(region, lat, lng, habitat, note) : rpc("admin_spot_add", { p_region: region, p_lat: lat, p_lng: lng, p_habitat: habitat, p_note: note }),
  moveSpot: (id: string, lat: number, lng: number, note: string | null): Promise<MapSpot> =>
    ADMIN_SAMPLE ? sample.moveSpot(id, lat, lng, note) : rpc("admin_spot_move", { p_id: id, p_lat: lat, p_lng: lng, p_note: note }),
  stats: (id: string): Promise<WaypostStats> =>
    ADMIN_SAMPLE ? sample.waypostStats(id) : rpc("admin_waypost_stats", { p_id: id }),
};

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
export type MapNames = { names: { zh: string; en: string; kind: string; meters: number }[]; area: AreaKind | null; same: { id: string; meters: number }[] };
