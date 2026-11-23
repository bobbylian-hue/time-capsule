// Fill an area (docs/design/map-builder.md, R1.5): drag a box on the map, the server suggests safe points in it,
// Wayposts take their names from the map tiles (numbered like copied files when a name is used), spawn spots take
// their habitat from the tiles. Roy (2026-11-23): tap a suggestion to see it, tick the ones to add, then publish them
// here or save them as drafts, and undo the save from the same panel.
// Roy (2026-11-23): every kind of place starts selected (Wayposts and spawn spots; Landmarks later), and switching
// a kind off or changing a spacing reloads the same box, with no redrawing.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { gameArt } from "../../art/manifest";
import { assetUri } from "../journey/live/types";
import { useLanguage } from "../../i18n";
import * as Crypto from "expo-crypto";
import { adminEdit, type Habitat, type MapWaypost, type Region, type Scene } from "../../services/admin";
import { builder, FILL_DEFAULT, FILL_SPACING, sceneFor, type BatchResult, type Box } from "../../services/mapBuilder";
import { numberedNames } from "../../services/waypostNames";
import type { MapCommand, MapMessage } from "../journey/live/types";
import { C, radii, sans, spacing } from "../../theme";
import { useAdminText } from "./strings";
import { useMapBuilderText } from "./mapBuilderStrings";
import { errorLabel, useSheetActions } from "./EditSheet";
import { AButton, Notice } from "./ui";

export type FillKind = "waypost" | "spot";
/** The kinds Fill an area can add, in the order they're listed. Landmarks join here later. */
export const FILL_KINDS: FillKind[] = ["waypost", "spot"];
export type FillItem = { kind: FillKind; lat: number; lng: number; name_zh: string; name_en: string; scene: Scene; habitat: Habitat };
type Phase = "draw" | "looking" | "pick" | "saving" | "saved" | "undoing" | "undone" | "error";
/** What the last save did, so the panel can say it and undo it (actions: its Activity rows). */
export type FillSaved = { live: boolean; w: number; s: number; skipped: number; actions: number[] };
export type Fill = { kinds: FillKind[]; spacing: Record<FillKind, number>; box: Box | null; phase: Phase;
  items: FillItem[]; off: Set<number>;
  /** The suggestion being looked at (tapped in the list or on the map); its pin gets the ring. */ focus: number | null;
  saved?: FillSaved; error?: string };
type Many = Extract<MapMessage, { type: "namesMany" }>["items"];

