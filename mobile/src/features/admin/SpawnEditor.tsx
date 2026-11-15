// Editing which vessels turn up as Corrupted Capsules (docs/design/admin.md, phase 2). Every change opens one
// sheet that shows what the next day would look like before it is saved; the server works the preview out with
// the real spawn rules and refuses anything that would leave a place empty.
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../../i18n";
import { VESSELS } from "../shop/strings";
import {
  WAVE_LENGTHS, adminEdit, nextLengthStart, type Habitat, type Rarity, type Region, type SpawnChange, type SpawnPlace, type SpawnPreview,
  type SpawnRule, type Spawning, type WaveConfig,
} from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdminText, type AdminText } from "./strings";
import { AButton, Card, Choice, Field, Notice, Pill, Sheet, Stepper, VesselThumb, useColumns, type Tone } from "./ui";

const RARITY_TONE: Record<string, Tone> = { common: "blue", uncommon: "plum", rare: "brass" };
const RARITIES: Rarity[] = ["common", "uncommon", "rare"];
const HABITATS: Habitat[] = ["park", "water", "square"];
const vesselName = (v: string, lang: "zh" | "en") => (VESSELS as any)[v]?.name[lang] ?? v;
const errorText = (a: AdminText, e: unknown) => a.error[(e as Error)?.message] ?? a.error.failed;
const clock = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** The places vessels can be assigned to. Older servers send only cities; then each city is its own place. */
export function placesOf(data: Spawning, cities: Region[]): SpawnPlace[] {
  return data.places ?? cities.map((c) => ({ id: c.id, parent: null, name_zh: c.name_zh, name_en: c.name_en, country_zh: c.country_zh, country_en: c.country_en, has_spots: true }));
}
const direct = (r: SpawnRule) => r.places ?? r.regions;

/** One change with its preview, a note and Save. `children` is the form for changes that have one. */
export function ChangeSheet({ title, change, cities, children, invalid, onClose, onSaved }: {
  title: string; change: SpawnChange; cities: Region[]; children?: React.ReactNode; invalid?: boolean; onClose: () => void; onSaved: () => void;
}) {
  const a = useAdminText();
  const { language } = useLanguage();
  const [result, setResult] = useState<{ key: string; preview: SpawnPreview } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(change);
  const preview = result?.key === key ? result.preview : null;
  useEffect(() => {
    let live = true;
    setResult(null); setError(null);
    const timer = setTimeout(() => adminEdit.preview(change).then((p) => live && setResult({ key, preview: p }), (e) => live && setError(errorText(a, e))), 300);
    return () => { live = false; clearTimeout(timer); };
  }, [key]);
  const save = async () => {
    if (busy || invalid || !preview) return;
    setBusy(true); setError(null);
    try { await adminEdit.change(change, note.trim() || null); onSaved(); } catch (e) { setError(errorText(a, e)); } finally { setBusy(false); }
  };
  return <Sheet title={title} onClose={onClose} footer={<View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
    <AButton small tone="ghost" title={a.ed.cancel} onPress={onClose} />
    <AButton small title={busy ? a.ed.saving : a.ed.save} disabled={busy || invalid || !preview} onPress={save} />
  </View>}>
    {children}
    <View style={{ gap: spacing.sm }}>
      <Text style={{ fontFamily: serif, fontSize: 15, color: C.ink }}>{a.ed.preview}</Text>
      {!preview ? !error && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.ed.previewLoading}</Text>
        : !preview.regions.length ? <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.ed.previewNoSpots}</Text>
        : preview.regions.map((r) => {
          const city = cities.find((c) => c.id === r.region);
          const vessels = [...new Set([...Object.keys(r.before), ...Object.keys(r.after)])].sort((x, y) => (r.after[y] ?? 0) - (r.after[x] ?? 0));
          return <View key={r.region} style={{ backgroundColor: C.white, borderRadius: radii.sm, borderWidth: 1, borderColor: C.line, padding: spacing.sm, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1, fontFamily: sans, fontSize: 13, color: C.ink }}>{city ? (language === "zh" ? city.name_zh : city.name_en) : r.region}</Text>
              <Text style={{ width: 56, textAlign: "right", fontFamily: sans, fontSize: 11, color: C.muted }}>{a.ed.previewNow}</Text>
              <Text style={{ width: 104, textAlign: "right", fontFamily: sans, fontSize: 11, color: C.muted }}>{a.ed.previewAfter}</Text>
            </View>
            {vessels.map((v) => {
              const b = r.before[v] ?? 0, n = r.after[v] ?? 0;
              return <View key={v} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <VesselThumb kind={v} size={30} faded={!n} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: sans, fontSize: 13, color: C.ink }}>{vesselName(v, language)}</Text>
                <Text style={{ width: 48, textAlign: "right", fontFamily: serif, fontSize: 15, color: C.muted }}>{b}</Text>
                <Text numberOfLines={1} style={{ width: 104, textAlign: "right", fontFamily: serif, fontSize: 15, color: n > b ? C.blue : n < b ? C.wax : C.ink }}>
                  {n}{n !== b ? ` (${n > b ? "+" : "−"}${Math.abs(n - b)})` : ""}
                </Text>
              </View>;
            })}
          </View>;
        })}
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.previewNote} {a.ed.fromNextWave}</Text>
    </View>
    <Field label={a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
  </Sheet>;
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{label}</Text>
    {children}
  </View>;
}

