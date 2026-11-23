// Small pieces every admin page shares, in the app's own look: paper, serif numbers, ink-blue controls,
// brass only for private hunts and precious vessels, Landmarks in the map's navy, wax red for what removes something.
import React, { useCallback, useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type TextInputProps, type ViewStyle } from "react-native";
import { vesselParts } from "../../art/manifest";
import type { VesselKind } from "../../components/Vessel";
import { SealLoader } from "../../components/SealLoader";
import { C, radii, sans, serif, shadows, spacing } from "../../theme";
import { useAdminText } from "./strings";

/** From this width the admin gets a sidebar, side panels and more columns. */
export const WIDE = 900;
export const useWide = () => useWindowDimensions().width >= WIDE;
/** How many cards fit in a row at this width. */
export function useColumns() {
  const { width } = useWindowDimensions();
  return width >= 1360 ? 3 : width >= 700 ? 2 : 1;
}

/** Loads once, again when `deps` change, and on `reload()`. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    load().then((d) => { if (live) setData(d); }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, reload };
}

export function Page({ title, note, right, children, scroll = true }: {
  title: string; note?: string; right?: React.ReactNode; children: React.ReactNode; scroll?: boolean;
}) {
  const wide = useWide();
  const head = <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" }}>
    <View style={{ flexShrink: 1, gap: 4 }}>
      <Text accessibilityRole="header" style={{ fontFamily: serif, fontSize: wide ? 30 : 26, color: C.ink }}>{title}</Text>
      {!!note && <Text style={{ fontFamily: sans, fontSize: 14, lineHeight: 20, color: C.muted }}>{note}</Text>}
    </View>
    {right}
  </View>;
  const pad = { paddingHorizontal: wide ? spacing.xl : spacing.md, paddingTop: wide ? spacing.xl : spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg };
  if (!scroll) return <View style={[{ flex: 1 }, pad]}>{head}{children}</View>;
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={[{ width: "100%", maxWidth: 1280, alignSelf: "center" }, pad]}>
    {head}{children}
  </ScrollView>;
}

export function Card({ children, style, onPress, label }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  const base: ViewStyle = { backgroundColor: C.white, borderRadius: radii.md, borderWidth: 1, borderColor: C.line, padding: spacing.md, gap: spacing.md, ...shadows.card, shadowOpacity: 0.06 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ hovered, pressed }: any) => [base, style, hovered && { borderColor: C.lightBlue }, pressed && { opacity: 0.85 }]}>
    {children}
  </Pressable>;
}

export function Stat({ label, value, tone = C.ink, small }: { label: string; value: string | number; tone?: string; small?: string }) {
  return <View style={{ minWidth: 96, flexGrow: 1, flexBasis: 96, gap: 2 }}>
    <Text style={{ fontFamily: serif, fontSize: 24, color: tone }}>{value}{!!small && <Text style={{ fontSize: 13, color: C.muted }}> {small}</Text>}</Text>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{label}</Text>
  </View>;
}

const TONES = {
  blue: { fg: C.blue, bg: "#E6EEF7" },
  brass: { fg: "#8A6A2E", bg: "#F6EEDC" },
  ink: { fg: C.ink, bg: C.glass },
  wax: { fg: C.wax, bg: "#F6E4E9" },
  plum: { fg: C.plum, bg: "#F1E6EA" },
  muted: { fg: C.muted, bg: "#EEF1F5" },
} as const;
export type Tone = keyof typeof TONES;
export function Pill({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  const t = TONES[tone];
  return <View style={{ backgroundColor: t.bg, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: t.fg }}>{label}</Text>
  </View>;
}

export function AButton({ title, onPress, tone = "blue", disabled, small }: {
  title: string; onPress: () => void; tone?: "blue" | "wax" | "ghost"; disabled?: boolean; small?: boolean;
}) {
  const solid = tone !== "ghost";
  const color = tone === "wax" ? C.wax : C.blue;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ hovered, pressed }: any) => ({
      backgroundColor: solid ? color : hovered ? "#E6EEF7" : "transparent",
      borderWidth: 1, borderColor: solid ? color : C.line,
      borderRadius: radii.pill, paddingHorizontal: small ? 14 : 18, paddingVertical: small ? 6 : 9,
      opacity: disabled ? 0.45 : pressed ? 0.8 : hovered && solid ? 0.92 : 1, alignItems: "center",
    })}>
    <Text style={{ fontFamily: sans, fontSize: small ? 13 : 14, color: solid ? C.white : C.blue }}>{title}</Text>
  </Pressable>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: "#E9EEF4", borderRadius: radii.pill, padding: 3, alignSelf: "flex-start" }}>
    {options.map((o) => {
      const on = o.value === value;
      return <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
        style={{ backgroundColor: on ? C.white : "transparent", borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6, ...(on ? shadows.card : {}), shadowOpacity: on ? 0.08 : 0 }}>
        <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.ink : C.muted }}>{o.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** A vessel's assembled picture, standing on its base. */
export function VesselThumb({ kind, size = 56, faded }: { kind: string; size?: number; faded?: boolean }) {
  const parts = vesselParts[kind as VesselKind] ?? vesselParts.bottle;
  return <Image source={parts.assembled} accessibilityIgnoresInvertColors style={{ width: size, height: size, opacity: faded ? 0.4 : 1 }} resizeMode="contain" />;
}

