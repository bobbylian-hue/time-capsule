// One city on the live map (docs/design/admin.md): its Wayposts, the Corrupted Capsules out in this wave,
// and the hunts' Keepers and quests. Same map and pins as Journey. Owners and admins can switch to edit mode
// to add, move, rename and hide Wayposts and to hide spawn spots (phase 2). With the map builder's R1
// (docs/design/map-builder.md) the map also shows the city border and the S2 grid, names new Wayposts from the
// map tiles, takes photos, and adds and moves spawn spots.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { characters, gameArt } from "../../art/manifest";
import { crackOverlays } from "../../art/crackOverlays";
import { useLanguage } from "../../i18n";
import { VESSELS } from "../shop/strings";
import { keeperPortrait } from "../hunt/HuntViews";
import { questImageUri } from "../hunt/questImage";
import { vesselUri } from "../journey/journeyModel";
import { LiveMap } from "../journey/live/LiveMap";
import { mapHtml } from "../journey/live/mapHtml";
import { assetUri, type LiveMapHandle, type LivePin } from "../journey/live/types";
import { MAP_PMTILES_URL } from "../../services/publicCapsule";
import { ADMIN_EDIT, admin, can, minutesLeft, type CityMap } from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdmin } from "./AdminShell";
import { useAdminText } from "./strings";
import { AButton, Card, Failed, Loading, Notice, Pill, Stat, VesselThumb, useLoad, useWide } from "./ui";
import { EditBar, VisibilityCard, WaypostForm } from "./WaypostEditor";
import { RackCard } from "./RackCard";
import { ADMIN_HUNT_LOOP } from "../../services/adminHuntLoop";
import { MAP_BUILDER_R1, insideBorder, type MapNames } from "../../services/mapBuilder";
import { useMapBuilderText } from "./mapBuilderStrings";
import { SpotForm, WaypostBuilderForm, WaypostNumbers, type Ask } from "./WaypostBuilder";

type Layer = "wayposts" | "wave" | "hunts" | "spots";
/** Pins reach full size a couple of zooms in from the whole city, and stay readable (never vanish) out at city scale. */
const CITY_REACH = 400;

export default function CityMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLoad(() => admin.cityMap(id), [id]);
  const waveEnd = data.data?.wave[0]?.expires_at;
  useEffect(() => {
    if (!waveEnd) return;
    const timer = setTimeout(data.reload, Math.max(1000, Date.parse(waveEnd) - Date.now() + 500));
    return () => clearTimeout(timer);
  }, [waveEnd, data.reload]);
  if (data.error) return <Failed onRetry={data.reload} />;
  if (!data.data) return <Loading />;
  return <CityMapView key={id} map={data.data} onChanged={data.reload} />;
}

