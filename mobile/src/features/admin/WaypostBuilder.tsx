// The map builder's Waypost and spawn-spot cards (docs/design/map-builder.md, release R1). Roy: warn, don't block.
// Only the city border refuses; a Waypost in the same grid cell or on land the map marks as a school is a note.
// Names come from the map tiles (OpenStreetMap), so a new Waypost rarely needs typing.
import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useLanguage } from "../../i18n";
import { pickPhoto } from "../../components/pickPhoto";
import type { Habitat, MapSpot, MapWaypost, Region, Scene } from "../../services/admin";
import { builder, insideBorder, photoUrl, sceneFor, uploadWaypostPhoto, type BuilderCheck, type MapNames, type WaypostStats } from "../../services/mapBuilder";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdminText, type AdminText } from "./strings";
import { useMapBuilderText, type MapBuilderText } from "./mapBuilderStrings";
import { AButton, Card, Field, Notice, Pill, Stat, timeAgo } from "./ui";
import { ScenePicker } from "./WaypostEditor";

const hasChinese = (x: string) => /[㐀-鿿]/.test(x);
const errorText = (a: AdminText, mb: MapBuilderText, e: unknown) => {
  const code = (e as Error)?.message;
  return mb.error[code] ?? a.error[code] ?? a.error.failed;
};
export type Ask = (lat: number, lng: number, skip?: string) => Promise<MapNames>;
type At = { lat: number; lng: number };

/** The server's view of a spot (border, same cell, live hunts), asked again whenever the spot changes. */
function useCheck(region: string, at: At | null, skip?: string) {
  const [check, setCheck] = useState<BuilderCheck | null>(null);
  useEffect(() => {
    if (!at) return;
    let live = true;
    setCheck(null);
    const timer = setTimeout(() => builder.check(region, at.lat, at.lng, skip).then((c) => live && setCheck(c), () => {}), 250);
    return () => { live = false; clearTimeout(timer); };
  }, [region, at?.lat, at?.lng, skip]);
  return check;
}

/** What the map tiles call the spot, the land it's on and its grid-cell neighbours. */
function useNames(ask: Ask, at: At, skip?: string) {
  const [names, setNames] = useState<MapNames | null>(null);
  useEffect(() => {
    let live = true;
    setNames(null);
    ask(at.lat, at.lng, skip).then((n) => live && setNames(n));
    return () => { live = false; };
  }, [at.lat, at.lng, skip]);
  return names;
}

/** Soft notes, never blocks: outside the border is the only stop. */
function PlaceNotes({ region, at, wayposts, check, names }: { region: Region; at: At; wayposts: MapWaypost[]; check: BuilderCheck | null; names: MapNames | null }) {
  const mb = useMapBuilderText();
  const a = useAdminText();
  const { language } = useLanguage();
  const zh = language === "zh";
  if (!insideBorder(region.border, at) || check?.inside_border === false) return <Notice tone="stop" text={mb.outside(zh ? region.name_zh : region.name_en)} />;
  // The server's list when it has one; until then the map page's, which uses the same S2 library.
  const same = check?.same_cell ?? (names?.same ?? []).flatMap((s) => {
    const w = wayposts.find((x) => x.id === s.id);
    return w ? [{ id: w.id, name_zh: w.name_zh, name_en: w.name_en, meters: s.meters }] : [];
  });
  return <View style={{ gap: spacing.sm }}>
    {same.slice(0, 1).map((s) => <Notice key={s.id} text={mb.softCell(zh ? s.name_zh : s.name_en, s.meters)} />)}
    {names?.area && <Notice tone="warn" text={mb.softArea(mb.areaKinds[names.area])} />}
    {check?.live_hunts.map((h) => <Notice key={h.id} text={a.ed.huntWarn(zh ? h.name_zh : h.name_en)} />)}
  </View>;
}

/** The tiles' names near the spot as chips; tapping one fills both names and suggests a picture. */
function NameChips({ names, onPick }: { names: MapNames | null; onPick: (n: MapNames["names"][number]) => void }) {
  const mb = useMapBuilderText();
  const { language } = useLanguage();
  return <View style={{ gap: 6 }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.nearby}</Text>
    {!names ? <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.lookingNames}</Text>
      : !names.names.length ? <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.noNearby}</Text>
        : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {names.names.map((n, i) => {
              const label = language === "zh" ? n.zh || n.en : n.en || n.zh;
              return <Pressable key={`${n.zh}|${n.en}|${i}`} accessibilityRole="button" onPress={() => onPick(n)}
                style={({ hovered }: any) => ({ borderWidth: 1, borderColor: C.line, backgroundColor: hovered ? "#E6EEF7" : C.white, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 })}>
                <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 12, color: C.ink, maxWidth: 220 }}>{label} <Text style={{ color: C.muted }}>{n.meters < 999 ? `${n.meters} m` : ""}</Text></Text>
              </Pressable>;
            })}
          </View>}
  </View>;
}

