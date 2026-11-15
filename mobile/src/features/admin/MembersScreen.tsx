// Who can open the admin, and as what (docs/design/admin.md). Owners only; the server refuses everyone else
// and always keeps one owner.
import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Avatar } from "../../components/Avatar";
import { useLanguage } from "../../i18n";
import { useAuth } from "../../services/auth";
import { ROLES, admin, can, type AdminRole, type Member } from "../../services/admin";
import { C, radii, sans, serif, spacing } from "../../theme";
import { useAdmin } from "./AdminShell";
import { useAdminText } from "./strings";
import { AButton, Card, Failed, Loading, Page, Pill, shortDate, useLoad, useWide } from "./ui";

export default function MembersScreen() {
  const a = useAdminText();
  const { role } = useAdmin();
  const list = useLoad(admin.members, [role]);
  if (!can(role, "members")) return <Page title={a.nav.members}><Text style={{ fontFamily: sans, fontSize: 14, color: C.muted }}>{a.error.forbidden}</Text></Page>;
  return <Page title={a.nav.members} note={a.membersNote}>
    <AddMember onAdded={list.reload} />
    {list.error ? <Failed onRetry={list.reload} />
      : !list.data ? <Loading />
      : <Card style={{ padding: 0, gap: 0 }}>
          {list.data.map((m, i) => <Row key={m.id} member={m} first={i === 0} onChanged={list.reload} />)}
        </Card>}
    <RoleKey />
  </Page>;
}

function RolePicker({ value, onChange, disabled }: { value: AdminRole; onChange: (r: AdminRole) => void; disabled?: boolean }) {
  const a = useAdminText();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {ROLES.map((r) => {
      const on = r === value;
      return <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={() => onChange(r)}
        style={{ borderRadius: radii.pill, borderWidth: 1, borderColor: on ? C.blue : C.line, backgroundColor: on ? C.blue : C.white, paddingHorizontal: 12, paddingVertical: 5, opacity: disabled && !on ? 0.5 : 1 }}>
        <Text style={{ fontFamily: sans, fontSize: 13, color: on ? C.white : C.ink }}>{a.role[r]}</Text>
      </Pressable>;
    })}
  </View>;
}

function AddMember({ onAdded }: { onAdded: () => void }) {
  const a = useAdminText();
  const wide = useWide();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("moderator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setBusy(true); setError(null);
    try { await admin.addMember(email.trim(), role); setEmail(""); onAdded(); }
    catch (e: any) { setError(a.error[e?.message] ?? a.error.failed); }
    setBusy(false);
  };
  return <Card>
    <Text style={{ fontFamily: serif, fontSize: 17, color: C.ink }}>{a.addMember}</Text>
    <View style={{ flexDirection: wide ? "row" : "column", gap: spacing.md, alignItems: wide ? "center" : "stretch" }}>
      <TextInput value={email} onChangeText={setEmail} placeholder={a.emailPlaceholder} placeholderTextColor={C.muted}
        accessibilityLabel={a.email} autoCapitalize="none" keyboardType="email-address" inputMode="email" onSubmitEditing={add}
        style={{ flex: wide ? 1 : undefined, fontFamily: sans, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.line, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.paper }} />
      <RolePicker value={role} onChange={setRole} />
      <AButton title={a.add} onPress={add} disabled={busy || !email.includes("@")} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ fontFamily: sans, fontSize: 13, color: C.wax }}>{error}</Text>}
  </Card>;
}

function Row({ member, first, onChanged }: { member: Member; first: boolean; onChanged: () => void }) {
  const a = useAdminText();
  const { language } = useLanguage();
  const { session } = useAuth();
  const { refresh } = useAdmin();
  const wide = useWide();
  const [error, setError] = useState<string | null>(null);
  const me = member.id === session?.user.id;
  const run = async (job: () => Promise<void>) => {
    setError(null);
    try { await job(); onChanged(); if (me) refresh(); } catch (e: any) { setError(a.error[e?.message] ?? a.error.failed); }
  };
  const remove = () => {
    const ok = Platform.OS === "web" ? window.confirm(a.confirmRemove(member.name)) : true;
    if (ok) void run(() => admin.removeMember(member.id));
  };
  return <View style={{ padding: spacing.md, gap: spacing.sm, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
    <View style={{ flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "stretch", gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
        <Avatar avatar={member.avatar} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: sans, fontSize: 15, color: C.ink }}>{member.name}</Text>
            {me && <Pill tone="brass" label={a.you} />}
          </View>
          <Text style={{ fontFamily: sans, fontSize: 13, color: C.muted }}>{member.email}</Text>
          <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>
            {member.added_by ? a.addedBy(member.added_by, shortDate(member.added_at, language)) : a.addedFirst(shortDate(member.added_at, language))}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" }}>
        <RolePicker value={member.role} onChange={(r) => r !== member.role && run(() => admin.setRole(member.id, r))} />
        <AButton small tone="ghost" title={a.removeMember} onPress={remove} />
      </View>
    </View>
    {!!error && <Text accessibilityRole="alert" style={{ fontFamily: sans, fontSize: 13, color: C.wax }}>{error}</Text>}
  </View>;
}

function RoleKey() {
  const a = useAdminText();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
    {ROLES.map((r) => <View key={r} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Pill tone={r === "owner" ? "brass" : "blue"} label={a.role[r]} />
      <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{a.roleNote[r]}</Text>
    </View>)}
  </View>;
}
