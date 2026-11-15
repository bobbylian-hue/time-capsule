// One review queue for everything waiting on a person (docs/design/admin.md). Phase 1: reported private
// hunts and public capsules. Later kinds (imports, flagged words) plug into the same list.
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Avatar } from "../../components/Avatar";
import { useLanguage } from "../../i18n";
import { admin, can, type QueueItem } from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdmin } from "./AdminShell";
import { useAdminText } from "./strings";
import { AButton, Card, Empty, Failed, Loading, Page, Pill, Segmented, timeAgo, useLoad, useWide } from "./ui";

export default function QueueScreen() {
  const a = useAdminText();
  const { role, refresh } = useAdmin();
  const [tab, setTab] = useState<"open" | "done">("open");
  const list = useLoad(() => admin.queue(tab), [tab, role]);
  return <Page title={a.nav.queue} note={a.queueNote}
    right={<Segmented value={tab} onChange={setTab} options={[{ value: "open", label: a.tabOpen }, { value: "done", label: a.tabDone }]} />}>
    {!can(role, "queue") && tab === "open" && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{a.cantAct}</Text>}
    {list.error ? <Failed onRetry={list.reload} />
      : !list.data ? <Loading />
      : !list.data.length ? <Empty text={tab === "open" ? a.emptyOpen : a.emptyDone} />
      : <View style={{ gap: spacing.md }}>
          {list.data.map((item) => <Item key={`${item.kind}:${item.id}`} item={item} onDone={() => { list.reload(); refresh(); }} />)}
        </View>}
  </Page>;
}

function Item({ item, onDone }: { item: QueueItem; onDone: () => void }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const { role } = useAdmin();
  const wide = useWide();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decide = async (decision: "restore" | "remove") => {
    setBusy(true); setError(null);
    try { await admin.resolve(item.kind, item.id, decision, note.trim() || null); onDone(); }
    catch (e: any) { setError(a.error[e?.message] ?? a.error.failed); setBusy(false); }
  };
  const open = item.status === "open";
  return <Card style={{ gap: spacing.md }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm }}>
      <Pill tone={item.kind === "hunt_report" ? "brass" : "plum"} label={a.kind[item.kind]} />
      <Pill tone="wax" label={a.reports(item.reports)} />
      {item.reasons.map((r) => <Pill key={r} label={a.reason[r] ?? r} />)}
      <Text style={{ marginLeft: "auto", fontFamily: sans, fontSize: 12, color: C.muted }}>{timeAgo(item.first_at, language)}</Text>
    </View>
    <View style={{ flexDirection: wide ? "row" : "column", gap: spacing.md }}>
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Text style={{ fontFamily: serif, fontSize: 19, color: C.ink }}>{item.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Avatar avatar={item.owner.avatar} size={22} />
          <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.by(item.owner.name)}</Text>
        </View>
        {item.preview != null
          ? <View style={{ backgroundColor: "#FBF8F1", borderRadius: radii.sm, borderLeftWidth: 3, borderLeftColor: C.brass, padding: spacing.md }}>
              <Text style={{ fontFamily: serif, fontSize: 15, lineHeight: 24, color: C.ink }}>{item.preview}</Text>
            </View>
          : <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted, fontStyle: "italic" }}>{a.contentHidden}</Text>}
      </View>
      <View style={{ width: wide ? 220 : "100%", gap: spacing.sm }}>
        <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.reportedBy}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {item.reporters.map((p) => <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.paper, borderRadius: radii.pill, paddingRight: 8 }}>
            <Avatar avatar={p.avatar} size={22} />
            <Text style={{ fontFamily: sans, fontSize: 12, color: C.ink }}>{p.name}</Text>
          </View>)}
        </View>
        <Text style={{ fontFamily: sans, fontSize: 12, color: item.hidden ? C.wax : C.blue }}>{item.hidden ? a.hiddenNow : a.visibleNow}</Text>
      </View>
    </View>
    {open && can(role, "queue") && <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: spacing.md }}>
      <TextInput value={note} onChangeText={setNote} placeholder={a.note} placeholderTextColor={C.muted} maxLength={300}
        style={{ fontFamily: sans, fontSize: 14, color: C.ink, borderWidth: 1, borderColor: C.line, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.paper }} />
      <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
        <AButton title={a.restore} tone="ghost" disabled={busy} onPress={() => decide("restore")} />
        <AButton title={a.remove} tone="wax" disabled={busy} onPress={() => decide("remove")} />
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ fontFamily: sans, fontSize: 13, color: C.wax, textAlign: "right" }}>{error}</Text>}
    </View>}
    {!open && <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: spacing.md, flexWrap: "wrap" }}>
      <Pill tone={item.decision === "remove" ? "wax" : "blue"} label={item.decision === "remove" ? a.removed : a.restored} />
      {item.decided_by && <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.decidedBy(item.decided_by.name)}{item.decided_at ? ` · ${timeAgo(item.decided_at, language)}` : ""}</Text>}
      {!!item.note && <Text style={{ fontFamily: sans, fontSize: 13, color: C.ink, flexBasis: "100%" }}>“{item.note}”</Text>}
    </View>}
  </Card>;
}
