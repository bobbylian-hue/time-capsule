// A Landmark's Look, Reward and Fight in the map builder (docs/design/map-builder.md, Part 2, release R2). Every
// section starts filled in, so a new Landmark is playable the moment it is saved. The look previews on the map as
// it changes; real buildings are chosen by tapping them on the map.
import React, { useEffect, useRef } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LANDMARK_STAMPS, stamps } from "../../art/manifest";
import { useLanguage } from "../../i18n";
import type { LandmarkSettings } from "../../services/admin";
import { LANDMARK_MODELS } from "../../services/mapBuilder";
import { C, radii, sans, serif, spacing } from "../../theme";
import { VESSELS } from "../shop/strings";
import { COLOR_HEX, MODEL_KINDS, MONUMENT_COLORS, NAMED_MODELS, type ModelKind, type Monument, type MonumentColor } from "../journey/live/monuments";
import { useLandmarkText } from "./landmarkStrings";
import { AButton, Choice, Stepper, VesselThumb } from "./ui";

/** The Landmark reward vessels the catalogue has (earned ones), the default keepsake first. */
export const LANDMARK_VESSELS = ["landmark-keepsake", "bamboo-tower", "senado-fountain", "red-bird", "lionfish-fountain", "clock-tower",
  "gate-lantern", "torii-scroll", "palace-pavilion", "golden-roof", "gate-lacquer", "twin-towers"];
/** The map page tells the form which building was tapped; the screen forwards it here. */
export type BuildingTap = React.MutableRefObject<((id: number, height: number) => void) | null>;

const toyTop = (real: number) => Math.max(6, Math.min(40, Math.round(real * 0.45)));
const clean = (m: Monument): Monument | null => (m.buildings || m.model || m.custom) ? m : null;