/** The fill flow's state; the map's box and namesMany messages come in through onBox and onMany. */
export function useFill({ region, wayposts, command, onSaved, reveal }: {
  region: Region; wayposts: MapWaypost[]; command: (m: MapCommand) => void; onSaved: () => void;
  /** Where the popup covers the map, so a tapped suggestion is panned clear of it. */ reveal: { left?: number; bottomShare?: number };
}) {
  const [fill, setFill] = useState<Fill | null>(null);
  const many = useRef(new Map<number, (items: Many) => void>());
  const seq = useRef(0);
  /** Only the newest look-up counts (switching kinds or spacing quickly starts a new one). */
  const run = useRef(0);
  const askMany = (points: { lat: number; lng: number }[]) => new Promise<Many>((resolve) => {
    const id = ++seq.current;
    many.current.set(id, (items) => { many.current.delete(id); resolve(items); });
    setTimeout(() => many.current.get(id)?.(points.map(() => ({ names: [], habitat: null }))), 8000);
    command({ type: "namesMany", seq: id, points });
  });

  const look = async (box: Box, kinds: FillKind[], gaps: Record<FillKind, number>) => {
    const mine = ++run.current;
    setFill((f) => f && { ...f, box, kinds, spacing: gaps, phase: "looking", items: [], off: new Set(), focus: null, error: undefined });
    try {
      const found = await Promise.all(FILL_KINDS.filter((k) => kinds.includes(k))
        .map(async (kind) => (await builder.areaSuggest(region.id, kind, box, gaps[kind])).map((p) => ({ kind, ...p }))));
      const points = found.flat();
      const answers = points.length ? await askMany(points.map(({ lat, lng }) => ({ lat, lng }))) : [];
      if (mine !== run.current) return;
      // Every name already used in the city, plus the ones given to earlier points in this box.
      const taken = { zh: new Set(wayposts.map((w) => w.name_zh.trim())), en: new Set(wayposts.map((w) => w.name_en.trim())) };
      const items = points.map<FillItem>((p, i) => {
        const a = answers[i], top = a?.names[0];
        const named = p.kind === "waypost"
          ? numberedNames(top?.zh || `${region.name_zh} Waypost`, top?.en || `${region.name_en} Waypost`, taken)
          : { zh: "", en: "" };
        if (p.kind === "waypost") { taken.zh.add(named.zh); taken.en.add(named.en); }
        return { ...p, name_zh: named.zh, name_en: named.en, scene: sceneFor(top?.kind), habitat: (a?.habitat as Habitat) ?? "square" };
      });
      setFill((f) => f && { ...f, phase: "pick", items });
    } catch (e) {
      if (mine === run.current) setFill((f) => f && { ...f, phase: "error", error: (e as Error)?.message || "failed" });
    }
  };

  const draw = () => {
    run.current++;
    command({ type: "boxClear" }); command({ type: "boxMode", on: true });
    setFill((f) => ({ kinds: f?.kinds ?? FILL_KINDS, spacing: f?.spacing ?? { ...FILL_DEFAULT }, box: null, phase: "draw", items: [], off: new Set(), focus: null }));
  };
  const start = () => { setFill(null); draw(); };
  const stop = useCallback(() => { run.current++; command({ type: "boxMode", on: false }); command({ type: "boxClear" }); setFill(null); }, [command]);
  const onBox = (box: Box) => {
    if (!fill || fill.phase !== "draw") return;
    command({ type: "boxMode", on: false });
    look(box, fill.kinds, fill.spacing);
  };
  /** A kind switched on or off, or a new spacing: the same box again, or just remembered until one is drawn. */
  const change = (kinds: FillKind[], gaps: Record<FillKind, number>) => {
    if (!fill) return;
    if (fill.box) look(fill.box, kinds, gaps);
    else setFill({ ...fill, kinds, spacing: gaps });
  };
  const toggleKind = (k: FillKind) => fill && change(fill.kinds.includes(k) ? fill.kinds.filter((x) => x !== k) : [...fill.kinds, k], fill.spacing);
  const setSpacing = (k: FillKind, m: number) => fill && change(fill.kinds, { ...fill.spacing, [k]: m });
  const onMany = (m: Extract<MapMessage, { type: "namesMany" }>) => many.current.get(m.seq)?.(m.items);
  const toggle = (i: number) => setFill((f) => {
    if (!f || f.phase !== "pick") return f;
    const off = new Set(f.off); if (off.has(i)) off.delete(i); else off.add(i);
    return { ...f, off };
  });
  /** Roy (2026-11-23): tapping a suggestion shows it; only its tick box adds or leaves it out. */
  const focus = (i: number | null) => {
    setFill((f) => f && f.phase === "pick" ? { ...f, focus: f.focus === i ? null : i } : f);
    const it = i == null ? null : fill?.items[i];
    if (it) command({ type: "reveal", lat: it.lat, lng: it.lng, ...reveal });
  };
  /** Live publishes at once; drafts wait for someone to look and publish. One Activity row per kind, undone together. */
  const save = async (live: boolean) => {
    if (!fill) return;
    const chosen = fill.items.filter((_, i) => !fill.off.has(i));
    const posts = chosen.filter((x) => x.kind === "waypost"), spots = chosen.filter((x) => x.kind === "spot");
    const opts = { status: live ? "live" as const : "draft" as const, batch: Crypto.randomUUID().toLowerCase() };
    setFill({ ...fill, phase: "saving" });
    const none = { added: [], skipped: [], action_id: null };
    // Wayposts and spawn spots are two saves. If the second fails, the first stays saved and its Undo stays here.
    let a: BatchResult<unknown> = none;
    const finish = (b: BatchResult<unknown>, error?: string) => {
      command({ type: "boxClear" });
      const actions = [a.action_id, b.action_id].filter((x): x is number => typeof x === "number");
      setFill((f) => f && { ...f, box: null, phase: "saved", items: [], off: new Set(), focus: null, error,
        saved: { live, w: a.added.length, s: b.added.length, skipped: a.skipped.length + b.skipped.length, actions } });
    };
    try {
      if (posts.length) a = await builder.addWayposts(region.id, posts.map(({ lat, lng, name_zh, name_en, scene }) => ({ lat, lng, name_zh, name_en, scene })), null, opts);
      finish(spots.length ? await builder.addSpots(region.id, spots.map(({ lat, lng, habitat }) => ({ lat, lng, habitat })), null, opts) : none);
    } catch (e) {
      const error = (e as Error)?.message || "failed";
      if (a.added.length) finish(none, error);
      else setFill((f) => f && { ...f, phase: "error", error });
    }
    onSaved();
  };
  /** Undo the save just made: its Activity rows, newest first. */
  const undo = async () => {
    const done = fill?.saved;
    if (!done?.actions.length) return;
    setFill((f) => f && { ...f, phase: "undoing" });
    try {
      for (const id of [...done.actions].reverse()) await adminEdit.undo(id, null);
      setFill((f) => f && { ...f, phase: "undone", saved: undefined });
    } catch (e) {
      setFill((f) => f && { ...f, phase: "error", error: (e as Error)?.message || "failed" });
    }
    onSaved();
  };
  return { fill, start, stop, draw, onBox, onMany, toggle, focus, toggleKind, setSpacing, save, undo };
}
export type FillApi = ReturnType<typeof useFill>;