/** The picture players see when they spin: one of our scenes, or an uploaded photo over it with its credit. */
function PicturePicker({ region, scene, onScene, photo, onPhoto, credit, onCredit }: {
  region: string; scene: Scene | null; onScene: (s: Scene) => void;
  photo: string | null; onPhoto: (p: string | null) => void; credit: string; onCredit: (c: string) => void;
}) {
  const mb = useMapBuilderText();
  const a = useAdminText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = async () => {
    setError(null);
    try {
      const picked = await pickPhoto("library", 1280);
      if (!picked || picked === "denied") return;
      setBusy(true);
      onPhoto(await uploadWaypostPhoto(region, picked));
    } catch (e) { setError(errorText(a, mb, e)); } finally { setBusy(false); }
  };
  const url = photoUrl(photo);
  return <View style={{ gap: spacing.sm }}>
    <ScenePicker value={scene} onChange={onScene} />
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      {url
        ? <Image source={{ uri: url }} accessibilityLabel={mb.picture} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: C.blue }} />
        : <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.muted, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: sans, fontSize: 22, color: C.muted }}>＋</Text>
          </View>}
      <View style={{ flex: 1, gap: 6, alignItems: "flex-start" }}>
        <AButton small tone="ghost" title={busy ? mb.uploading : mb.upload} disabled={busy} onPress={upload} />
        {url && <AButton small tone="ghost" title={mb.removePhoto} onPress={() => { onPhoto(null); onCredit(""); }} />}
      </View>
    </View>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.photoNote}</Text>
    {url && <Field label={mb.credit} value={credit} onChangeText={onCredit} maxLength={120} placeholder="© …" />}
    {error && <Notice tone="stop" text={error} />}
  </View>;
}