function CityMapView({ map, onChanged }: { map: CityMap; onChanged: () => void }) {
  const a = useAdminText();
  const mb = useMapBuilderText();
  const { language } = useLanguage();
  const zh = language === "zh";
  const wide = useWide();
  const ref = useRef<LiveMapHandle>(null);
  const { role, refresh } = useAdmin();
  const mayEdit = ADMIN_EDIT && can(role, "edit");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ wayposts: true, wave: true, hunts: true, spots: true });
  const [editing, setEditing] = useState(false);
  /** add: the next map tap drops a new Waypost. move: the next tap is the selected Waypost's new spot.
   * spot / moveSpot: the same for spawn spots (R1). */
  const [mode, setMode] = useState<"add" | "move" | "spot" | "moveSpot" | null>(null);
  const [grid, setGrid] = useState(false);
  /** Why the last tap did nothing (outside the border), or the GPS note for Move here. */
  // Kept as a reason, not text, so it follows a language switch.
  const [tapNote, setTapNote] = useState<{ kind: "outside" } | { kind: "gpsFailed" } | { kind: "gps"; meters: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  const html = useMemo(() => mapHtml({ pmtiles: MAP_PMTILES_URL, follow: false, center: map.region.center, cityWave: true, builder: MAP_BUILDER_R1 }), []);
  // The border, the grid and which cells already have a Waypost or Landmark.
  useEffect(() => {
    if (!MAP_BUILDER_R1) return;
    ref.current?.command({ type: "builder", border: map.region.border ?? null, grid,
      posts: map.wayposts.filter((w) => w.game_enabled).map((w) => ({ id: w.id, lat: w.lat, lng: w.lng })) });
  }, [map, grid]);
  // Asking the map page what the tiles call a spot; answers come back by number.
  const asks = useRef(new Map<number, (n: MapNames) => void>());
  const seq = useRef(0);
  const ask = useCallback<Ask>((lat, lng, skip) => new Promise((resolve) => {
    const id = ++seq.current;
    const done = (n: MapNames) => { asks.current.delete(id); resolve(n); };
    asks.current.set(id, done);
    setTimeout(() => asks.current.get(id)?.({ names: [], area: null, habitat: null, same: [] }), 5000);
    ref.current?.command({ type: "names", seq: id, lat, lng, skip });
  }), []);
  const everything = useMemo(() => [...map.wayposts, ...map.wave, ...map.keepers, ...map.private_quests].map((p) => ({ lat: p.lat, lng: p.lng })), [map]);
  useEffect(() => { const t = setTimeout(() => ref.current?.fit(everything), 400); return () => clearTimeout(t); }, []);

  const out = map.wave.filter((w) => !w.caught);
  const groups = useMemo(() => map.region.vessels.map((vessel) => {
    const all = map.wave.filter((w) => w.vessel === vessel);
    return { vessel, rarity: all[0]?.rarity ?? "common", out: all.filter((w) => !w.caught), caught: all.filter((w) => w.caught).length };
  }).filter((g) => g.out.length || g.caught), [map]);
  const left = map.wave[0] ? minutesLeft(map.wave[0].expires_at, now) : null;
  const pins = useMemo<LivePin[]>(() => [
    // Editing always shows Wayposts, hidden ones too (faded), so they can be brought back.
    ...(layers.wayposts || editing ? map.wayposts.filter((w) => w.game_enabled || editing).map<LivePin>((w) => {
      // A Waypost being moved stays where it is as a faint ghost; the unsaved new spot is the draft pin.
      const moved = mode === "move" && !!draft && selected === `w:${w.id}`;
      return { id: `w:${w.id}`, lat: w.lat, lng: w.lng, kind: w.kind === "landmark" ? "landmark" : "waypost",
        label: zh ? w.name_zh : w.name_en,
        vessel: assetUri(w.kind === "landmark" ? gameArt.landmarkGem : gameArt.waypostGemBlue) ?? "", selected: selected === `w:${w.id}` && !moved, locked: !w.game_enabled, ghost: moved };
    }) : []),
    // Not saved yet: see-through with a dashed ring and a "Not saved" tag.
    ...(editing && (mode === "add" || mode === "move") && draft ? [{ id: "draft", lat: draft.lat, lng: draft.lng, kind: "waypost", vessel: assetUri(gameArt.waypostGemBlue) ?? "", selected: true, draft: true, tag: mb.notSaved } as LivePin] : []),
    ...(editing && (mode === "spot" || mode === "moveSpot") && draft ? [{ id: "draft", lat: draft.lat, lng: draft.lng, kind: "spot", vessel: "", selected: true, draft: true, tag: mb.notSaved } as LivePin] : []),
    ...(editing && (layers.spots || mode === "spot" || mode === "moveSpot") ? map.spots.map<LivePin>((x) => {
      const moved = mode === "moveSpot" && !!draft && selected === `s:${x.id}`;
      return { id: `s:${x.id}`, lat: x.lat, lng: x.lng, kind: "spot", vessel: "",
        label: `${a.ed.spotTitle} ${x.lat.toFixed(5)}, ${x.lng.toFixed(5)}`, locked: !!x.hidden_at, selected: selected === `s:${x.id}` && !moved, ghost: moved };
    }) : []),
    ...(layers.wave ? map.wave.map<LivePin>((c) => ({
      id: `c:${c.spot}`, lat: c.lat, lng: c.lng, kind: "corrupted", vessel: vesselUri(c.vessel),
      cracks: assetUri(crackOverlays[c.vessel]) ?? undefined, rarity: c.rarity, done: c.caught, selected: selected === `c:${c.spot}`,
    })) : []),
    ...(layers.hunts ? [
      ...map.keepers.map<LivePin>((k) => ({ id: `k:${k.hunt}`, lat: k.lat, lng: k.lng, kind: "keeper", vessel: "", portrait: assetUri(keeperPortrait), figure: assetUri(characters.keeper) })),
      ...map.private_quests.map<LivePin>((q) => ({ id: `q:${q.id}`, lat: q.lat, lng: q.lng, kind: "quest", vessel: "", quest: "arrive", photo: questImageUri(q.picture) })),
    ] : []),
  ], [map, layers, selected, editing, mode, draft, zh, a.ed.spotTitle, mb.notSaved]);
  const state = useMemo(() => ({ you: null, reach: CITY_REACH, pins }), [pins]);

  const focus = (pinId: string, lat: number, lng: number) => { setSelected(pinId); ref.current?.focus(lat, lng); };
  const stopPlacing = () => { setMode(null); setDraft(null); setTapNote(null); };
  // On phones the map sits above the panel: go up to it to tap a spot, then down to the form.
  const page = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // On phones the popup covers the lower half of the map, so bring the place being edited into the part still showing.
  const toMap = (at?: { lat: number; lng: number }) => { if (wide) return; page.current?.scrollTo({ y: 0, animated: true }); if (at) ref.current?.focus(at.lat, at.lng); };
  const place = (next: NonNullable<typeof mode>) => { setDraft(null); setTapNote(null); setMode(next); toMap(); };
  const cityName = zh ? map.region.name_zh : map.region.name_en;
  /** Only the city border refuses (R1); the server checks it again. */
  const allowed = (at: { lat: number; lng: number }) => {
    if (!MAP_BUILDER_R1 || insideBorder(map.region.border, at)) return true;
    setTapNote({ kind: "outside" });
    return false;
  };
  const pick = (pinId: string) => { if (pinId === "draft") return; stopPlacing(); setSelected(pinId);
    const at = pinId.startsWith("w:") ? map.wayposts.find((w) => `w:${w.id}` === pinId) : pinId.startsWith("s:") ? map.spots.find((x) => `s:${x.id}` === pinId) : undefined;
    if (editing && at) toMap(at); };
  const tap = (lat: number, lng: number) => {
    if (mode) {
      if (!allowed({ lat, lng })) return;
      setTapNote(null);
      setDraft({ lat, lng }); if (mode === "add" || mode === "spot") setSelected(null); toMap({ lat, lng });
    }
    else setSelected(null);
  };
  const saved = () => { stopPlacing(); onChanged(); refresh(); };
  /** Move here: the selected Waypost or spot moves to where the admin is standing (for field visits). */
  const moveHere = (next: "move" | "moveSpot") => {
    const geo = typeof navigator !== "undefined" ? navigator.geolocation : undefined;
    if (!geo) { setTapNote({ kind: "gpsFailed" }); return; }
    setLocating(true); setTapNote(null);
    geo.getCurrentPosition((p) => {
      setLocating(false);
      const at = { lat: p.coords.latitude, lng: p.coords.longitude }, m = Math.round(p.coords.accuracy);
      setMode(next);
      if (!allowed(at)) return;
      setDraft(at);
      setTapNote({ kind: "gps", meters: m });
      ref.current?.focus(at.lat, at.lng);
    }, () => { setLocating(false); setTapNote({ kind: "gpsFailed" }); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };
  const leaveEdit = () => { setEditing(false); stopPlacing(); if (selected?.startsWith("s:")) setSelected(null); };
  const picked = selected?.startsWith("w:") ? map.wayposts.find((w) => w.id === selected.slice(2)) : undefined;
  const pickedSpot = selected?.startsWith("s:") ? map.spots.find((x) => x.id === selected.slice(2)) : undefined;
  const name = zh ? map.region.name_zh : map.region.name_en;

  // R1's editing happens in a popup over the map (Roy, 2026-11-23: it must be obvious you're editing); the side
  // panel dims behind it. Before the first tap, a hint sits on the map itself.
  const placing = mode === "add" || mode === "spot";
  const closeSheet = () => { stopPlacing(); setSelected(null); };
  const notes = <>
    {tapNote && (tapNote.kind === "outside" ? <Notice tone="stop" text={mb.outside(cityName)} />
      : tapNote.kind === "gpsFailed" ? <Notice tone="stop" text={mb.gpsFailed} />
        : <Notice tone={tapNote.meters > 30 ? "warn" : "info"} text={tapNote.meters > 30 ? mb.gpsWeak(tapNote.meters) : mb.gpsAt(tapNote.meters)} />)}
    {locating && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.locating}</Text>}
  </>;
  const waitTap = <View style={{ gap: spacing.sm }}><Notice text={a.ed.tapToMove} /><View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={a.ed.cancel} onPress={stopPlacing} /></View></View>;
  const sheet: { title: string; body: React.ReactNode; compact?: boolean } | null = !MAP_BUILDER_R1 || !editing ? null
    : mode === "add" && draft ? { title: mb.titleAddWaypost, body:
        <WaypostBuilderForm flat key={`new:${draft.lat}:${draft.lng}`} region={map.region} wayposts={map.wayposts} waypost={null} at={draft} moving={false} ask={ask}
          onMove={() => {}} onMoveHere={() => {}} onSaved={saved} onCancel={stopPlacing} /> }
    : mode === "spot" && draft ? { title: mb.titleAddSpot, body:
        <SpotForm flat key={`spot:${draft.lat}:${draft.lng}`} region={map.region} spot={null} at={draft} ask={ask} onSaved={saved} onCancel={stopPlacing} /> }
    : picked && picked.kind === "common" ? mode === "move" && !draft ? { title: mb.titleEditWaypost, compact: true, body: waitTap } : { title: mb.titleEditWaypost, body: <>
        {picked.game_enabled
          ? <WaypostBuilderForm flat key={picked.id} region={map.region} wayposts={map.wayposts} waypost={picked} at={mode === "move" && draft ? draft : picked} moving={mode === "move"} ask={ask}
              onMove={() => place("move")} onMoveHere={() => moveHere("move")} onSaved={saved} onCancel={closeSheet} />
          : <Detail map={map} id={selected!} now={now} />}
        {mode !== "move" && <VisibilityCard key={`v:${picked.id}:${picked.game_enabled}`} region={map.region.id} waypost={picked} onSaved={saved} />}
        {mode !== "move" && <WaypostNumbers key={`n:${picked.id}`} id={picked.id} />}
      </> }
    : pickedSpot ? mode === "moveSpot" && !draft ? { title: mb.titleEditSpot, compact: true, body: waitTap } : { title: mb.titleEditSpot, body:
        mode === "moveSpot" && draft
          ? <SpotForm flat key={`move:${pickedSpot.id}:${draft.lat}:${draft.lng}`} region={map.region} spot={pickedSpot} at={draft} ask={ask} onSaved={saved} onCancel={stopPlacing} />
          : <>
              <VisibilityCard key={`s:${pickedSpot.id}:${pickedSpot.hidden_at}`} region={map.region.id} spot={pickedSpot} onSaved={saved} />
              {!pickedSpot.hidden_at && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                <AButton small tone="ghost" title={mb.moveSpot} onPress={() => place("moveSpot")} />
                <AButton small tone="ghost" title={mb.moveHere} onPress={() => moveHere("moveSpot")} />
              </View>}
            </> }
    : null;
  const hint = MAP_BUILDER_R1 && editing && placing && !draft;
  const builderPanel = <>
    {mayEdit && (editing
      ? <View style={{ gap: spacing.sm }}>
          <EditBar onDone={leaveEdit} />
          {!placing && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <AButton small title={a.ed.addWaypost} onPress={() => { setSelected(null); place("add"); }} />
            <AButton small tone="ghost" title={mb.addSpot} onPress={() => { setSelected(null); place("spot"); }} />
          </View>}
        </View>
      : <View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={a.ed.editWayposts} onPress={() => setEditing(true)} /></View>)}
    {!sheet && !hint && notes}
    {sheet ? null
      : selected
        ? <>
            <Detail map={map} id={selected} now={now} />
            {editing && picked?.kind === "landmark" && <Notice text={a.ed.landmarkNote} />}
          </>
        : !(editing && mode) && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.tapAPin}</Text>}
    {!editing && picked?.kind === "common" && <WaypostNumbers key={`n:${picked.id}`} id={picked.id} />}
  </>;
  const popup = sheet && <View style={wide
      ? { position: "absolute", left: spacing.md, top: spacing.md, width: 400, maxHeight: "92%" }
      : { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: sheet.compact ? undefined : "52%" }}>
    <View accessibilityRole={"dialog" as any} accessibilityLabel={sheet.title}
      style={{ flexShrink: 1, backgroundColor: C.paper, borderRadius: radii.md, borderBottomLeftRadius: wide ? radii.md : 0, borderBottomRightRadius: wide ? radii.md : 0,
        borderWidth: 1, borderColor: C.line, shadowColor: C.ink, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.white }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: serif, fontSize: 18, color: C.ink }}>{sheet.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={mb.close} onPress={closeSheet} hitSlop={8}
          style={({ hovered }: any) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: hovered ? "#E6EEF7" : "transparent" })}>
          <Text style={{ fontFamily: sans, fontSize: 18, color: C.muted }}>✕</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {notes}
        {sheet.body}
      </ScrollView>
    </View>
  </View>;

  const mapView = <View style={wide ? { flex: 1 } : { height: 420, borderBottomWidth: 1, borderBottomColor: C.line }}>
    <LiveMap ref={ref} html={html} state={state} onSelect={pick} onTap={tap} onNames={(m) => asks.current.get(m.seq)?.({ names: m.names, area: m.area as MapNames["area"], habitat: (m.habitat ?? null) as MapNames["habitat"], same: m.same })} />
    {hint && <View style={{ position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md, alignItems: "center" }} pointerEvents="box-none">
      <View style={{ maxWidth: 420, gap: spacing.sm, backgroundColor: C.white, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: C.line, shadowColor: C.ink, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
        {notes}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={{ flex: 1, fontFamily: sans, fontSize: 14, color: C.ink }}>{mode === "add" ? mb.tapToAdd : mb.tapToAddSpot}</Text>
          <AButton small tone="ghost" title={a.ed.cancel} onPress={stopPlacing} />
        </View>
      </View>
    </View>}
  </View>;

  const panel = <View pointerEvents={sheet ? "none" : "auto"} style={[wide ? { width: 380, borderLeftWidth: 1, borderLeftColor: C.line, backgroundColor: C.paper } : null, sheet ? { opacity: 0.4 } : null]}><ScrollView style={wide ? { flex: 1 } : undefined}
    contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
    <View style={{ gap: 4 }}>
      <Pressable accessibilityRole="link" onPress={() => router.push("/admin" as any)}>
        <Text style={{ fontFamily: sans, fontSize: 13, color: C.blue }}>← {a.nav.overview}</Text>
      </Pressable>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{zh ? map.region.country_zh : map.region.country_en} · {map.region.timezone}</Text>
      <Text accessibilityRole="header" style={{ fontFamily: serif, fontSize: 28, color: C.ink }}>{name}</Text>
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md, columnGap: spacing.sm }}>
      <Stat label={a.wayposts} value={map.region.wayposts.common} tone={C.blue} />
      <Stat label={a.landmarks} value={map.region.wayposts.landmark} tone={C.ink} />
      <Stat label={a.outNow} value={out.length} tone={C.plum} />
      {MAP_BUILDER_R1 && map.region.cells_used != null && <Stat label={mb.cellsUsed} value={map.region.cells_used} />}
    </View>
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.mapLayers}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {(["wayposts", "wave", "hunts"] as const).map((l) => <Chip key={l} label={a.layer[l]} on={layers[l] || (l === "wayposts" && editing)} onPress={() => setLayers((x) => ({ ...x, [l]: !x[l] }))} />)}
        {editing && <Chip label={a.ed.layerSpots} on={layers.spots} onPress={() => setLayers((x) => ({ ...x, spots: !x.spots }))} />}
        {MAP_BUILDER_R1 && <Chip label={mb.grid} on={grid} onPress={() => setGrid((g) => !g)} />}
      </View>
      {MAP_BUILDER_R1 && grid && <Text style={{ fontFamily: sans, fontSize: 12, lineHeight: 18, color: C.muted }}>{mb.gridNote}</Text>}
    </View>
    {MAP_BUILDER_R1 ? builderPanel : <>
    {mayEdit && (editing
      ? <View style={{ gap: spacing.sm }}>
          <EditBar onDone={leaveEdit} />
          {mode === "add"
            ? !draft && <View style={{ gap: spacing.sm }}><Notice text={a.ed.tapToAdd} /><View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={a.ed.cancel} onPress={stopPlacing} /></View></View>
            : <View style={{ alignItems: "flex-start" }}><AButton small title={a.ed.addWaypost} onPress={() => { setSelected(null); place("add"); }} /></View>}
        </View>
      : <View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={a.ed.editWayposts} onPress={() => setEditing(true)} /></View>)}
    {editing && mode === "add" && draft
      ? <WaypostForm key={`new:${draft.lat}:${draft.lng}`} region={map.region.id} waypost={null} at={draft} moving={false} onMove={() => {}} onSaved={saved} onCancel={stopPlacing} />
      : editing && picked && picked.kind === "common"
        ? <>
            {picked.game_enabled
              ? <>
                  {mode === "move" && !draft && <Notice text={a.ed.tapToMove} />}
                  <WaypostForm key={picked.id} region={map.region.id} waypost={picked} at={mode === "move" && draft ? draft : picked} moving={mode === "move"}
                    onMove={() => place("move")} onSaved={saved} onCancel={() => { stopPlacing(); setSelected(null); }} />
                </>
              : <Detail map={map} id={selected!} now={now} />}
            {mode !== "move" && <VisibilityCard key={`v:${picked.id}:${picked.game_enabled}`} region={map.region.id} waypost={picked} onSaved={saved} />}
          </>
        : editing && pickedSpot
          ? <VisibilityCard key={`s:${pickedSpot.id}:${pickedSpot.hidden_at}`} region={map.region.id} spot={pickedSpot} onSaved={saved} />
          : selected
            ? <>
                <Detail map={map} id={selected} now={now} />
                {editing && picked?.kind === "landmark" && <Notice text={a.ed.landmarkNote} />}
              </>
            : !(editing && mode) && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.tapAPin}</Text>}
    </>}
    {ADMIN_HUNT_LOOP && picked?.kind === "common" && mode !== "move" && <RackCard key={picked.id} waypost={picked.id} />}
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: serif, fontSize: 17, color: C.ink }}>{a.layer.wave}</Text>
        {left != null && <Text style={{ fontFamily: sans, fontSize: 12, color: C.plum }}>{a.waveEnds(left)}</Text>}
      </View>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.inWave(out.length, map.wave.length - out.length)}</Text>
      {groups.map((g) => {
        const on = g.out.some((c) => selected === `c:${c.spot}`);
        return <Pressable key={g.vessel} accessibilityRole="button" disabled={!g.out.length} onPress={() => {
          // Each tap moves on to the next one of this vessel, so every capsule can be found on the map.
          const at = g.out.findIndex((c) => selected === `c:${c.spot}`);
          const next = g.out[(at + 1) % g.out.length];
          focus(`c:${next.spot}`, next.lat, next.lng);
        }}
          style={({ hovered }: any) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: 6, borderRadius: radii.sm,
            backgroundColor: on ? "#E6EEF7" : hovered && g.out.length ? C.white : "transparent", opacity: g.out.length ? 1 : 0.5 })}>
          <VesselThumb kind={g.vessel} size={40} faded={!g.out.length} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{(VESSELS as any)[g.vessel]?.name[language] ?? g.vessel}</Text>
            <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.inWave(g.out.length, g.caught)}</Text>
          </View>
          <Pill tone={g.rarity === "rare" ? "brass" : g.rarity === "uncommon" ? "plum" : "blue"} label={a.rarity[g.rarity]} />
        </Pressable>;
      })}
    </View>
    {!mayEdit && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{ADMIN_EDIT ? a.ed.viewOnly : a.editLater}</Text>}
  </ScrollView></View>;

  return wide
    ? <View style={{ flex: 1, flexDirection: "row" }}>{mapView}{panel}{popup}</View>
    : <View style={{ flex: 1 }}>
        <ScrollView ref={page} style={{ flex: 1 }} scrollEnabled={!sheet} contentContainerStyle={{ flexGrow: 1 }}>{mapView}{panel}</ScrollView>
        {popup}
      </View>;
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={onPress}
    style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingHorizontal: 12, paddingVertical: 6 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? C.blue : C.line }} />
    <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.muted }}>{label}</Text>
  </Pressable>;
}

