// Editing on the city map (docs/design/admin.md, phase 2): the card for adding, moving, renaming and hiding a
// Waypost, and for hiding a Corrupted Capsule spawn spot. The server runs the same checks and has the last word;
// the card shows them first so nothing is a surprise.
import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { gameArt } from "../../art/manifest";
import { useLanguage } from "../../i18n";
import { reversePlace } from "../../services/places";
import { SCENES, WAYPOST_SPACING, adminEdit, type MapSpot, type MapWaypost, type Scene, type WaypostCheck } from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdminText, type AdminText } from "./strings";
import { AButton, Card, Check, Field, Notice, Pill, timeAgo } from "./ui";

const errorText = (a: AdminText, e: unknown) => a.error[(e as Error)?.message] ?? a.error.failed;
const hasChinese = (x: string) => /[㐀-鿿]/.test(x);

/** What the server says about a spot, asked again whenever the spot changes. */
function useCheck(region: string, at: { lat: number; lng: number } | null, skip?: string) {
  const [check, setCheck] = useState<WaypostCheck | null>(null);
  useEffect(() => {
    if (!at) return;
    let live = true;
    setCheck(null);
    const timer = setTimeout(() => adminEdit.checkWaypost(region, at.lat, at.lng, skip).then((c) => live && setCheck(c), () => {}), 250);
    return () => { live = false; clearTimeout(timer); };
  }, [region, at?.lat, at?.lng, skip]);
  return check;
}

function CheckNotes({ check, note }: { check: WaypostCheck | null; note: string }) {
  const a = useAdminText();
  const { language } = useLanguage();
  if (!check) return <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.checking}</Text>;
  const near = check.nearest;
  const nearName = near ? (language === "zh" ? near.name_zh : near.name_en) : "";
  return <View style={{ gap: spacing.sm }}>
    {!check.inside_coverage && <Notice tone="stop" text={a.ed.outside} />}
    {near && (near.meters < WAYPOST_SPACING
      ? <Notice tone={note.trim() ? "info" : "warn"} text={a.ed.tooClose(nearName, near.meters)} />
      : <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.nearest(nearName, near.meters)}</Text>)}
    {check.live_hunts.map((h) => <Notice key={h.id} text={a.ed.huntWarn(language === "zh" ? h.name_zh : h.name_en)} />)}
  </View>;
}

export function ScenePicker({ value, onChange }: { value: Scene | null; onChange: (s: Scene) => void }) {
  const a = useAdminText();
  return <View style={{ gap: 6 }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.scene}</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {SCENES.map((s) => {
        const on = value === s;
        return <Pressable key={s} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={a.ed.sceneName[s]} onPress={() => onChange(s)}
          style={{ width: 64, alignItems: "center", gap: 4 }}>
          <Image source={gameArt.wheel[s]} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: on ? 3 : 1, borderColor: on ? C.blue : C.line }} />
          <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 11, color: on ? C.blue : C.ink }}>{a.ed.sceneName[s]}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