/** What goes inside the Fill an area popup. */
export function FillPanel({ api }: { api: FillApi }) {
  const { fill } = api;
  const mb = useMapBuilderText();
  const a = useAdminText();
  const { language } = useLanguage();
  const zh = language === "zh";
  const on = fill ? fill.items.length - fill.off.size : 0;
  const publish = builder.canPublishBatch;
  // The header's main button publishes (Roy, 2026-11-23: check them here, publish here); Save as drafts sits below
  // the list. Before the backend can save Live, the header saves drafts as before.
  useSheetActions({ dirty: fill?.phase === "pick" && on > 0, canSave: fill?.phase === "pick" && on > 0, busy: fill?.phase === "saving",
    saveLabel: publish ? mb.fillPublish(on) : mb.fillSave(on), save: async () => { await api.save(publish); return true; } },
    fill?.phase === "pick" || fill?.phase === "saving");
  // A place tapped on the map scrolls its row into view (the admin runs in a browser).
  const focusedRow = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => {
    const el = focusedRow.current as unknown as HTMLElement | null;
    if (fill?.focus != null && el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [fill?.focus]);
  if (!fill) return null;
  const busy = fill.phase === "looking" || fill.phase === "saving" || fill.phase === "undoing";
  const done = fill.saved;
  const label = (k: FillKind) => k === "waypost" ? mb.fillWayposts : mb.fillSpots;
  const nameOf = (it: FillItem, i: number) => it.kind === "waypost" ? (zh ? it.name_zh : it.name_en)
    : `${mb.fillSpot} ${fill.items.slice(0, i + 1).filter((x) => x.kind === "spot").length}`;
  return <View style={{ gap: spacing.md }}>
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.fillKind}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {FILL_KINDS.map((k) => <Choice key={k} check icon={k} label={label(k)} on={fill.kinds.includes(k)} disabled={busy} onPress={() => api.toggleKind(k)} />)}
      </View>
    </View>
    {FILL_KINDS.filter((k) => fill.kinds.includes(k)).map((k) => <View key={k} style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.fillSpacing} · {label(k)}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {FILL_SPACING[k].map((m) => <Choice key={m} label={`${m} m`} on={fill.spacing[k] === m} disabled={busy} onPress={() => api.setSpacing(k, m)} />)}
      </View>
    </View>)}
    {!fill.kinds.length && <Notice tone="warn" text={mb.fillChooseKind} />}
    {fill.phase === "draw" && <Notice text={mb.fillDraw} />}
    {busy && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{fill.phase === "looking" ? mb.fillLooking : a.ed.saving}</Text>}
    {fill.phase === "error" && fill.error && <Notice tone="stop" text={errorLabel(a, mb, fill.error)} />}
    {fill.phase === "saved" && done && <View style={{ gap: spacing.sm }}>
      <Notice text={(done.live ? mb.fillPublished : mb.fillDrafted)(mb.count(done.w, done.s), done.skipped)} />
      {fill.error && <Notice tone="stop" text={mb.fillSpotsFailed(errorLabel(a, mb, fill.error).replace(/[。.]$/, ""))} />}
      {done.actions.length > 0 && <View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={mb.fillUndo} onPress={api.undo} /></View>}
    </View>}
    {fill.phase === "undone" && <Notice text={mb.fillUndone} />}
    {fill.phase === "pick" && fill.kinds.length > 0 && (fill.items.length ? <>
      <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{mb.fillFound(fill.items.length)}</Text>
      <View style={{ gap: 2 }}>
        {fill.items.map((it, i) => {
          const off = fill.off.has(i), here = fill.focus === i;
          return <View key={i} ref={here ? focusedRow : undefined} style={{ gap: here ? 4 : 0 }}><View style={{ flexDirection: "row", alignItems: "center", borderRadius: radii.sm, backgroundColor: here ? "#E9F3EC" : "transparent" }}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !off }} accessibilityLabel={nameOf(it, i)} onPress={() => api.toggle(i)} hitSlop={4}
              style={{ paddingVertical: 8, paddingLeft: 8, paddingRight: 6 }}>
              <Box on={!off} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => api.focus(i)}
              style={({ hovered }: any) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingRight: 8, paddingLeft: 2, borderRadius: radii.sm, backgroundColor: hovered && !here ? C.white : "transparent" })}>
              <KindIcon kind={it.kind} faded={off} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: sans, fontSize: 14, color: off ? C.muted : C.ink, textDecorationLine: off ? "line-through" : "none" }}>{nameOf(it, i)}</Text>
              <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{it.kind === "waypost" ? a.ed.sceneName[it.scene] : a.habitat[it.habitat]}</Text>
            </Pressable>
          </View>
          {here && <SeenCard it={it} name={nameOf(it, i)} on={!off} onToggle={() => api.toggle(i)} />}
          </View>;
        })}
      </View>
      {publish && <View style={{ alignItems: "flex-start" }}>
        <AButton small tone="ghost" title={mb.fillSaveDrafts} disabled={on === 0} onPress={() => api.save(false)} />
      </View>}
    </> : <Notice tone="warn" text={mb.fillNone} />)}
    {(fill.phase === "pick" || fill.phase === "saved" || fill.phase === "undone" || fill.phase === "error") && <View style={{ alignItems: "flex-start" }}>
      <AButton small tone="ghost" title={mb.fillAgain} onPress={api.draw} />
    </View>}
  </View>;
}