/** A vessel's rules. They apply everywhere it appears. */
export function RuleSheet({ rule, cities, onClose, onSaved }: { rule: SpawnRule; cities: Region[]; onClose: () => void; onSaved: () => void }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const [rarity, setRarity] = useState<Rarity>(rule.rarity ?? "common");
  const [habitat, setHabitat] = useState<Habitat | "any">(rule.habitat ?? "any");
  const [hours, setHours] = useState<[number, number] | null>(rule.hours);
  const [dates, setDates] = useState<[string, string] | null>(rule.dates);
  const datesOk = !dates || dates.every((d) => /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d));
  const change: SpawnChange = { call: "rule", vessel: rule.vessel, rarity, habitat: habitat === "any" ? null : habitat,
    // The whole day is the same as no window.
    hours: hours && !(hours[0] === 0 && hours[1] === 23) ? hours : null, dates: datesOk ? dates : rule.dates };
  const hour = (h: number) => `${h}:00`;
  return <ChangeSheet title={a.ed.rules(vesselName(rule.vessel, language))} change={change} cities={cities} invalid={!datesOk} onClose={onClose} onSaved={onSaved}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <VesselThumb kind={rule.vessel} size={56} />
      <Text style={{ flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.muted }}>{a.ed.rulesEverywhere}</Text>
    </View>
    <Labelled label={a.ed.rarityLabel}><Choice value={rarity} onChange={setRarity} options={RARITIES.map((r) => ({ value: r, label: a.rarity[r] }))} /></Labelled>
    <Labelled label={a.ed.habitatLabel}>
      <Choice value={habitat} onChange={setHabitat} options={[{ value: "any" as const, label: a.ed.any }, ...HABITATS.map((h) => ({ value: h, label: a.habitat[h] }))]} />
    </Labelled>
    <Labelled label={a.ed.hoursLabel}>
      <Choice value={hours ? "set" : "any"} onChange={(v) => setHours(v === "set" ? rule.hours ?? [18, 23] : null)} options={[{ value: "any", label: a.allDay }, { value: "set", label: `${a.ed.from}…${a.ed.to}` }]} />
      {hours && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignItems: "center" }}>
        <Stepper label={a.ed.from} value={hours[0]} min={0} max={23} format={hour} onChange={(v) => setHours([v, hours[1]])} />
        <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>–</Text>
        <Stepper label={a.ed.to} value={hours[1]} min={0} max={23} format={(h) => `${h}:59`} onChange={(v) => setHours([hours[0], v])} />
      </View>}
    </Labelled>
    <Labelled label={a.ed.datesLabel}>
      <Choice value={dates ? "set" : "any"} onChange={(v) => setDates(v === "set" ? rule.dates ?? ["01-01", "01-31"] : null)} options={[{ value: "any", label: a.allYear }, { value: "set", label: `${a.ed.from}…${a.ed.to}` }]} />
      {dates && <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}><Field label={a.ed.from} hint="MM-DD" value={dates[0]} onChangeText={(v) => setDates([v, dates[1]])} maxLength={5} /></View>
        <View style={{ flex: 1 }}><Field label={a.ed.to} hint="MM-DD" value={dates[1]} onChangeText={(v) => setDates([dates[0], v])} maxLength={5} /></View>
      </View>}
      {!datesOk && <Notice tone="warn" text={a.error.bad_rule} />}
    </Labelled>
  </ChangeSheet>;
}

