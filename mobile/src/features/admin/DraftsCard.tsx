// The city's drafts in the map builder's side panel (Roy, 2026-11-23). Drafts are grouped by who saved them and in
// which Fill an area save, so with several people working nobody publishes a batch they haven't seen: View frames it
// on the map, then Publish or Delete it. Places added one at a time are one group per person.
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Avatar } from "../../components/Avatar";
import { useLanguage } from "../../i18n";
import { statusOf, type CityMap } from "../../services/admin";
import { builder, type DraftGroup } from "../../services/mapBuilder";
import { C, sans, spacing } from "../../theme";
import { errorLabel } from "./EditSheet";
import { useMapBuilderText } from "./mapBuilderStrings";
import { useAdminText } from "./strings";
import { AButton, Card, Notice, timeAgo } from "./ui";

type Point = { lat: number; lng: number };

export function DraftsCard({ map, count, onView, onChanged }: {
  map: CityMap; count: number; onView: (points: Point[]) => void; onChanged: () => void;
}) {
  const mb = useMapBuilderText();
  const [groups, setGroups] = useState<DraftGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    builder.drafts(map.region.id, { wayposts: map.wayposts, spots: map.spots })
      .then((g) => { if (live) { setGroups(g); setError(null); } })
      .catch((e) => { if (live) setError((e as Error)?.message || "failed"); });
    return () => { live = false; };
  }, [map]);
  // Only what is still a draft on the map now (someone may have published part of a batch).
  const posts = new Map(map.wayposts.filter((w) => statusOf(w) === "draft").map((w) => [w.id, w]));
  const spots = new Map(map.spots.filter((x) => statusOf(x) === "draft").map((x) => [x.id, x]));
  const shown = (groups ?? []).map((g) => ({ ...g, wayposts: g.wayposts.filter((id) => posts.has(id)), spots: g.spots.filter((id) => spots.has(id)) }))
    .filter((g) => g.wayposts.length || g.spots.length);
  return <Card style={{ gap: spacing.sm, borderColor: "#D9C4CD", backgroundColor: "#FAF4F6" }}>
    <View style={{ gap: 2 }}>
      <Text accessibilityRole="header" style={{ fontFamily: sans, fontSize: 15, color: C.ink }}>{mb.draftsTitle} · {count}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, lineHeight: 17, color: C.muted }}>{mb.draftsNote}</Text>
    </View>
    {error && <Notice tone="stop" text={mb.error[error] ?? error} />}
    {shown.map((g) => <Group key={(g.batch ?? `one:${g.actor?.id ?? ""}`)} group={g}
      points={[...g.wayposts.map((id) => posts.get(id)!), ...g.spots.map((id) => spots.get(id)!)]}
      onView={onView} onChanged={onChanged} />)}
  </Card>;
}

function Group({ group, points, onView, onChanged }: {
  group: DraftGroup; points: Point[]; onView: (points: Point[]) => void; onChanged: () => void;
}) {
  const mb = useMapBuilderText();
  const a = useAdminText();
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const what = mb.count(group.wayposts.length, group.spots.length);
  const set = async (status: "live" | "deleted") => {
    setBusy(true); setError(null);
    try {
      if (group.wayposts.length) await builder.setStatus("waypost", group.wayposts, status, null);
      if (group.spots.length) await builder.setStatus("spot", group.spots, status, null);
      setAsking(false); onChanged();
    } catch (e) { setError((e as Error)?.message || "failed"); onChanged(); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: "#E8D6DD", paddingTop: spacing.sm }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {group.actor && <Avatar avatar={group.actor.avatar as any} size={28} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 14, color: C.ink }}>
          {group.actor?.name ?? mb.draftsSomeone}{group.at ? ` · ${timeAgo(group.at, language)}` : ""}
        </Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>{what}{group.actor && !group.batch ? ` · ${mb.draftsOneByOne}` : ""}</Text>
      </View>
    </View>
    {asking
      ? <View style={{ gap: spacing.sm }}>
          <Notice tone="stop" text={mb.draftsDelAsk(what)} />
          <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" }}>
            <AButton small tone="ghost" title={mb.cancel} onPress={() => setAsking(false)} />
            <AButton small tone="wax" title={busy ? "…" : mb.del} disabled={busy} onPress={() => set("deleted")} />
          </View>
        </View>
      : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <AButton small tone="ghost" title={mb.draftsView} onPress={() => onView(points)} />
          <AButton small title={busy ? "…" : mb.publish} disabled={busy} onPress={() => set("live")} />
          <View style={{ flex: 1 }} />
          <AButton small tone="ghost" title={mb.del} disabled={busy} onPress={() => setAsking(true)} />
        </View>}
    {error && <Notice tone="stop" text={errorLabel(a, mb, error)} />}
  </View>;
}
