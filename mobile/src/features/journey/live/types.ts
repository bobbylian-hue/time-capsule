import { Image, type ImageSourcePropType } from "react-native";
import type { PrivateHuntQuestType } from "../../../services/questTypes";
import type { QuestKind } from "../../../services/quests";

export type PinKind = "publicCapsule" | "place" | "corrupted" | "waypost" | "landmark" | "keeper" | "quest" | "spot";
export type LivePin = { id: string; lat: number; lng: number; vessel: string; label?: string; cracks?: string; portrait?: string | null; tag?: string; kind: PinKind; hunt?: boolean;
  /** Which map filter shows this pin, when not its kind's (a private hunt's guide is drawn as a Keeper but belongs to private hunts). */
  filterAs?: PinKind;
  /** Private-hunt quests (kind "quest"): which glyph the brass pin carries, and whether the route still locks it. */
  quest?: PrivateHuntQuestType | QuestKind; locked?: boolean; /** The faceted pin frame (blue, brass or plum); without it the older code-drawn teardrop shows. */ frame?: string | null; /** A quest's picture: shown as a big round photo pin instead of the brass pin. */ photo?: string | null; mark?: string | null; figure?: string | null; lift?: number; rarity?: "common" | "uncommon" | "rare"; done?: boolean;
  /** A quest made by us (Today's Hunt, City Hunt): the blue quest pin instead of brass. */ blue?: boolean;
  /** Drops from the sky this many ms after it first appears (Today's Hunt). */ drop?: number; near?: boolean; far?: boolean; selected?: boolean; sealed?: boolean; private?: boolean; opened?: boolean; timer?: string;
  /** Admin map builder: not saved yet (see-through, dashed), and the faint old spot of a place being moved. */ draft?: boolean; ghost?: boolean;
  /** Admin map builder: this pin can be dragged; the map reports the drop with a "drag" message. */ drag?: boolean;
  /** Admin map builder: a place the admin can edit (green ring on hover and when selected). */ edit?: boolean };
export type LiveState = { you: { lat: number; lng: number } | null; heading?: number | null; portrait?: string | null; figure?: string | null; youLabel?: string | null; reach: number; pins: LivePin[];
  /** A dotted line through these points, in order (an ordered hunt's route in the quest editor). */
  route?: { lat: number; lng: number }[] };
/** walk: the player's figure strolls to a spot inside the pickup circle (a picture only; the real position and the server's checks never change). */
export type LiveMapHandle = { recenter: () => void; focus: (lat: number, lng: number) => void; walk: (lat: number, lng: number) => void;
  /** Fly to another city and look around it from above its buildings (the City Explorer). */
  city: (lat: number, lng: number) => void;
  /** Frame every point on screen (the quest editor shows the whole hunt). */
  fit: (points: { lat: number; lng: number }[], view?: FitView) => void;
  /** Today's Hunt's motion: the figure hops along a trail, pins bounce or burst, everything runs k times faster. */
  motion: (m: MapMotion) => void;
  /** The admin map builder (mapHtml's builder mode): border, grid and asking what the map calls a spot. */
  command: (m: MapCommand) => void };
export type MapCommand =
  | { type: "builder"; border: import("../../../services/border").Border | null; grid: boolean; posts: { id: string; lat: number; lng: number }[];
      /** R1.5: what the draggable pin is (a Waypost shows its cell while dragged) and which Waypost it is (it may stay in its own cell). */
      dragKind?: "waypost" | "spot" | null; dragSkip?: string | null }
  | { type: "names"; seq: number; lat: number; lng: number; skip?: string }
  /** R1.5: a see-through Waypost or spot follows the pointer while placing (the Waypost's cell turns green or red). */
  | { type: "placing"; kind: "waypost" | "spot" | null; img?: string; skip?: string }
  /** R1.5: drag a box on the map (Fill an area); "clear" removes the drawn box. */
  | { type: "boxMode"; on: boolean } | { type: "boxClear" }
  /** Pan (never zoom) so a place isn't hidden under a popup covering the left or bottom of the map. */
  | { type: "reveal"; lat: number; lng: number; left?: number; bottom?: number; /** Part of the map's height a bottom sheet covers. */ bottomShare?: number }
  | { type: "namesMany"; seq: number; points: { lat: number; lng: number }[] };
/** Optional framing for fit: room kept clear for cards, the camera's tilt and turn, and its duration at normal speed. */
export type FitView = { padding?: { top: number; bottom: number; left: number; right: number }; pitch?: number; bearing?: number; ms?: number };
/** ms are at normal speed; the map divides them by the current speed. Reduce Motion makes them instant. */
export type MapMotion =
  | { type: "hop"; lat: number; lng: number; ms: number }
  | { type: "ping"; id: string; kind: "arrive" | "burst" | "shake" }
  | { type: "speed"; k: number }
  | { type: "hopReset" };
export type LiveMapProps = {
  html: string;
  state: LiveState;
  onSelect: (id: string) => void;
  onTap?: (lat: number, lng: number) => void;
  onFollowChange?: (follow: boolean) => void;
  /** Answers to builder commands. */
  onNames?: (m: Extract<MapMessage, { type: "names" }>) => void;
  /** Builder R1.5: a place dropped after a drag, a box drawn, names for many points. */
  onBuilder?: (m: Extract<MapMessage, { type: "drag" | "box" | "namesMany" }>) => void;
};
export type MapMessage = { type: "ready" } | { type: "select"; id: string } | { type: "tap"; lat: number; lng: number } | { type: "follow"; follow: boolean } | { type: "error"; message: string }
  | { type: "names"; seq: number; names: { zh: string; en: string; kind: string; meters: number }[]; area: string | null; habitat?: string | null; same: { id: string; meters: number }[] }
  | { type: "drag"; id: string; lat: number; lng: number }
  | { type: "box"; south: number; west: number; north: number; east: number }
  | { type: "namesMany"; seq: number; items: { names: { zh: string; en: string; kind: string; meters: number }[]; habitat: string | null }[] };

/** A bundled image as a URL the map page can load (Metro dev server, web path or bundled file). */
export function assetUri(source: ImageSourcePropType | undefined | null): string | null {
  if (!source) return null;
  if (typeof source === "string") return source;
  if (typeof source === "object" && !Array.isArray(source) && "uri" in source && source.uri) return absolute(source.uri);
  const resolved = Image.resolveAssetSource?.(source as number);
  return resolved?.uri ? absolute(resolved.uri) : null;
}
const absolute = (uri: string) => (typeof window !== "undefined" && window.location && uri.startsWith("/")) ? `${window.location.origin}${uri}` : uri;
