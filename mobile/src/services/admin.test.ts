import { describe, expect, it, vi } from "vitest";
// The rules under test are pure; these keep the module's native imports out of the test run.
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn() } }));
import { can, minutesLeft, megabytes, nextLengthStart, undoable } from "./admin";
import { sample } from "./adminSample";

describe("admin roles", () => {
  it("lets only owners manage members", () => {
    expect(can("owner", "members")).toBe(true);
    expect(can("admin", "members")).toBe(false);
  });
  it("keeps viewers to looking", () => {
    expect(can("viewer", "queue")).toBe(false);
    expect(can("viewer", "letters")).toBe(false);
    expect(can("moderator", "queue")).toBe(true);
    expect(can("moderator", "edit")).toBe(false);
    expect(can(null, "queue")).toBe(false);
  });
});

describe("admin sample", () => {
  it("always keeps one owner", async () => {
    const owner = (await sample.members()).find((m) => m.role === "owner")!;
    await expect(sample.setRole(owner.id, "viewer")).rejects.toThrow("last_owner");
    await expect(sample.removeMember(owner.id)).rejects.toThrow("last_owner");
  });
});

describe("admin numbers", () => {
  it("counts minutes left without going negative", () => {
    const now = Date.parse("2026-11-15T09:00:00Z");
    expect(minutesLeft("2026-11-15T09:04:10Z", now)).toBe(5);
    expect(minutesLeft("2026-11-15T08:59:00Z", now)).toBe(0);
  });
  it("shows map sizes in megabytes", () => {
    expect(megabytes(98_984_820)).toBe(99);
    expect(megabytes(null)).toBeNull();
  });
});

