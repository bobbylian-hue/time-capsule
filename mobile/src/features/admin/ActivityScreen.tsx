// The action log (docs/design/admin.md): every admin change, who made it and when, with before and after.
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar } from "../../components/Avatar";
import { useLanguage } from "../../i18n";
import { admin, type ActivityRow } from "../../services/admin";
import { C, radii, sans, spacing } from "../../theme";
import { useAdmin } from "./AdminShell";
import { useAdminText } from "./strings";
import { Card, Empty, Failed, Loading, Page, timeAgo, useLoad } from "./ui";

export default function ActivityScreen() {
  const a = useAdminText();
  const { role } = useAdmin();
  const list = useLoad(() => admin.activity(), [role]);
  const [who, setWho] = useState<string | null>(null);
  const people = useMemo(() => [...new Map((list.data ?? []).map((r) => [r.actor.id, r.actor])).values()], [list.data]);
  const rows = (list.data ?? []).filter((r) => !who || r.actor.id === who);
  return <Page title={a.nav.activity} note={a.activityNote}>
    {people.length > 1 && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      <Filter label={a.everyone} on={!who} onPress={() => setWho(null)} />
      {people.map((p) => <Filter key={p.id} label={p.name} avatar={p.avatar} on={who === p.id} onPress={() => setWho(p.id)} />)}
    </View>}
    {list.error ? <Failed onRetry={list.reload} />
      : !list.data ? <Loading />
      : !rows.length ? <Empty text={a.noActivity} />
      : <Card style={{ padding: 0, gap: 0 }}>{rows.map((r, i) => <Row key={r.id} row={r} first={i === 0} />)}</Card>}
  </Page>;
}

function Filter({ label, avatar, on, onPress }: { label: string; avatar?: Record<string, unknown> | null; on: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
    style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? "#E6EEF7" : C.white, paddingLeft: avatar ? 3 : 12, paddingRight: 12, paddingVertical: 3 }}>
    {avatar !== undefined && <Avatar avatar={avatar} size={22} />}
    <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.blue : C.ink }}>{label}</Text>
  </Pressable>;
}

function Row({ row, first }: { row: ActivityRow; first: boolean }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const say = a.action[row.action];
  const sentence = say ? say(row.actor.name, row.target_label) : a.actionFallback(row.actor.name, row.action, row.target_label);
  const roleWord = (v: unknown) => v && typeof v === "object" && "role" in (v as any) ? a.role[(v as any).role as keyof typeof a.role] : null;
  const change = row.action === "member.role" ? `${roleWord(row.before)} → ${roleWord(row.after)}` : row.action === "member.add" ? roleWord(row.after) : null;
  return <View style={{ padding: spacing.md, gap: spacing.sm, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
    <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "flex-start" }}>
      <Avatar avatar={row.actor.avatar} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: sans, fontSize: 14, lineHeight: 20, color: C.ink }}>{sentence}{change ? <Text style={{ color: C.blue }}>  {change}</Text> : null}</Text>
        {!!row.note && <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>“{row.note}”</Text>}
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{timeAgo(row.at, language)}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((x) => !x)}>
            <Text style={{ fontFamily: sans, fontSize: 12, color: C.blue }}>{a.details} {open ? "▴" : "▾"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
    {open && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginLeft: 52 }}>
      {([["before", row.before], ["after", row.after]] as const).map(([k, v]) => <View key={k} style={{ flexGrow: 1, flexBasis: 220, backgroundColor: C.paper, borderRadius: radii.sm, padding: spacing.sm, gap: 4 }}>
        <Text style={{ fontFamily: sans, fontSize: 11, color: C.muted }}>{a[k]}</Text>
        <Text style={{ fontFamily: "monospace", fontSize: 12, color: C.ink }}>{v == null ? "—" : JSON.stringify(v, null, 2)}</Text>
      </View>)}
      <Text style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, flexBasis: "100%" }}>{row.target_type}:{row.target_id}</Text>
    </View>}
  </View>;
}