export function Loading() {
  const a = useAdminText();
  return <View style={{ flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center" }}><SealLoader label={a.loading} /></View>;
}
export function Failed({ onRetry }: { onRetry: () => void }) {
  const a = useAdminText();
  return <View style={{ minHeight: 200, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
    <Text style={{ fontFamily: sans, fontSize: 15, color: C.ink }}>{a.failed}</Text>
    <AButton title={a.retry} tone="ghost" onPress={onRetry} />
  </View>;
}
export function Empty({ text }: { text: string }) {
  return <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
    <Text style={{ fontFamily: serif, fontSize: 16, color: C.muted }}>{text}</Text>
  </View>;
}
/** A thin title over a group, with the flourish rule the app uses for section headers. */
export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return <View style={{ gap: spacing.md }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Text style={{ fontFamily: serif, fontSize: 17, color: C.ink }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      {right}
    </View>
    {children}
  </View>;
}

export const shortDate = (iso: string, lang: "zh" | "en") => {
  const d = new Date(iso);
  return lang === "zh" ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
export const timeAgo = (iso: string, lang: "zh" | "en", now = Date.now()) => {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 60) return lang === "zh" ? `${m} 分鐘前` : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return lang === "zh" ? `${h} 小時前` : `${h} h ago`;
  return shortDate(iso, lang);
};

/** A labelled text box in the admin's paper style. */
export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return <View style={{ gap: 4 }}>
    <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{label}{hint ? <Text style={{ color: C.muted }}> · {hint}</Text> : null}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={C.muted} {...input}
      style={[{ fontFamily: sans, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.line, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.paper }, style as any]} />
  </View>;
}

/** A short message in a tinted box: info (blue), warn (brass) or stop (wax). */
export function Notice({ tone = "info", text }: { tone?: "info" | "warn" | "stop"; text: string }) {
  const t = tone === "stop" ? { fg: C.wax, bg: "#FBF0F3", line: "#E9C6D0" } : tone === "warn" ? { fg: "#7A5A1E", bg: "#FBF6EA", line: "#E8D8B4" } : { fg: C.blue, bg: "#EEF3F9", line: "#D3E0EE" };
  return <View accessibilityRole={tone === "info" ? undefined : "alert"} style={{ backgroundColor: t.bg, borderWidth: 1, borderColor: t.line, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9 }}>
    <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: t.fg }}>{text}</Text>
  </View>;
}

/** A tick box with its sentence. */
export function Check({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => onChange(!on)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
    <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: on ? C.blue : C.muted, backgroundColor: on ? C.blue : C.white, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
      {on && <Text style={{ color: C.white, fontSize: 13, lineHeight: 15, fontFamily: sans }}>✓</Text>}
    </View>
    <Text style={{ flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.ink }}>{label}</Text>
  </Pressable>;
}

/** Pills to pick one value. */
export function Choice<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {options.map((o) => {
      const on = o.value === value;
      return <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
        style={{ borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blue : C.white, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.white : C.ink }}>{o.label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** Pick one from a long or growing list: the choice in a field, the list opening below it. */
export function Dropdown<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? "";
  return <View style={{ gap: 4, alignSelf: "stretch", maxWidth: 320 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${current}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={({ hovered }: any) => ({ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: open ? C.blue : C.line,
        borderRadius: radii.sm, backgroundColor: hovered && !open ? "#F9FBFD" : C.white, paddingHorizontal: 12, paddingVertical: 9 })}>
      <Text style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{current}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{open ? "▲" : "▼"}</Text>
    </Pressable>
    {open && <View accessibilityRole="radiogroup" accessibilityLabel={label}
      style={{ borderWidth: 1, borderColor: C.line, borderRadius: radii.sm, backgroundColor: C.white, paddingVertical: 4, ...shadows.card }}>
      {options.map((o) => {
        const on = o.value === value;
        return <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { onChange(o.value); setOpen(false); }}
          style={({ hovered }: any) => ({ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: on ? "#E6EEF7" : hovered ? "#F4F7FA" : "transparent" })}>
          <Text style={{ fontFamily: sans, fontSize: 14, color: on ? C.blue : C.ink }}>{o.label}</Text>
          {on && <Text style={{ fontFamily: sans, fontSize: 14, color: C.blue }}>✓</Text>}
        </Pressable>;
      })}
    </View>}
  </View>;
}

/** A small − value + control for whole numbers. */
export function Stepper({ value, onChange, min, max, step = 1, format = String, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string; label: string;
}) {
  const btn = (d: number, glyph: string) => <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${glyph}`} disabled={value + d < min || value + d > max}
    onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
    style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: "center", justifyContent: "center", opacity: value + d < min || value + d > max ? 0.4 : 1 }}>
    <Text style={{ fontFamily: sans, fontSize: 16, color: C.blue }}>{glyph}</Text>
  </Pressable>;
  return <View accessibilityLabel={label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
    {btn(-step, "−")}
    <Text style={{ minWidth: 44, textAlign: "center", fontFamily: serif, fontSize: 17, color: C.ink }}>{format(value)}</Text>
    {btn(step, "+")}
  </View>;
}

/** A panel over the page: centred on wide screens, rising from the bottom on phones. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const wide = useWide();
  const { height } = useWindowDimensions();
  return <Modal visible transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
    <Pressable accessibilityLabel="close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(22,38,63,.35)", justifyContent: wide ? "center" : "flex-end", alignItems: "center", padding: wide ? spacing.lg : 0 }}>
      <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 560, maxHeight: wide ? height * 0.86 : height * 0.92, backgroundColor: C.paper,
        borderRadius: radii.lg, borderBottomLeftRadius: wide ? radii.lg : 0, borderBottomRightRadius: wide ? radii.lg : 0, overflow: "hidden", ...shadows.card }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.white }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: serif, fontSize: 18, color: C.ink }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={onClose} hitSlop={10}><Text style={{ fontFamily: sans, fontSize: 22, color: C.muted }}>×</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>{children}</ScrollView>
        {footer && <View style={{ padding: spacing.md, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.white }}>{footer}</View>}
      </Pressable>
    </Pressable>
  </Modal>;
}