describe("admin editing (sample)", () => {
  const spot = { lat: 25.06, lng: 121.59, name_zh: "測試公園", name_en: "Test Park", scene: "park" as const };

  it("adds a Waypost inside the city border, one per level-17 cell (R1.5)", async () => {
    sample.viewAs("owner");
    await expect(sample.addWaypost("taipei", { ...spot, name_zh: "Park" }, true, null)).rejects.toThrow("bad_name");
    await expect(sample.addWaypost("taipei", { ...spot, lat: 25.3 }, true, null)).rejects.toThrow("outside_border");
    // South-west of the cut border, toward Yonghe: inside the map tiles, outside Taipei City.
    await expect(sample.addWaypost("taipei", { ...spot, lat: 25.0, lng: 121.515 }, false, null)).rejects.toThrow("outside_border");
    const added = await sample.addWaypost("taipei", { ...spot, photo: "data:image/jpeg;base64,AA", photo_credit: "© Roy" }, false, null);
    expect(added.source_ref).toBe(`admin:${added.id}`);
    expect(added.photo_credit).toBe("© Roy");
    const beside = { ...spot, lat: spot.lat + 0.00003 };
    const check = await sample.checkWaypost("taipei", beside.lat, beside.lng);
    expect(check.inside_border).toBe(true);
    expect(check.same_cell.map((c) => c.id)).toContain(added.id);
    expect(check.cell_taken).toBe(true);
    await expect(sample.addWaypost("taipei", beside, false, null)).rejects.toThrow("cell_taken");
    // Moving within its own cell is fine.
    await expect(sample.updateWaypost(added.id, { lat: beside.lat }, null)).resolves.toBeTruthy();
    // An empty photo clears it; null keeps it.
    expect((await sample.updateWaypost(added.id, { photo: null }, null)).photo).toBe("data:image/jpeg;base64,AA");
    expect((await sample.updateWaypost(added.id, { photo: "", photo_credit: "" }, null)).photo).toBeNull();
  });

  it("saves drafts, publishes, deletes and undoes several places at once (R1.5)", async () => {
    sample.viewAs("owner");
    const box = { south: 25.07, west: 121.60, north: 25.08, east: 121.61 };
    await expect(sample.areaSuggest("taipei", "waypost", { south: 25.0, west: 121.5, north: 25.1, east: 121.6 }, 250)).rejects.toThrow("area_too_big");
    const points = await sample.areaSuggest("taipei", "waypost", box, 250);
    expect(points.length).toBeGreaterThan(2);
    const { added } = await sample.addWayposts("taipei", points.slice(0, 3).map((p, i) => ({ ...p, name_zh: `測試${i}`, name_en: `Test ${i}`, scene: "park" as const })), null);
    expect(added.map((w) => w.status)).toEqual(["draft", "draft", "draft"]);
    expect(added.every((w) => !w.game_enabled)).toBe(true);
    // A draft holds its cell, so the same points are no longer suggested.
    const again = await sample.areaSuggest("taipei", "waypost", box, 250);
    expect(again.some((p) => added.some((w) => w.lat === p.lat && w.lng === p.lng))).toBe(false);
    const ids = added.map((w) => w.id);
    await sample.setStatus("waypost", ids, "live", null);
    let map = await sample.cityMap("taipei");
    expect(map.wayposts.filter((w) => ids.includes(w.id)).every((w) => w.status === "live" && w.game_enabled)).toBe(true);
    await sample.setStatus("waypost", [ids[0]], "deleted", null);
    map = await sample.cityMap("taipei");
    expect(map.wayposts.some((w) => w.id === ids[0])).toBe(false);
    const rows = await sample.activity();
    await sample.undo(rows[0].id, null);
    map = await sample.cityMap("taipei");
    expect(map.wayposts.find((w) => w.id === ids[0])?.status).toBe("live");
    // Undoing the batch add deletes all three.
    const batch = (await sample.activity()).find((r) => r.action === "waypost.add_batch")!;
    await expect(sample.undo(batch.id, null)).rejects.toThrow("stale");
  });

  it("adds and moves spawn spots inside the border, and Undo puts them back", async () => {
    sample.viewAs("owner");
    await expect(sample.addSpot("taipei", 25.3, 121.59, "park", null)).rejects.toThrow("outside_border");
    const spot1 = await sample.addSpot("taipei", 25.05, 121.55, "square", null);
    const moved = await sample.moveSpot(spot1.id, 25.051, 121.551, null);
    expect([moved.lat, moved.lng]).toEqual([25.051, 121.551]);
    await expect(sample.moveSpot(spot1.id, 25.3, 121.551, null)).rejects.toThrow("outside_border");
    const [move] = await sample.activity();
    expect(move.action).toBe("spot.move");
    await sample.undo(move.id, null);
    const back = (await sample.cityMap("taipei")).spots.find((x) => x.id === spot1.id)!;
    expect([back.lat, back.lng]).toEqual([25.05, 121.55]);
  });

  it("keeps Landmarks out of editing and lets only owners and admins write", async () => {
    await expect(sample.setWaypostVisible("lm-101", false, null)).rejects.toThrow("landmark");
    sample.viewAs("moderator");
    await expect(sample.setSpotVisible("taipei-spot-0", false, null)).rejects.toThrow("forbidden");
    sample.viewAs("owner");
  });

  it("refuses to leave a place without a vessel that can always appear", async () => {
    await sample.change({ call: "place_remove", region: "macau", vessel: "candy-box" }, null);
    await sample.change({ call: "place_remove", region: "macau", vessel: "musicbox" }, null);
    await expect(sample.change({ call: "place_remove", region: "macau", vessel: "pocket-watch" }, null)).rejects.toThrow("place_needs_vessel");
    await expect(sample.change({ call: "rule", vessel: "pocket-watch", rarity: "rare", habitat: null, hours: [18, 23], dates: null }, null)).rejects.toThrow("place_needs_vessel");
    await expect(sample.change({ call: "place_add", region: "macau", vessel: "bottle" }, null)).rejects.toThrow("not_spawnable");
  });

  it("previews a change without saving it", async () => {
    const before = (await sample.spawning()).rules.find((r) => r.vessel === "ramen")!;
    const p = await sample.preview({ call: "place_add", region: "singapore", vessel: "ramen" });
    expect(p.regions[0].region).toBe("singapore");
    expect(p.regions[0].after.ramen).toBeGreaterThan(0);
    expect(p.regions[0].before.ramen ?? 0).toBe(0);
    expect((await sample.spawning()).rules.find((r) => r.vessel === "ramen")).toEqual(before);
  });

  it("undoes only the newest change to a thing", async () => {
    const hidden = await sample.setSpotVisible("taipei-spot-1", false, "fenced off");
    expect(hidden.hidden_at).toBeTruthy();
    const first = (await sample.activity())[0].id;
    await sample.setSpotVisible("taipei-spot-1", true, null);
    await expect(sample.undo(first, null)).rejects.toThrow("stale");
    await sample.undo((await sample.activity())[0].id, null);
    expect((await sample.cityMap("taipei")).spots.find((x) => x.id === "taipei-spot-1")!.hidden_at).toBeTruthy();
    await expect(sample.undo(1, null)).rejects.toThrow("not_undoable");
  });

  it("starts a new wave length where both lengths end a wave", () => {
    const at = Date.UTC(2026, 10, 15, 14, 23);
    expect(nextLengthStart(10, 5, at).toISOString()).toBe("2026-11-15T14:30:00.000Z");
    expect(nextLengthStart(10, 15, at).toISOString()).toBe("2026-11-15T14:30:00.000Z");
    expect(nextLengthStart(10, 60, at).toISOString()).toBe("2026-11-15T15:00:00.000Z");
    expect(undoable("waypost.hide") && undoable("config.wave") && !undoable("member.add") && !undoable("spot.hide")).toBe(true);
  });
});