/** Adding a Waypost at `at`, or editing one (moving it to `at` when that differs). */
export function WaypostBuilderForm({ region, wayposts, waypost, at, moving, ask, onMove, onMoveHere, onSaved, onCancel }: {
  region: Region;
  wayposts: MapWaypost[];
  waypost: MapWaypost | null;
  at: At;
  moving: boolean;
  ask: Ask;
  onMove: () => void;
  onMoveHere: () => void;
  onSaved: (w: MapWaypost) => void;
  onCancel: () => void;
}) {
  const a = useAdminText();
  const mb = useMapBuilderText();
  const { language } = useLanguage();
  const adding = !waypost;
  const [nameZh, setNameZh] = useState(waypost?.name_zh ?? "");
  const [nameEn, setNameEn] = useState(waypost?.name_en ?? "");
  const [scene, setScene] = useState<Scene | null>(waypost?.scene ?? null);
  const [photo, setPhoto] = useState<string | null>(waypost?.photo ?? null);
  const [credit, setCredit] = useState(waypost?.photo_credit ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moved = !!waypost && (waypost.lat !== at.lat || waypost.lng !== at.lng);
  const check = useCheck(region.id, adding || moved ? at : null, waypost?.id);
  const names = useNames(ask, at, waypost?.id);
  const typed = useRef(false);

  // A new Waypost starts with the best name the map has, and the picture that kind of place suggests.
  useEffect(() => {
    if (!adding || typed.current || !names?.names[0]) return;
    const top = names.names[0];
    setNameZh(top.zh); setNameEn(top.en); setScene(sceneFor(top.kind));
  }, [adding, names]);
  useEffect(() => { if (adding && names && !names.names.length && !scene) setScene("square"); }, [adding, names]);

  const pick = (n: MapNames["names"][number]) => { typed.current = true; setNameZh(n.zh); setNameEn(n.en); setScene(sceneFor(n.kind)); };
  const inside = insideBorder(region.border, at) && check?.inside_border !== false;
  const ready = !!nameZh.trim() && hasChinese(nameZh) && !!nameEn.trim() && !!scene && inside && !busy;

  const save = async () => {
    if (!ready || !scene) return;
    setBusy(true); setError(null);
    try {
      const base = { lat: at.lat, lng: at.lng, name_zh: nameZh.trim(), name_en: nameEn.trim(), scene };
      if (adding) onSaved(await builder.addWaypost(region.id, { ...base, photo, photo_credit: photo ? credit.trim() || null : null }, note.trim() || null));
      else {
        // null keeps what's there; "" clears it.
        const nextCredit = photo ? credit.trim() : "";
        onSaved(await builder.updateWaypost(waypost.id, { ...base,
          photo: photo === (waypost.photo ?? null) ? null : photo ?? "",
          photo_credit: nextCredit === (waypost.photo_credit ?? "") ? null : nextCredit }, note.trim() || null));
      }
    } catch (e) { setError(errorText(a, mb, e)); } finally { setBusy(false); }
  };

  return <Card style={{ gap: spacing.md }}>
    <View style={{ gap: 4 }}>
      <Pill tone="blue" label={adding ? a.ed.newWaypost : a.commonWaypost} />
      {!adding && <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{language === "zh" ? waypost.name_zh : waypost.name_en}</Text>}
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{at.lat.toFixed(5)}, {at.lng.toFixed(5)}</Text>
    </View>
    {(adding || moved) && <PlaceNotes region={region} at={at} wayposts={wayposts} check={check} names={names} />}
    <NameChips names={names} onPick={pick} />
    <Field label={a.ed.nameZh} hint={a.ed.nameZhHint} value={nameZh} onChangeText={(x) => { typed.current = true; setNameZh(x); }} maxLength={40} />
    <Field label={a.ed.nameEn} value={nameEn} onChangeText={(x) => { typed.current = true; setNameEn(x); }} maxLength={60} autoCapitalize="words" />
    <PicturePicker region={region.id} scene={scene} onScene={setScene} photo={photo} onPhoto={setPhoto} credit={credit} onCredit={setCredit} />
    <Field label={a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" }}>
      {!adding && !moving && <AButton small tone="ghost" title={a.ed.move} onPress={onMove} />}
      {!adding && <AButton small tone="ghost" title={mb.moveHere} onPress={onMoveHere} />}
      <AButton small tone="ghost" title={a.ed.cancel} onPress={onCancel} />
      <AButton small title={busy ? a.ed.saving : a.ed.save} disabled={!ready} onPress={save} />
    </View>
    {(adding || moved) && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.live}</Text>}
  </Card>;
}

const HABITATS: Habitat[] = ["park", "water", "square"];

/** A new spawn spot at `at`, or an existing one moving to `at`. */
export function SpotForm({ region, spot, at, onSaved, onCancel }: { region: Region; spot: MapSpot | null; at: At; onSaved: (s: MapSpot) => void; onCancel: () => void }) {
  const a = useAdminText();
  const mb = useMapBuilderText();
  const { language } = useLanguage();
  const [habitat, setHabitat] = useState<Habitat>(spot?.habitat ?? "park");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inside = insideBorder(region.border, at);
  const save = async () => {
    setBusy(true); setError(null);
    try { onSaved(spot ? await builder.moveSpot(spot.id, at.lat, at.lng, note.trim() || null) : await builder.addSpot(region.id, at.lat, at.lng, habitat, note.trim() || null)); }
    catch (e) { setError(errorText(a, mb, e)); } finally { setBusy(false); }
  };
  return <Card style={{ gap: spacing.md }}>
    <View style={{ gap: 4 }}>
      <Pill tone="plum" label={spot ? a.ed.spotTitle : mb.newSpot} />
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{at.lat.toFixed(5)}, {at.lng.toFixed(5)}</Text>
    </View>
    {!inside && <Notice tone="stop" text={mb.outside(language === "zh" ? region.name_zh : region.name_en)} />}
    {!spot && <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.habitatLabel}</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing.sm }}>
        {HABITATS.map((h) => {
          const on = habitat === h;
          return <Pressable key={h} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setHabitat(h)}
            style={{ borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.ink }}>{a.habitat[h]}</Text>
          </Pressable>;
        })}
      </View>
    </View>}
    <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{mb.spotNext}</Text>
    <Field label={a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" }}>
      <AButton small tone="ghost" title={a.ed.cancel} onPress={onCancel} />
      <AButton small title={busy ? a.ed.saving : spot ? mb.movedSpotSave : a.ed.save} disabled={busy || !inside} onPress={save} />
    </View>
  </Card>;
}

/** Spins, level, last spin and the rack: how a Waypost is doing. Any role can look. */
export function WaypostNumbers({ id }: { id: string }) {
  const mb = useMapBuilderText();
  const { language } = useLanguage();
  const [stats, setStats] = useState<WaypostStats | null>(null);
  useEffect(() => {
    let live = true;
    setStats(null);
    builder.stats(id).then((s) => live && setStats(s), () => {});
    return () => { live = false; };
  }, [id]);
  if (!stats) return null;
  return <Card style={{ gap: spacing.sm }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.numbers}</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      <Stat label={mb.spins} value={stats.spins} tone={C.blue} />
      <Stat label={mb.level} value={stats.level} />
      <Stat label={mb.rack} value={stats.rack} tone={C.plum} />
    </View>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{mb.lastSpin(stats.last_spin_at ? timeAgo(stats.last_spin_at, language) : mb.never)}</Text>
  </Card>;
}