/** Adding a new Waypost at `at`, or editing an existing one (moving it to `at` when that differs). */
export function WaypostForm({ region, waypost, at, moving, onMove, onSaved, onCancel }: {
  region: string;
  waypost: MapWaypost | null;
  /** Where it will be saved: the tapped spot for a new one, the new spot while moving, otherwise its own spot. */
  at: { lat: number; lng: number };
  moving: boolean;
  onMove: () => void;
  onSaved: (w: MapWaypost) => void;
  onCancel: () => void;
}) {
  const a = useAdminText();
  const { language } = useLanguage();
  const adding = !waypost;
  const [nameZh, setNameZh] = useState(waypost?.name_zh ?? "");
  const [nameEn, setNameEn] = useState(waypost?.name_en ?? "");
  const [scene, setScene] = useState<Scene | null>(waypost?.scene ?? null);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  const [suggest, setSuggest] = useState<{ zh: string; en: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const moved = !!waypost && (waypost.lat !== at.lat || waypost.lng !== at.lng);
  const check = useCheck(region, adding || moved ? at : null, waypost?.id);

  // Whatever the map calls the spot, offered as the names so they rarely need typing.
  useEffect(() => {
    if (!adding) return;
    let live = true;
    setSuggest(null);
    Promise.all([reversePlace(at, "zh").catch(() => null), reversePlace(at, "en").catch(() => null)]).then(([zh, en]) => {
      if (live && (zh?.name || en?.name)) setSuggest({ zh: zh?.name && hasChinese(zh.name) ? zh.name : "", en: en?.name ?? "" });
    });
    return () => { live = false; };
  }, [adding, at.lat, at.lng]);

  const tooClose = !!check?.nearest && check.nearest.meters < WAYPOST_SPACING;
  const placeOk = !(adding || moved) || (!!check && check.inside_coverage && (!tooClose || !!note.trim()));
  const ready = !!nameZh.trim() && hasChinese(nameZh) && !!nameEn.trim() && !!scene && (!adding || checked) && placeOk && !busy;

  const save = async () => {
    if (!ready || !scene) return;
    setBusy(true); setError(null);
    try {
      const fields = { lat: at.lat, lng: at.lng, name_zh: nameZh.trim(), name_en: nameEn.trim(), scene };
      onSaved(adding ? await adminEdit.addWaypost(region, fields, checked, note.trim() || null) : await adminEdit.updateWaypost(waypost.id, fields, note.trim() || null));
    } catch (e) { setError(errorText(a, e)); } finally { setBusy(false); }
  };

  return <Card style={{ gap: spacing.md }}>
    <View style={{ gap: 4 }}>
      <Pill tone="blue" label={adding ? a.ed.newWaypost : a.commonWaypost} />
      {!adding && <Text style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{language === "zh" ? waypost.name_zh : waypost.name_en}</Text>}
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{at.lat.toFixed(5)}, {at.lng.toFixed(5)}</Text>
    </View>
    {(adding || moved) && <CheckNotes check={check} note={note} />}
    {suggest && (suggest.zh || suggest.en) && (suggest.zh !== nameZh || suggest.en !== nameEn) &&
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
        <Text style={{ flex: 1, minWidth: 160, fontFamily: sans, fontSize: 13, color: C.ink }}>{a.ed.suggested(suggest.zh || suggest.en)}</Text>
        <AButton small tone="ghost" title={a.ed.useIt} onPress={() => { if (suggest.zh) setNameZh(suggest.zh); if (suggest.en) setNameEn(suggest.en); }} />
      </View>}
    <Field label={a.ed.nameZh} hint={a.ed.nameZhHint} value={nameZh} onChangeText={setNameZh} maxLength={40} />
    <Field label={a.ed.nameEn} value={nameEn} onChangeText={setNameEn} maxLength={60} autoCapitalize="words" />
    <ScenePicker value={scene} onChange={setScene} />
    {adding && <Check on={checked} onChange={setChecked} label={a.ed.checked} />}
    <Field label={tooClose && (adding || moved) ? a.ed.noteRequired : a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" }}>
      {!adding && !moving && <AButton small tone="ghost" title={a.ed.move} onPress={onMove} />}
      <AButton small tone="ghost" title={a.ed.cancel} onPress={onCancel} />
      <AButton small title={busy ? a.ed.saving : a.ed.save} disabled={!ready} onPress={save} />
    </View>
    {(adding || moved) && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.live}</Text>}
  </Card>;
}

/** Hide or show again: a Waypost (unless a live City Hunt would be left short) or a spawn spot. */
export function VisibilityCard({ region, waypost, spot, onSaved }: {
  region: string;
  waypost?: MapWaypost; spot?: MapSpot;
  onSaved: (w: { waypost?: MapWaypost; spot?: MapSpot }) => void;
}) {
  const a = useAdminText();
  const { language } = useLanguage();
  const hidden = waypost ? !waypost.game_enabled : !!spot?.hidden_at;
  const since = waypost?.hidden_at ?? spot?.hidden_at;
  const check = useCheck(region, waypost && !hidden ? waypost : null, waypost?.id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const short = check?.live_hunts.find((h) => h.wayposts_left < h.wayposts_needed);
  const flip = async () => {
    setBusy(true); setError(null);
    try {
      if (waypost) onSaved({ waypost: await adminEdit.setWaypostVisible(waypost.id, hidden, note.trim() || null) });
      else if (spot) onSaved({ spot: await adminEdit.setSpotVisible(spot.id, hidden, note.trim() || null) });
      setNote("");
    } catch (e) { setError(errorText(a, e)); } finally { setBusy(false); }
  };
  return <Card style={{ gap: spacing.sm }}>
    {spot && <>
      <View style={{ flexDirection: "row", gap: 6 }}><Pill tone="plum" label={a.ed.spotTitle} />{hidden && <Pill label={a.hidden} />}</View>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}{spot.habitat ? ` · ${a.habitat[spot.habitat]}` : ""}</Text>
      <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{a.ed.spotNote}</Text>
    </>}
    {hidden && since && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.hiddenSince(timeAgo(since, language))}</Text>}
    {waypost && !hidden && short && <Notice tone="stop" text={a.ed.huntBlock(language === "zh" ? short.name_zh : short.name_en, short.wayposts_left, short.wayposts_needed)} />}
    {waypost && !hidden && !short && check?.live_hunts.map((h) => <Notice key={h.id} text={a.ed.huntWarn(language === "zh" ? h.name_zh : h.name_en)} />)}
    <Field label={a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
      <AButton small tone={hidden ? "blue" : "wax"} title={busy ? a.ed.saving : hidden ? a.ed.show : a.ed.hide} disabled={busy || (!!waypost && !hidden && (!check || !!short))} onPress={flip} />
    </View>
  </Card>;
}

/** A thin ink-blue bar while editing, so it's always clear the map is in edit mode. */
export function EditBar({ onDone }: { onDone: () => void }) {
  const a = useAdminText();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: C.blue, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 8 }}>
    <Text style={{ flex: 1, fontFamily: sans, fontSize: 13, color: C.white }}>{a.ed.editing}</Text>
    <Pressable accessibilityRole="button" onPress={onDone} style={{ backgroundColor: C.white, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Text style={{ fontFamily: sans, fontSize: 13, color: C.blue }}>{a.ed.done}</Text>
    </Pressable>
  </View>;
}
