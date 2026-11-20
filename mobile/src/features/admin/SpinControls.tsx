// How many wax balls a common Waypost spin gives (DF3: 10). Owners and admins edit it next to the wave settings;
// the change applies from the next spin and is logged in Activity with Undo.
import React, { useState } from "react";
import { Text, View } from "react-native";
import { adminEdit, type WaveConfig } from "../../services/admin";
import { C, sans, spacing } from "../../theme";
import { useAdminText } from "./strings";
import { AButton, Field, Notice, Sheet, Stepper } from "./ui";

export const spinOf = (c: WaveConfig) => c.spin_wax_min == null || c.spin_wax_max == null ? null : [c.spin_wax_min, c.spin_wax_max] as const;

export function SpinButton({ config, onSaved }: { config: WaveConfig; onSaved: () => void }) {
  const a = useAdminText();
  const now = spinOf(config);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(now?.[0] ?? 10);
  const [max, setMax] = useState(now?.[1] ?? 10);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!now) return null;
  const same = min === now[0] && max === now[1];
  const save = async () => {
    setBusy(true); setError(null);
    try { await adminEdit.setSpinReward(min, max, note.trim() || null); setOpen(false); onSaved(); }
    catch (e) { setError(a.error[(e as Error)?.message] ?? a.error.failed); }
    finally { setBusy(false); }
  };
  return <>
    <AButton small tone="ghost" title={a.editSpin} onPress={() => { setMin(now[0]); setMax(now[1]); setNote(""); setError(null); setOpen(true); }} />
    {open && <Sheet title={a.spinTitle} onClose={() => setOpen(false)}
      footer={<View style={{ gap: spacing.sm }}>
        {!!error && <Notice tone="stop" text={error} />}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <AButton title={busy ? a.ed.saving : a.ed.save} disabled={busy || same} onPress={() => void save()} />
          <AButton tone="ghost" title={a.ed.cancel} onPress={() => setOpen(false)} />
        </View>
      </View>}>
      <Stepper label={a.spinMin} value={min} min={0} max={50} onChange={(n) => { setMin(n); if (n > max) setMax(n); }} />
      <Stepper label={a.spinMax} value={max} min={0} max={50} onChange={(n) => { setMax(n); if (n < min) setMin(n); }} />
      <Text style={{ fontFamily: sans, fontSize: 13, lineHeight: 19, color: C.muted }}>{a.spinNote}</Text>
      <Field label={a.note} value={note} onChangeText={setNote} />
    </Sheet>}
  </>;
}