/** Chance, rarity weights and how many appear near a player. */
export function WaveSheet({ config, cities, onClose, onSaved }: { config: WaveConfig; cities: Region[]; onClose: () => void; onSaved: () => void }) {
  const a = useAdminText();
  const [chance, setChance] = useState(Math.round(config.spawn_chance * 100));
  const [weights, setWeights] = useState(config.weights);
  const [nearby, setNearby] = useState(config.nearby_max);
  const change: SpawnChange = { call: "wave", spawn_chance: chance / 100, weights, nearby_max: nearby };
  return <ChangeSheet title={a.ed.waveSettingsTitle} change={change} cities={cities} onClose={onClose} onSaved={onSaved}>
    <Labelled label={a.ed.chanceLabel}><Stepper label={a.ed.chanceLabel} value={chance} min={10} max={100} step={5} format={(v) => `${v}%`} onChange={setChance} /></Labelled>
    <Labelled label={a.ed.weightsLabel}>
      <View style={{ gap: spacing.sm }}>
        {RARITIES.map((r) => <View key={r} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pill tone={RARITY_TONE[r]} label={a.rarity[r]} />
          <Stepper label={a.rarity[r]} value={weights[r]} min={0} max={100} step={5} onChange={(v) => setWeights({ ...weights, [r]: v })} />
        </View>)}
      </View>
    </Labelled>
    <Labelled label={a.ed.nearbyLabel}><Stepper label={a.ed.nearbyLabel} value={nearby} min={1} max={12} onChange={setNearby} /></Labelled>
  </ChangeSheet>;
}

/** The wave length. It switches at a moment that ends a wave under both lengths, so no wave is cut short. */
export function LengthSheet({ config, onClose, onSaved }: { config: WaveConfig; onClose: () => void; onSaved: () => void }) {
  const a = useAdminText();
  const [minutes, setMinutes] = useState(config.next_length?.minutes ?? config.wave_minutes);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const same = minutes === config.wave_minutes && !config.next_length;
  const save = async () => {
    setBusy(true); setError(null);
    try { await adminEdit.setWaveLength(minutes, note.trim() || null); onSaved(); } catch (e) { setError(errorText(a, e)); } finally { setBusy(false); }
  };
  return <Sheet title={a.ed.lengthTitle} onClose={onClose} footer={<View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
    <AButton small tone="ghost" title={a.ed.cancel} onPress={onClose} />
    <AButton small title={busy ? a.ed.saving : a.ed.save} disabled={busy || same} onPress={save} />
  </View>}>
    <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.waveEvery(config.wave_minutes)}</Text>
    <Choice value={minutes} onChange={setMinutes} options={WAVE_LENGTHS.map((m) => ({ value: m, label: a.ed.minutes(m) }))} />
    {minutes === config.wave_minutes
      ? <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.ed.sameLength}</Text>
      : <Notice text={a.ed.lengthStarts(clock(nextLengthStart(config.wave_minutes, minutes)))} />}
    <Text style={{ fontFamily: sans, fontSize: 12, lineHeight: 18, color: C.muted }}>{a.ed.lengthNote}</Text>
    <Field label={a.ed.noteOptional} value={note} onChangeText={setNote} maxLength={300} />
    {error && <Notice tone="stop" text={error} />}
  </Sheet>;
}

/** The wave settings row with its two edit buttons. */
export function WaveEditButtons({ data, cities, onSaved }: { data: Spawning; cities: Region[]; onSaved: () => void }) {
  const a = useAdminText();
  const [open, setOpen] = useState<"wave" | "length" | null>(null);
  const done = () => { setOpen(null); onSaved(); };
  return <>
    <AButton small tone="ghost" title={a.ed.editSettings} onPress={() => setOpen("wave")} />
    <AButton small tone="ghost" title={a.ed.editLength} onPress={() => setOpen("length")} />
    {open === "wave" && <WaveSheet config={data.config} cities={cities} onClose={() => setOpen(null)} onSaved={done} />}
    {open === "length" && <LengthSheet config={data.config} onClose={() => setOpen(null)} onSaved={done} />}
  </>;
}