function Detail({ map, id, now }: { map: CityMap; id: string; now: number }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const zh = language === "zh";
  const [kind, key] = [id.slice(0, 1), id.slice(2)];
  const coords = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (kind === "w") {
    const w = map.wayposts.find((x) => x.id === key); if (!w) return null;
    return <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Pill tone={w.kind === "landmark" ? "ink" : "blue"} label={w.kind === "landmark" ? a.landmark : a.commonWaypost} />
        {!w.game_enabled && <Pill label={a.hidden} />}
      </View>
      <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{zh ? w.name_zh : w.name_en}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{zh ? w.name_en : w.name_zh} · {coords(w.lat, w.lng)}</Text>
    </Card>;
  }
  if (kind === "c") {
    const c = map.wave.find((x) => x.spot === key); if (!c) return null;
    return <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <VesselThumb kind={c.vessel} size={64} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{(VESSELS as any)[c.vessel]?.name[language] ?? c.vessel}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pill tone={c.rarity === "rare" ? "brass" : c.rarity === "uncommon" ? "plum" : "blue"} label={a.rarity[c.rarity]} />
          <Pill tone="plum" label={a.minutesLeft(minutesLeft(c.expires_at, now))} />
        </View>
        <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{coords(c.lat, c.lng)}</Text>
      </View>
    </Card>;
  }
  if (kind === "k") {
    const k = map.keepers.find((x) => x.hunt === key); if (!k) return null;
    return <Card style={{ gap: 6 }}>
      <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{a.keeper(zh ? k.name_zh : k.name_en)}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{k.hunt} · {coords(k.lat, k.lng)}</Text>
    </Card>;
  }
  const q = map.private_quests.find((x) => x.id === key); if (!q) return null;
  return <Card style={{ gap: 6 }}>
    <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{a.privateQuest(q.hunt_name)}</Text>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{q.hunt} · {coords(q.lat, q.lng)}</Text>
  </Card>;
}