/** The suggestion being looked at, opened under its row: what it is, its names, and its tick box. */
function SeenCard({ it, name, on, onToggle }: { it: FillItem; name: string; on: boolean; onToggle: () => void }) {
  const mb = useMapBuilderText();
  const a = useAdminText();
  return <View style={{ gap: 6, padding: 12, borderRadius: radii.md, borderWidth: 1.5, borderColor: "#3E8E5A", backgroundColor: C.white }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <KindIcon kind={it.kind} />
      <Text style={{ flex: 1, fontFamily: sans, fontSize: 15, color: C.ink }}>{it.kind === "waypost" ? it.name_zh : name}</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={onToggle} hitSlop={6}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Box on={on} />
        <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.muted }}>{on ? mb.fillInclude : mb.fillLeftOut}</Text>
      </Pressable>
    </View>
    {it.kind === "waypost" && <Text style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{it.name_en}</Text>}
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>
      {it.kind === "waypost" ? `Waypost · ${a.ed.sceneName[it.scene]}` : `${mb.fillSpot} · ${a.habitat[it.habitat]}`} · {it.lat.toFixed(5)}, {it.lng.toFixed(5)}
    </Text>
  </View>;
}

/** The same pictures as on the map: the blue gem for a Waypost, the plum dot for a spawn spot. */
function KindIcon({ kind, faded }: { kind: FillKind; faded?: boolean }) {
  const gem = assetUri(gameArt.waypostGemBlue);
  return <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center", opacity: faded ? 0.4 : 1 }}>
    {kind === "waypost"
      ? gem ? <Image source={{ uri: gem }} style={{ width: 18, height: 20 }} resizeMode="contain" /> : null
      : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.plum, borderWidth: 2, borderColor: C.white, boxShadow: "0 1px 3px rgba(22,38,63,.35)" } as any} />}
  </View>;
}

function Box({ on }: { on: boolean }) {
  return <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blue : C.white, alignItems: "center", justifyContent: "center" }}>
    {on && <Text style={{ color: C.white, fontSize: 12, lineHeight: 14 }}>✓</Text>}
  </View>;
}

function Choice({ label, on, check, icon, disabled, onPress }: { label: string; on: boolean; check?: boolean; icon?: FillKind; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole={check ? "checkbox" : "radio"} accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={onPress}
    style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}>
    {check && <Text style={{ fontSize: 12, color: on ? C.blue : C.muted }}>{on ? "✓" : "＋"}</Text>}
    {icon && <KindIcon kind={icon} faded={!on} />}
    <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.muted }}>{label}</Text>
  </Pressable>;
}