/** By place, in edit mode: each place's own vessels with a remove ×, what it gets from its country, and Add vessel. */
export function PlaceEditor({ data, cities, onSaved }: { data: Spawning; cities: Region[]; onSaved: () => void }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const zh = language === "zh";
  const columns = useColumns();
  const places = placesOf(data, cities);
  const [picking, setPicking] = useState<SpawnPlace | null>(null);
  const [change, setChange] = useState<{ change: SpawnChange; title: string } | null>(null);
  const [rule, setRule] = useState<SpawnRule | null>(null);
  const name = (p: SpawnPlace) => zh ? p.name_zh : p.name_en;
  const done = () => { setChange(null); setRule(null); onSaved(); };
  const order = Object.keys(VESSELS);

  return <>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
      {places.map((place) => {
        const parent = places.find((p) => p.id === place.parent);
        const own = data.rules.filter((r) => direct(r).includes(place.id));
        const inherited = parent ? data.rules.filter((r) => direct(r).includes(parent.id)) : [];
        const isCountry = places.some((p) => p.parent === place.id);
        return <View key={place.id} style={{ width: columns === 1 ? "100%" : `calc(${100 / columns}% - ${(spacing.md * (columns - 1)) / columns}px)` as any }}>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{zh ? place.country_zh : place.country_en}</Text>
                <Text style={{ fontFamily: serif, fontSize: 22, color: C.ink }}>{name(place)}</Text>
              </View>
              <AButton small title={a.ed.addVessel} onPress={() => setPicking(place)} />
            </View>
            {isCountry && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.ed.countryNote(name(place))}</Text>}
            <View style={{ gap: spacing.sm }}>
              {[...own.map((r) => [r, true] as const), ...inherited.map((r) => [r, false] as const)].map(([r, mine]) =>
                <View key={`${r.vessel}:${mine}`} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: C.paper, borderRadius: 12, padding: spacing.sm, opacity: mine ? 1 : 0.8 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={a.ed.rules(vesselName(r.vessel, language))} onPress={() => setRule(r)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <VesselThumb kind={r.vessel} size={48} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text numberOfLines={1} style={{ fontFamily: serif, fontSize: 15, color: C.ink }}>{vesselName(r.vessel, language)}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {r.rarity && <Pill tone={RARITY_TONE[r.rarity]} label={a.rarity[r.rarity]} />}
                        {r.habitat && <Pill label={a.habitat[r.habitat]} />}
                        {r.hours && <Pill label={a.hours(r.hours[0], r.hours[1])} />}
                        {r.dates && <Pill label={a.dates(r.dates[0], r.dates[1])} />}
                        {!mine && parent && <Pill label={a.ed.fromCountry(name(parent))} />}
                      </View>
                    </View>
                  </Pressable>
                  {mine && <Pressable accessibilityRole="button" accessibilityLabel={a.ed.removeFrom(vesselName(r.vessel, language), name(place))} hitSlop={8}
                    onPress={() => setChange({ change: { call: "place_remove", region: place.id, vessel: r.vessel }, title: a.ed.removeFrom(vesselName(r.vessel, language), name(place)) })}
                    style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: "#E9C6D0", backgroundColor: C.white, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: sans, fontSize: 16, lineHeight: 18, color: C.wax }}>×</Text>
                  </Pressable>}
                </View>)}
            </View>
          </Card>
        </View>;
      })}
    </View>
    {picking && <Sheet title={a.ed.pickVessel(name(picking))} onClose={() => setPicking(null)}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {[...data.rules].filter((r) => !r.never && !direct(r).includes(picking.id) && !(picking.parent && direct(r).includes(picking.parent)))
          .sort((x, y) => order.indexOf(x.vessel) - order.indexOf(y.vessel)).map((r) =>
            <Pressable key={r.vessel} accessibilityRole="button" accessibilityLabel={vesselName(r.vessel, language)}
              onPress={() => { const place = picking; setPicking(null); setChange({ change: { call: "place_add", region: place.id, vessel: r.vessel }, title: a.ed.addTo(vesselName(r.vessel, language), name(place)) }); }}
              style={({ hovered }: any) => ({ width: 96, alignItems: "center", gap: 4, padding: 6, borderRadius: radii.sm, borderWidth: 1, borderColor: hovered ? C.lightBlue : C.line, backgroundColor: C.white })}>
              <VesselThumb kind={r.vessel} size={52} />
              <Text numberOfLines={2} style={{ fontFamily: sans, fontSize: 11, color: C.ink, textAlign: "center" }}>{vesselName(r.vessel, language)}</Text>
            </Pressable>)}
      </View>
    </Sheet>}
    {change && <ChangeSheet title={change.title} change={change.change} cities={cities} onClose={() => setChange(null)} onSaved={done} />}
    {rule && <RuleSheet rule={rule} cities={cities} onClose={() => setRule(null)} onSaved={done} />}
  </>;
}
