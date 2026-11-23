// The map builder's popup (docs/design/map-builder.md, R1.5): a card over the map on desktop and a bottom sheet
// on phones, with Cancel and Save at its top right. The form inside reports whether it has unsaved changes and
// how to save; Cancel or ✕ with unsaved changes asks Save / Discard / Keep editing.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { PlaceStatus } from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdminText } from "./strings";
import { useMapBuilderText, type MapBuilderText } from "./mapBuilderStrings";
import { AButton, Notice, Pill } from "./ui";

export type SheetActions = {
  /** Something would be lost by closing. */
  dirty: boolean;
  canSave: boolean;
  busy: boolean;
  saveLabel?: string;
  /** Resolves true when saved (the form calls its own onSaved). */
  save: () => Promise<boolean>;
};
const SheetCtx = createContext<((a: SheetActions | null) => void) | null>(null);

/** A form inside the popup hands its Save to the popup's header. */
export function useSheetActions(a: SheetActions, on = true) {
  const set = useContext(SheetCtx);
  const latest = useRef(a);
  latest.current = a;
  useEffect(() => {
    set?.(on ? { dirty: a.dirty, canSave: a.canSave, busy: a.busy, saveLabel: a.saveLabel, save: () => latest.current.save() } : null);
  }, [set, on, a.dirty, a.canSave, a.busy, a.saveLabel]);
  useEffect(() => () => set?.(null), [set]);
  return !!set;
}

export const statusTone = (s: PlaceStatus) => s === "live" ? "blue" : s === "draft" ? "plum" : "ink";

/** Lets the screen ask before leaving the popup some other way (tapping another pin or the map). */
export type SheetGuard = React.MutableRefObject<((go: () => void) => void) | null>;

export function EditSheet({ wide, title, status, compact, guard, onClose, children }: {
  wide: boolean; title: string; status?: PlaceStatus | null; compact?: boolean; guard?: SheetGuard;
  onClose: () => void; children: React.ReactNode;
}) {
  const mb = useMapBuilderText();
  const [actions, setActions] = useState<SheetActions | null>(null);
  const [asking, setAsking] = useState(false);
  /** Where to go after Save or Discard in the prompt; closing when nothing is waiting. */
  const after = useRef<(() => void) | null>(null);
  const leave = (go: () => void) => { if (actions?.dirty) { after.current = go; setAsking(true); } else go(); };
  const close = () => leave(onClose);
  const save = async () => {
    if (!actions || !actions.canSave || actions.busy) return;
    const fromPrompt = asking; setAsking(false);
    const ok = await actions.save();
    if (ok && fromPrompt) { const go = after.current ?? onClose; after.current = null; go(); }
  };
  if (guard) guard.current = leave;
  useEffect(() => () => { if (guard) guard.current = null; }, [guard]);
  // Esc closes on a computer, asking first when something is unsaved.
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return <View style={wide
      ? { position: "absolute", left: spacing.md, top: spacing.md, width: 400, maxHeight: "92%" }
      : { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: compact ? undefined : "52%" }}>
    <View accessibilityRole={"dialog" as any} accessibilityLabel={title}
      style={{ flexShrink: 1, backgroundColor: C.paper, borderRadius: radii.md, borderBottomLeftRadius: wide ? radii.md : 0, borderBottomRightRadius: wide ? radii.md : 0,
        borderWidth: 1, borderColor: C.line, shadowColor: C.ink, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.white }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text accessibilityRole="header" style={{ fontFamily: serif, fontSize: 18, color: C.ink }}>{title}</Text>
          {status && <Pill tone={statusTone(status) as any} label={mb.status[status]} />}
        </View>
        {actions
          ? <>
              <AButton small tone="ghost" title={mb.cancel} onPress={close} />
              <AButton small title={actions.busy ? "…" : actions.saveLabel ?? mb.save} disabled={!actions.canSave || actions.busy} onPress={save} />
            </>
          : <Pressable accessibilityRole="button" accessibilityLabel={mb.close} onPress={onClose} hitSlop={8}
              style={({ hovered }: any) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: hovered ? "#E6EEF7" : "transparent" })}>
              <Text style={{ fontFamily: sans, fontSize: 18, color: C.muted }}>✕</Text>
            </Pressable>}
      </View>
      {asking && <View accessibilityRole="alert" style={{ padding: spacing.md, gap: spacing.sm, backgroundColor: "#FBF6EA", borderBottomWidth: 1, borderBottomColor: "#E8D8B4" }}>
        <Text style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>{mb.unsavedTitle} · {mb.unsavedBody}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" }}>
          <AButton small tone="ghost" title={mb.keepEditing} onPress={() => { after.current = null; setAsking(false); }} />
          <AButton small tone="wax" title={mb.discard} onPress={() => { const go = after.current ?? onClose; after.current = null; setAsking(false); go(); }} />
          <AButton small title={mb.save} disabled={!actions?.canSave || actions?.busy} onPress={save} />
        </View>
      </View>}
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <SheetCtx.Provider value={setActions}>{children}</SheetCtx.Provider>
      </ScrollView>
    </View>
  </View>;
}

/** Publish, Hide, Show and Delete for a saved place (R1.5). Delete asks first; every change can be undone in Activity. */
export function StatusActions({ status, name, onStatus }: { status: PlaceStatus; name: string; onStatus: (s: PlaceStatus) => Promise<void> }) {
  const mb = useMapBuilderText();
  const a = useAdminText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const go = async (s: PlaceStatus) => {
    setBusy(true); setError(null);
    try { await onStatus(s); setConfirm(false); } catch (e) { setError((e as Error)?.message || "failed"); } finally { setBusy(false); }
  };
  return <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: spacing.md }}>
    {confirm
      ? <View style={{ gap: spacing.sm }}>
          <Notice tone="stop" text={mb.delAsk(name)} />
          <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
            <AButton small tone="ghost" title={mb.cancel} onPress={() => setConfirm(false)} />
            <AButton small tone="wax" title={busy ? "…" : mb.del} disabled={busy} onPress={() => go("deleted")} />
          </View>
        </View>
      : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {status === "draft" && <AButton small title={busy ? "…" : mb.publish} disabled={busy} onPress={() => go("live")} />}
          {status === "live" && <AButton small tone="ghost" title={mb.hide} disabled={busy} onPress={() => go("hidden")} />}
          {status === "hidden" && <AButton small tone="ghost" title={mb.show} disabled={busy} onPress={() => go("live")} />}
          <View style={{ flex: 1 }} />
          <AButton small tone="ghost" title={mb.del} disabled={busy} onPress={() => setConfirm(true)} />
        </View>}
    {error && <Notice tone="stop" text={errorLabel(a, mb, error)} />}
  </View>;
}

export const errorLabel = (a: ReturnType<typeof useAdminText>, mb: MapBuilderText, code: string) => mb.error[code] ?? a.error[code] ?? a.error.failed;
