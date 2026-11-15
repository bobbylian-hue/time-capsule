import { describe, expect, it, vi } from "vitest";
// The rules under test are pure; these keep the module's native imports out of the test run.
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn() } }));
import { can, minutesLeft, megabytes } from "./admin";
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
