// Fill an area (docs/design/map-builder.md, R1.5): drag a box on the map, the server suggests safe points in it,
// Wayposts take their names from the map tiles (numbered like copied files when a name is used), spawn spots take
// their habitat from the tiles, and everything is saved as drafts to check and then publish.
import React, { useCallback, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../../i18n";
import type { Habitat, MapWaypost, Region, Scene } from "../../services/admin";
import { builder, FILL_SPACING, sceneFor, type Box } from "../../services/mapBuilder";
import { numberedNames } from "../../services/waypostNames";
import type { MapCommand, MapMessage } from "../journey/live/types";
import { C, radii, sans, spacing } from "../../theme";
import { useAdminText } from "./strings";
import { useMapBuilderText } from "./mapBuilderStrings";
import { errorLabel, useSheetActions } from "./EditSheet";
import { AButton, Notice } from "./ui";

export type FillKind = "waypost" | "spot";
export type FillItem = { lat: number; lng: number; name_zh: string; name_en: string; scene: Scene; habitat: Habitat };
type Phase = "draw" | "looking" | "pick" | "none" | "saving" | "saved" | "error";
export type Fill = { kind: FillKind; spacing: number; phase: Phase; items: FillItem[]; off: Set<number>;
  saved?: { n: number; skipped: number }; error?: string };
type Many = Extract<MapMessage, { type: "namesMany" }>["items"];

/** The fill flow's state; the map's box and namesMany messages come in through onBox and onMany. */
export function useFill({ region, wayposts, command, onSaved }: {
  region: Region; wayposts: MapWaypost[]; command: (m: MapCommand) => void; onSaved: () => void;
}) {
  const [fill, setFill] = useState<Fill | null>(null);
  const many = useRef(new Map<number, (items: Many) => void>());
  const seq = useRef(0);
  const askMany = (points: { lat: number; lng: number }[]) => new Promise<Many>((resolve) => {
    const id = ++seq.current;
    many.current.set(id, (items) => { many.current.delete(id); resolve(items); });
    setTimeout(() => many.current.get(id)?.(points.map(() => ({ names: [], habitat: null }))), 8000);
    command({ type: "namesMany", seq: id, points });
  });
  const draw = (kind: FillKind, spacing: number) => {
    command({ type: "boxClear" }); command({ type: "boxMode", on: true });
    setFill({ kind, spacing, phase: "draw", items: [], off: new Set() });
  };
  const start = () => draw("waypost", FILL_SPACING.waypost[1]);
  const stop = useCallback(() => { command({ type: "boxMode", on: false }); command({ type: "boxClear" }); setFill(null); }, [command]);
  const onBox = async (box: Box) => {
    if (!fill || fill.phase !== "draw") return;
    const { kind, spacing } = fill;
    command({ type: "boxMode", on: false });
    setFill({ ...fill, phase: "looking" });
    try {
      const points = await builder.areaSuggest(region.id, kind, box, spacing);
      const answers = points.length ? await askMany(points) : [];
      // Every name already used in the city, plus the ones given to earlier points in this box.
      const taken = { zh: new Set(wayposts.map((w) => w.name_zh.trim())), en: new Set(wayposts.map((w) => w.name_en.trim())) };
      const items = points.map<FillItem>((p, i) => {
        const a = answers[i], top = a?.names[0];
        const named = numberedNames(top?.zh || `${region.name_zh} Waypost`, top?.en || `${region.name_en} Waypost`, taken);
        if (kind === "waypost") { taken.zh.add(named.zh); taken.en.add(named.en); }
        return { ...p, name_zh: named.zh, name_en: named.en, scene: sceneFor(top?.kind), habitat: (a?.habitat as Habitat) ?? "square" };
      });
      setFill((f) => f && { ...f, phase: items.length ? "pick" : "none", items });
    } catch (e) {
      setFill((f) => f && { ...f, phase: "error", error: (e as Error)?.message || "failed" });
    }
  };
  const onMany = (m: Extract<MapMessage, { type: "namesMany" }>) => many.current.get(m.seq)?.(m.items);
  const toggle = (i: number) => setFill((f) => {
    if (!f || f.phase !== "pick") return f;
    const off = new Set(f.off); if (off.has(i)) off.delete(i); else off.add(i);
    return { ...f, off };
  });
  const save = async () => {
    if (!fill) return;
    const chosen = fill.items.filter((_, i) => !fill.off.has(i));
    setFill({ ...fill, phase: "saving" });
    try {
      const r = fill.kind === "waypost"
        ? await builder.addWayposts(region.id, chosen.map(({ lat, lng, name_zh, name_en, scene }) => ({ lat, lng, name_zh, name_en, scene })), null)
        : await builder.addSpots(region.id, chosen.map(({ lat, lng, habitat }) => ({ lat, lng, habitat })), null);
      command({ type: "boxClear" });
      setFill((f) => f && { ...f, phase: "saved", items: [], off: new Set(), saved: { n: r.added.length, skipped: r.skipped.length } });
      onSaved();
    } catch (e) {
      setFill((f) => f && { ...f, phase: "error", error: (e as Error)?.message || "failed" });
    }
  };
  return { fill, start, stop, draw, onBox, onMany, toggle, save };
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
  useSheetActions({ dirty: fill?.phase === "pick", canSave: fill?.phase === "pick" && on > 0, busy: fill?.phase === "saving",
    saveLabel: mb.fillSave(on), save: async () => { await api.save(); return true; } },
    fill?.phase === "pick" || fill?.phase === "saving");
  if (!fill) return null;
  const choosing = fill.phase === "draw" || fill.phase === "saved" || fill.phase === "none" || fill.phase === "error";
  return <View style={{ gap: spacing.md }}>
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.fillKind}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["waypost", "spot"] as const).map((k) => <Choice key={k} label={k === "waypost" ? mb.fillWayposts : mb.fillSpots} on={fill.kind === k}
          disabled={!choosing && fill.phase !== "pick"} onPress={() => api.draw(k, FILL_SPACING[k][1])} />)}
      </View>
    </View>
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.fillSpacing}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {FILL_SPACING[fill.kind].map((m) => <Choice key={m} label={`${m} m`} on={fill.spacing === m}
          disabled={!choosing && fill.phase !== "pick"} onPress={() => api.draw(fill.kind, m)} />)}
      </View>
    </View>
    {fill.phase === "draw" && <Notice text={mb.fillDraw} />}
    {(fill.phase === "looking" || fill.phase === "saving") && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{fill.phase === "looking" ? mb.fillLooking : a.ed.saving}</Text>}
    {fill.phase === "none" && <Notice tone="warn" text={mb.fillNone} />}
    {fill.phase === "error" && fill.error && <Notice tone="stop" text={errorLabel(a, mb, fill.error)} />}
    {fill.phase === "saved" && fill.saved && <Notice text={mb.fillSaved(fill.saved.n, fill.saved.skipped)} />}
    {fill.phase === "pick" && <>
      <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{mb.fillFound(fill.items.length)}</Text>
      <View style={{ gap: 2 }}>
        {fill.items.map((it, i) => {
          const off = fill.off.has(i);
          return <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: !off }} onPress={() => api.toggle(i)}
            style={({ hovered }: any) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: hovered ? C.white : "transparent" })}>
            <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: off ? C.line : C.blue, backgroundColor: off ? C.white : C.blue, alignItems: "center", justifyContent: "center" }}>
              {!off && <Text style={{ color: C.white, fontSize: 12, lineHeight: 14 }}>✓</Text>}
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: sans, fontSize: 14, color: off ? C.muted : C.ink, textDecorationLine: off ? "line-through" : "none" }}>
              {fill.kind === "waypost" ? (language === "zh" ? it.name_zh : it.name_en) : `${i + 1}. ${it.lat.toFixed(5)}, ${it.lng.toFixed(5)}`}
            </Text>
            {fill.kind === "spot" && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.habitat[it.habitat]}</Text>}
          </Pressable>;
        })}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" }}>
        <AButton small tone="ghost" title={mb.fillAgain} onPress={() => api.draw(fill.kind, fill.spacing)} />
      </View>
    </>}
    {(fill.phase === "saved" || fill.phase === "none" || fill.phase === "error") && <View style={{ alignItems: "flex-start" }}>
      <AButton small tone="ghost" title={mb.fillAgain} onPress={() => api.draw(fill.kind, fill.spacing)} />
    </View>}
  </View>;
}

function Choice({ label, on, disabled, onPress }: { label: string; on: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={onPress}
    style={{ borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingHorizontal: 12, paddingVertical: 6, opacity: disabled ? 0.5 : 1 }}>
    <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.muted }}>{label}</Text>
  </Pressable>;
}