export function LandmarkFields({ value, onChange, picking, onPicking, buildingTap }: {
  value: LandmarkSettings; onChange: (v: LandmarkSettings) => void;
  picking: boolean; onPicking: (on: boolean) => void; buildingTap: BuildingTap;
}) {
  const t = useLandmarkText();
  const { language } = useLanguage();
  const m: Monument = value.monument ?? {};
  const setLook = (next: Monument) => onChange({ ...value, monument: clean(next) });
  // Real heights of the buildings tapped in this session, so the tallest is known when one is removed.
  const heights = useRef(new Map<number, number>());
  const latest = useRef({ value, m }); latest.current = { value, m };
  useEffect(() => {
    buildingTap.current = (id, height) => {
      const { value: v, m: look } = latest.current;
      heights.current.set(id, height);
      const b = look.buildings;
      const ids = b?.ids.includes(id) ? b.ids.filter((x) => x !== id) : [...(b?.ids ?? []), id];
      const known = ids.map((x) => heights.current.get(x)).filter((h): h is number => h != null);
      const real = known.length === ids.length ? Math.max(...known, 1) : Math.max(b?.real_top ?? 1, ...known);
      const next: Monument = { ...look, buildings: ids.length ? { ids, real_top: real, top: b?.top ?? toyTop(real), color: b?.color ?? "landmark" } : null };
      onChange({ ...v, monument: clean(next) });
    };
    return () => { buildingTap.current = null; };
  }, [onChange]);

  return <View style={{ gap: spacing.lg }}>
    <Section title={t.look}>
      <Sub title={t.buildings}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm }}>
          <AButton small tone={picking ? "blue" : "ghost"} title={picking ? t.donePicking : t.pickBuildings} onPress={() => onPicking(!picking)} />
          <Text style={{ fontFamily: sans, fontSize: 12, color: picking ? C.blue : C.muted }}>{picking ? t.picking : t.buildingCount(m.buildings?.ids.length ?? 0)}</Text>
          {!!m.buildings && <AButton small tone="ghost" title={t.clear} onPress={() => setLook({ ...m, buildings: null })} />}
        </View>
        {m.buildings && <>
          <Row label={t.height}><Stepper label={t.height} value={m.buildings.top} min={4} max={60} step={2} format={(v) => `${v} m`}
            onChange={(top) => setLook({ ...m, buildings: { ...m.buildings!, top } })} /></Row>
          <Colours value={m.buildings.color} onChange={(color) => setLook({ ...m, buildings: { ...m.buildings!, color } })} />
        </>}
      </Sub>
      <Sub title={t.model}>
        <Choice<ModelKind | "none"> value={m.model?.kind ?? "none"}
          options={[{ value: "none", label: t.none }, ...[...MODEL_KINDS, ...(LANDMARK_MODELS ? NAMED_MODELS : [])].map((k) => ({ value: k, label: t.models[k] }))]}
          onChange={(k) => setLook({ ...m, model: k === "none" ? null : { kind: k, size: m.model?.size ?? "m", rotate: m.model?.rotate ?? 0, color: m.model?.color ?? "landmark" } })} />
        {m.model && <>
          <Row label={t.size}><Choice value={m.model.size} options={(["s", "m", "l"] as const).map((s) => ({ value: s, label: t.sizes[s] }))}
            onChange={(size) => setLook({ ...m, model: { ...m.model!, size } })} /></Row>
          <Row label={t.rotate}><Stepper label={t.rotate} value={m.model.rotate} min={0} max={345} step={15} format={(v) => `${v}°`}
            onChange={(rotate) => setLook({ ...m, model: { ...m.model!, rotate } })} /></Row>
          <Colours value={m.model.color} onChange={(color) => setLook({ ...m, model: { ...m.model!, color } })} />
        </>}
      </Sub>
      {m.custom && <Sub title={t.custom}>
        <Colours value={m.custom.color} onChange={(color) => setLook({ ...m, custom: { ...m.custom!, color } })} />
        <View style={{ alignItems: "flex-start" }}><AButton small tone="ghost" title={t.remove} onPress={() => setLook({ ...m, custom: null })} /></View>
      </Sub>}
    </Section>

    <Section title={t.reward}>
      <Sub title={t.vessel}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {LANDMARK_VESSELS.map((v) => <Tile key={v} on={value.vessel === v} label={(VESSELS as any)[v]?.name[language] ?? v} onPress={() => onChange({ ...value, vessel: v })}>
            <VesselThumb kind={v} size={44} />
          </Tile>)}
        </View>
        <Text style={{ fontFamily: sans, fontSize: 13, color: C.ink }}>{(VESSELS as any)[value.vessel]?.name[language] ?? value.vessel}</Text>
      </Sub>
      <Sub title={t.stamp}>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {LANDMARK_STAMPS.map((s) => <Tile key={s} on={value.stamp === s} label={t.stampNames[s] ?? s} onPress={() => onChange({ ...value, stamp: s })}>
            <Image source={stamps[s]} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </Tile>)}
        </View>
        <Text style={{ fontFamily: sans, fontSize: 13, color: C.ink }}>{t.stampNames[value.stamp] ?? value.stamp}</Text>
      </Sub>
    </Section>

    <Section title={t.fight}>
      <Row label={t.health}><Stepper label={t.health} value={value.fight_health} min={10} max={200} step={5} onChange={(fight_health) => onChange({ ...value, fight_health })} /></Row>
      <Row label={t.seconds}><Stepper label={t.seconds} value={value.fight_seconds} min={60} max={600} step={15} onChange={(fight_seconds) => onChange({ ...value, fight_seconds })} /></Row>
    </Section>
  </View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: spacing.md }}>
    <Text accessibilityRole="header" style={{ fontFamily: serif, fontSize: 17, color: C.ink }}>{title}</Text>
    {children}
  </View>;
}
function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: 8, paddingVertical: 4 }}>
    <Text style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{title}</Text>
    {children}
  </View>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md }}>
    <Text style={{ minWidth: 64, fontFamily: sans, fontSize: 13, color: C.muted }}>{label}</Text>
    {children}
  </View>;
}
function Tile({ on, label, onPress, children }: { on: boolean; label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress}
    style={({ hovered }: any) => ({ width: 56, height: 56, borderRadius: radii.sm, borderWidth: on ? 2 : 1, borderColor: on ? C.blue : C.line,
      backgroundColor: on ? "#E6EEF7" : hovered ? C.white : "transparent", alignItems: "center", justifyContent: "center" })}>
    {children}
  </Pressable>;
}
/** The six monument colours as swatches; the Landmark blues show their gradient. */
function Colours({ value, onChange }: { value: MonumentColor; onChange: (c: MonumentColor) => void }) {
  const t = useLandmarkText();
  return <View style={{ gap: 6 }}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t.color} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {MONUMENT_COLORS.map((c) => {
        const on = value === c;
        return <Pressable key={c} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t.colors[c]} onPress={() => onChange(c)}
          style={{ width: 30, height: 30, borderRadius: 15, padding: 2, borderWidth: 2, borderColor: on ? C.ink : "transparent" }}>
          <View style={{ flex: 1, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#0002" }}>
            {c === "landmark"
              ? [C.glass, C.lightBlue, C.blue, C.ink].map((x) => <View key={x} style={{ flex: 1, backgroundColor: x }} />)
              : <View style={{ flex: 1, backgroundColor: COLOR_HEX[c] }} />}
          </View>
        </Pressable>;
      })}
    </View>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{t.color} · {t.colors[value]}</Text>
  </View>;
}
