// Fill an area (docs/design/map-builder.md, R1.5): drag a box on the map, the server suggests safe points in it,
// Wayposts take their names from the map tiles (numbered like copied files when a name is used), spawn spots take
// their habitat from the tiles, and everything is saved as drafts to check and then publish.
// Roy (2026-11-23): every kind of place starts selected (Wayposts and spawn spots; Landmarks later), and switching
// a kind off or changing a spacing reloads the same box, with no redrawing.
import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../../i18n";
import type { Habitat, MapWaypost, Region, Scene } from "../../services/admin";
import { builder, FILL_DEFAULT, FILL_SPACING, sceneFor, type Box } from "../../services/mapBuilder";
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
type Phase = "draw" | "looking" | "pick" | "saving" | "saved" | "error";
export type Fill = { kinds: FillKind[]; spacing: Record<FillKind, number>; box: Box | null; phase: Phase;
  items: FillItem[]; off: Set<number>; saved?: { n: number; skipped: number }; error?: string };
type Many = Extract<MapMessage, { type: "namesMany" }>["items"];

/** The fill flow's state; the map's box and namesMany messages come in through onBox and onMany. */
export function useFill({ region, wayposts, command, onSaved }: {
  region: Region; wayposts: MapWaypost[]; command: (m: MapCommand) => void; onSaved: () => void;
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
    setFill((f) => f && { ...f, box, kinds, spacing: gaps, phase: "looking", items: [], off: new Set(), error: undefined });
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
    setFill((f) => ({ kinds: f?.kinds ?? FILL_KINDS, spacing: f?.spacing ?? { ...FILL_DEFAULT }, box: null, phase: "draw", items: [], off: new Set() }));
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
  const save = async () => {
    if (!fill) return;
    const chosen = fill.items.filter((_, i) => !fill.off.has(i));
    const posts = chosen.filter((x) => x.kind === "waypost"), spots = chosen.filter((x) => x.kind === "spot");
    setFill({ ...fill, phase: "saving" });
    try {
      const a = posts.length ? await builder.addWayposts(region.id, posts.map(({ lat, lng, name_zh, name_en, scene }) => ({ lat, lng, name_zh, name_en, scene })), null) : { added: [], skipped: [] };
      const b = spots.length ? await builder.addSpots(region.id, spots.map(({ lat, lng, habitat }) => ({ lat, lng, habitat })), null) : { added: [], skipped: [] };
      command({ type: "boxClear" });
      setFill((f) => f && { ...f, box: null, phase: "saved", items: [], off: new Set(),
        saved: { n: a.added.length + b.added.length, skipped: a.skipped.length + b.skipped.length } });
      onSaved();
    } catch (e) {
      setFill((f) => f && { ...f, phase: "error", error: (e as Error)?.message || "failed" });
      onSaved();
    }
  };
  return { fill, start, stop, draw, onBox, onMany, toggle, toggleKind, setSpacing, save };
}
export type FillApi = ReturnType<typeof useFill>;

/** What goes inside the Fill an area popup. */
export function FillPanel({ api }: { api: FillApi }) {
  const { fill } = api;
  const mb = useMapBuilderText();
  const a = useAdminText();
  const { language } = useLanguage();
  const on = fill ? fill.items.length - fill.off.size : 0;
  // Save sits in the popup's header like every other edit; closing with suggestions still unsaved asks first.
  useSheetActions({ dirty: fill?.phase === "pick" && on > 0, canSave: fill?.phase === "pick" && on > 0, busy: fill?.phase === "saving",
    saveLabel: mb.fillSave(on), save: async () => { await api.save(); return true; } },
    fill?.phase === "pick" || fill?.phase === "saving");
  if (!fill) return null;
  const busy = fill.phase === "looking" || fill.phase === "saving";
  const label = (k: FillKind) => k === "waypost" ? mb.fillWayposts : mb.fillSpots;
  return <View style={{ gap: spacing.md }}>
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.fillKind}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {FILL_KINDS.map((k) => <Choice key={k} check label={label(k)} on={fill.kinds.includes(k)} disabled={busy} onPress={() => api.toggleKind(k)} />)}
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
    {fill.phase === "saved" && fill.saved && <Notice text={mb.fillSaved(fill.saved.n, fill.saved.skipped)} />}
    {fill.phase === "pick" && fill.kinds.length > 0 && (fill.items.length ? <>
      <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{mb.fillFound(fill.items.length)}</Text>
      <View style={{ gap: 2 }}>
        {fill.items.map((it, i) => {
          const off = fill.off.has(i);
          const n = fill.items.slice(0, i + 1).filter((x) => x.kind === it.kind).length;
          return <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: !off }} onPress={() => api.toggle(i)}
            style={({ hovered }: any) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: hovered ? C.white : "transparent" })}>
            <Box on={!off} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: sans, fontSize: 14, color: off ? C.muted : C.ink, textDecorationLine: off ? "line-through" : "none" }}>
              {it.kind === "waypost" ? (language === "zh" ? it.name_zh : it.name_en) : `${mb.fillSpots} ${n}`}
            </Text>
            <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{it.kind === "waypost" ? "Waypost" : a.habitat[it.habitat]}</Text>
          </Pressable>;
        })}
      </View>
    </> : <Notice tone="warn" text={mb.fillNone} />)}
    {(fill.phase === "pick" || fill.phase === "saved" || fill.phase === "error") && <View style={{ alignItems: "flex-start" }}>
      <AButton small tone="ghost" title={mb.fillAgain} onPress={api.draw} />
    </View>}
  </View>;
}

function Box({ on }: { on: boolean }) {
  return <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blue : C.white, alignItems: "center", justifyContent: "center" }}>
    {on && <Text style={{ color: C.white, fontSize: 12, lineHeight: 14 }}>✓</Text>}
  </View>;
}

function Choice({ label, on, check, disabled, onPress }: { label: string; on: boolean; check?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole={check ? "checkbox" : "radio"} accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={onPress}
    style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}>
    {check && <Text style={{ fontSize: 12, color: on ? C.blue : C.muted }}>{on ? "✓" : "＋"}</Text>}
    <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.muted }}>{label}</Text>
  </Pressable>;
}
